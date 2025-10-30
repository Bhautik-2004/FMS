-- Fix analytics function errors
-- This migration fixes type mismatches and syntax errors in analytics functions

-- Drop and recreate calculate_spending_trends with correct types
DROP FUNCTION IF EXISTS calculate_spending_trends(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION calculate_spending_trends(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  period TEXT,
  total_spent DECIMAL(15,2),
  total_income DECIMAL(15,2),
  net_savings DECIMAL(15,2),
  transaction_count BIGINT,  -- Changed from INTEGER to BIGINT
  avg_daily_spending DECIMAL(15,2),
  trend_direction TEXT,
  trend_percentage DECIMAL(10,2),
  top_category TEXT,
  top_category_amount DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      TO_CHAR(ms.month, 'YYYY-MM') AS period,
      ms.total_expenses AS total_spent,
      ms.total_income,
      ms.net_savings,
      ms.total_transactions AS transaction_count,
      ROUND((ms.total_expenses / EXTRACT(DAY FROM 
        (DATE_TRUNC('month', ms.month) + INTERVAL '1 month' - INTERVAL '1 day')
      ))::NUMERIC, 2) AS avg_daily_spending,
      LAG(ms.total_expenses) OVER (ORDER BY ms.month) AS prev_month_spent
    FROM monthly_summary ms
    WHERE ms.user_id = p_user_id
      AND ms.month BETWEEN p_start_date AND p_end_date
    ORDER BY ms.month
  ),
  top_categories AS (
    SELECT DISTINCT ON (cs.month)
      TO_CHAR(cs.month, 'YYYY-MM') AS period,
      cs.category_name,
      cs.total_amount
    FROM category_spending cs
    WHERE cs.user_id = p_user_id
      AND cs.month BETWEEN p_start_date AND p_end_date
      AND cs.category_type = 'expense'
    ORDER BY cs.month, cs.total_amount DESC
  )
  SELECT 
    md.period,
    md.total_spent,
    md.total_income,
    md.net_savings,
    md.transaction_count,
    md.avg_daily_spending,
    CASE 
      WHEN md.prev_month_spent IS NULL THEN 'neutral'
      WHEN md.total_spent > md.prev_month_spent THEN 'increasing'
      WHEN md.total_spent < md.prev_month_spent THEN 'decreasing'
      ELSE 'stable'
    END AS trend_direction,
    CASE 
      WHEN md.prev_month_spent > 0 
      THEN ROUND(((md.total_spent - md.prev_month_spent) / md.prev_month_spent * 100)::NUMERIC, 2)
      ELSE NULL
    END AS trend_percentage,
    tc.category_name AS top_category,
    tc.total_amount AS top_category_amount
  FROM monthly_data md
  LEFT JOIN top_categories tc ON md.period = tc.period
  ORDER BY md.period;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_spending_trends(UUID, DATE, DATE) IS 'Calculates spending trends and patterns over a date range';


-- Drop and recreate calculate_financial_health_score with fixed array syntax
DROP FUNCTION IF EXISTS calculate_financial_health_score(UUID);

CREATE OR REPLACE FUNCTION calculate_financial_health_score(
  p_user_id UUID
)
RETURNS TABLE(
  overall_score INTEGER,
  savings_score INTEGER,
  spending_score INTEGER,
  budget_score INTEGER,
  consistency_score INTEGER,
  trend_score INTEGER,
  grade TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations TEXT[]
) AS $$
DECLARE
  v_savings_rate DECIMAL;
  v_spending_consistency DECIMAL;
  v_budget_adherence DECIMAL;
  v_trend DECIMAL;
  v_total_score INTEGER;
BEGIN
  -- Get last 3 months data
  WITH recent_months AS (
    SELECT * FROM monthly_summary
    WHERE user_id = p_user_id
      AND month >= CURRENT_DATE - INTERVAL '3 months'
    ORDER BY month DESC
    LIMIT 3
  )
  SELECT 
    AVG(savings_rate),
    STDDEV(total_expenses),
    AVG(savings_rate)
  INTO v_savings_rate, v_spending_consistency, v_trend
  FROM recent_months;
  
  -- Calculate savings score (0-30 points)
  -- Based on savings rate
  v_savings_rate := COALESCE(v_savings_rate, 0);
  
  -- Calculate individual scores
  RETURN QUERY
  WITH scores AS (
    SELECT 
      -- Savings Score (0-30)
      LEAST(30, GREATEST(0, 
        CASE 
          WHEN v_savings_rate >= 20 THEN 30
          WHEN v_savings_rate >= 15 THEN 25
          WHEN v_savings_rate >= 10 THEN 20
          WHEN v_savings_rate >= 5 THEN 15
          WHEN v_savings_rate >= 0 THEN 10
          ELSE 5
        END
      ))::INTEGER AS savings_score,
      
      -- Spending Score (0-25)
      -- Lower variance = better score
      LEAST(25, GREATEST(0,
        CASE 
          WHEN COALESCE(v_spending_consistency, 0) < 100 THEN 25
          WHEN COALESCE(v_spending_consistency, 0) < 300 THEN 20
          WHEN COALESCE(v_spending_consistency, 0) < 500 THEN 15
          WHEN COALESCE(v_spending_consistency, 0) < 1000 THEN 10
          ELSE 5
        END
      ))::INTEGER AS spending_score,
      
      -- Budget Score (0-25)
      (
        SELECT 
          LEAST(25, GREATEST(0,
            CASE 
              WHEN AVG(spent_percentage) <= 80 THEN 25
              WHEN AVG(spent_percentage) <= 90 THEN 20
              WHEN AVG(spent_percentage) <= 100 THEN 15
              WHEN AVG(spent_percentage) <= 110 THEN 10
              ELSE 5
            END
          ))
        FROM budget_summary
        WHERE user_id = p_user_id
          AND is_active = true
      )::INTEGER AS budget_score,
      
      -- Consistency Score (0-10)
      (
        SELECT 
          LEAST(10, GREATEST(0,
            CASE 
              WHEN COUNT(DISTINCT DATE_TRUNC('month', date)) >= 3 THEN 10
              WHEN COUNT(DISTINCT DATE_TRUNC('month', date)) >= 2 THEN 7
              ELSE 5
            END
          ))
        FROM transactions
        WHERE user_id = p_user_id
          AND date >= CURRENT_DATE - INTERVAL '3 months'
      )::INTEGER AS consistency_score,
      
      -- Trend Score (0-10)
      LEAST(10, GREATEST(0,
        CASE 
          WHEN v_trend > 15 THEN 10
          WHEN v_trend > 10 THEN 8
          WHEN v_trend > 5 THEN 6
          WHEN v_trend > 0 THEN 4
          ELSE 2
        END
      ))::INTEGER AS trend_score
  ),
  calculated AS (
    SELECT 
      s.*,
      s.savings_score + s.spending_score + 
      COALESCE(s.budget_score, 0) + s.consistency_score + 
      s.trend_score AS total_score
    FROM scores s
  )
  SELECT 
    c.total_score AS overall_score,
    c.savings_score,
    c.spending_score,
    COALESCE(c.budget_score, 0) AS budget_score,
    c.consistency_score,
    c.trend_score,
    CASE 
      WHEN c.total_score >= 90 THEN 'A+'
      WHEN c.total_score >= 80 THEN 'A'
      WHEN c.total_score >= 70 THEN 'B'
      WHEN c.total_score >= 60 THEN 'C'
      WHEN c.total_score >= 50 THEN 'D'
      ELSE 'F'
    END AS grade,
    -- Strengths array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.savings_score >= 25 THEN 'Excellent savings rate' END,
      CASE WHEN c.spending_score >= 20 THEN 'Consistent spending habits' END,
      CASE WHEN c.budget_score >= 20 THEN 'Great budget adherence' END,
      CASE WHEN c.trend_score >= 8 THEN 'Positive financial trend' END
    ], NULL) AS strengths,
    -- Weaknesses array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.savings_score < 15 THEN 'Low savings rate' END,
      CASE WHEN c.spending_score < 15 THEN 'Inconsistent spending' END,
      CASE WHEN c.budget_score < 15 THEN 'Budget overspending' END,
      CASE WHEN c.trend_score < 5 THEN 'Declining financial trend' END
    ], NULL) AS weaknesses,
    -- Recommendations array
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.savings_score < 15 THEN 'Increase your savings rate to at least 10%' END,
      CASE WHEN c.spending_score < 15 THEN 'Work on maintaining consistent monthly spending' END,
      CASE WHEN c.budget_score < 15 THEN 'Review and adjust your budget allocations' END,
      CASE WHEN c.consistency_score < 8 THEN 'Track expenses more regularly' END
    ], NULL) AS recommendations
  FROM calculated c;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_financial_health_score(UUID) IS 'Calculates comprehensive financial health score with breakdown and recommendations';


-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_spending_trends(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_financial_health_score(UUID) TO authenticated;
