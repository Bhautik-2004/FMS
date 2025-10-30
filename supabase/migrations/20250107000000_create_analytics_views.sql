-- =============================================
-- Analytics Materialized Views and Functions
-- =============================================
-- Creates views and functions for financial analytics,
-- trends analysis, and spending insights

-- =============================================
-- DROP EXISTING OBJECTS (IF ANY)
-- =============================================

-- Drop existing views/materialized views if they exist
DROP VIEW IF EXISTS merchant_analytics CASCADE;
DROP VIEW IF EXISTS category_spending CASCADE;
DROP VIEW IF EXISTS monthly_summary CASCADE;

DROP MATERIALIZED VIEW IF EXISTS merchant_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS category_spending CASCADE;
DROP MATERIALIZED VIEW IF EXISTS monthly_summary CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS refresh_analytics_views() CASCADE;
DROP FUNCTION IF EXISTS calculate_spending_trends(UUID, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_category_comparison(UUID, DATE, DATE, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS detect_spending_anomalies(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_financial_health_score(UUID) CASCADE;

-- =============================================
-- 1. MONTHLY SUMMARY VIEW
-- =============================================
-- Aggregates monthly income, expenses, and savings data

CREATE MATERIALIZED VIEW monthly_summary AS
SELECT 
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE AS month,
  
  -- Income totals
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
  
  -- Expense totals
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expenses,
  
  -- Net savings (income - expenses)
  COALESCE(
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END),
    0
  ) AS net_savings,
  
  -- Savings rate percentage
  CASE 
    WHEN SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) > 0
    THEN ROUND(
      ((SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)) /
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) * 100)::NUMERIC,
      2
    )
    ELSE 0
  END AS savings_rate,
  
  -- Account balances at end of month (JSONB)
  (
    SELECT JSONB_OBJECT_AGG(a.name, a.current_balance)
    FROM accounts a
    WHERE a.user_id = t.user_id
  ) AS account_balances,
  
  -- Transaction counts
  COUNT(CASE WHEN t.type = 'income' THEN 1 END) AS income_transaction_count,
  COUNT(CASE WHEN t.type = 'expense' THEN 1 END) AS expense_transaction_count,
  
  -- Averages
  COALESCE(AVG(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS avg_income_transaction,
  COALESCE(AVG(CASE WHEN t.type = 'expense' THEN t.amount END), 0) AS avg_expense_transaction,
  
  -- Period info
  MIN(t.date) AS period_start,
  MAX(t.date) AS period_end,
  COUNT(*) AS total_transactions

FROM transactions t
WHERE t.date IS NOT NULL
GROUP BY t.user_id, DATE_TRUNC('month', t.date)::DATE;

-- Create indexes for performance
CREATE INDEX idx_monthly_summary_user_month ON monthly_summary(user_id, month DESC);
CREATE INDEX idx_monthly_summary_month ON monthly_summary(month DESC);

-- Add comments
COMMENT ON MATERIALIZED VIEW monthly_summary IS 'Monthly financial summary with income, expenses, savings, and account balances';


-- =============================================
-- 2. CATEGORY SPENDING VIEW
-- =============================================
-- Analyzes spending patterns by category and month

CREATE MATERIALIZED VIEW category_spending AS
WITH monthly_totals AS (
  SELECT 
    user_id,
    type,
    DATE_TRUNC('month', date)::DATE AS month,
    SUM(amount) AS monthly_total
  FROM transactions
  WHERE date IS NOT NULL
  GROUP BY user_id, type, DATE_TRUNC('month', date)::DATE
),
category_monthly AS (
  SELECT 
    t.user_id,
    t.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    c.type AS category_type,
    DATE_TRUNC('month', t.date)::DATE AS month,
    
    -- Spending totals
    SUM(t.amount) AS total_amount,
    
    -- Transaction metrics
    COUNT(*) AS transaction_count,
    AVG(t.amount) AS average_transaction,
    MIN(t.amount) AS min_transaction,
    MAX(t.amount) AS max_transaction,
    
    -- Percentage of total spending for the month
    ROUND(
      (SUM(t.amount) / NULLIF(MAX(mt.monthly_total), 0) * 100)::NUMERIC,
      2
    ) AS percentage_of_total,
    
    -- Period info
    MIN(t.date) AS first_transaction_date,
    MAX(t.date) AS last_transaction_date
    
  FROM transactions t
  INNER JOIN categories c ON t.category_id = c.id
  LEFT JOIN monthly_totals mt ON 
    t.user_id = mt.user_id 
    AND c.type::TEXT = mt.type::TEXT 
    AND DATE_TRUNC('month', t.date)::DATE = mt.month
  WHERE t.date IS NOT NULL
    AND t.category_id IS NOT NULL
  GROUP BY 
    t.user_id, 
    t.category_id, 
    c.name, 
    c.icon, 
    c.color, 
    c.type,
    DATE_TRUNC('month', t.date)::DATE
)
SELECT 
  user_id,
  category_id,
  category_name,
  category_icon,
  category_color,
  category_type,
  month,
  total_amount,
  transaction_count,
  average_transaction,
  min_transaction,
  max_transaction,
  percentage_of_total,
  first_transaction_date,
  last_transaction_date,
  
  -- Trend indicators with window functions
  LAG(total_amount) OVER (
    PARTITION BY user_id, category_id 
    ORDER BY month
  ) AS previous_month_amount,
  
  -- Calculate month-over-month change
  CASE 
    WHEN LAG(total_amount) OVER (
      PARTITION BY user_id, category_id 
      ORDER BY month
    ) > 0
    THEN ROUND(
      ((total_amount - LAG(total_amount) OVER (
        PARTITION BY user_id, category_id 
        ORDER BY month
      )) / LAG(total_amount) OVER (
        PARTITION BY user_id, category_id 
        ORDER BY month
      ) * 100)::NUMERIC,
      2
    )
    ELSE NULL
  END AS month_over_month_change
  
FROM category_monthly;

-- Create indexes
CREATE INDEX idx_category_spending_user_month ON category_spending(user_id, month DESC);
CREATE INDEX idx_category_spending_category ON category_spending(category_id);
CREATE INDEX idx_category_spending_type ON category_spending(category_type);
CREATE INDEX idx_category_spending_amount ON category_spending(total_amount DESC);

COMMENT ON MATERIALIZED VIEW category_spending IS 'Category-level spending analysis with trends and percentages';


-- =============================================
-- 3. MERCHANT ANALYTICS VIEW
-- =============================================
-- Analyzes spending patterns by merchant

CREATE MATERIALIZED VIEW merchant_analytics AS
WITH merchant_data AS (
  SELECT 
    t.user_id,
    LOWER(TRIM(t.merchant_name)) AS merchant_name,
    t.amount,
    t.date,
    t.category_id,
    t.account_id,
    a.name AS account_name
  FROM transactions t
  LEFT JOIN accounts a ON t.account_id = a.id
  WHERE t.merchant_name IS NOT NULL 
    AND TRIM(t.merchant_name) != ''
    AND t.type = 'expense'
),
account_counts AS (
  SELECT 
    user_id,
    merchant_name,
    account_name,
    COUNT(*) AS txn_count
  FROM merchant_data
  WHERE account_id IS NOT NULL
  GROUP BY user_id, merchant_name, account_name
)
SELECT 
  md.user_id,
  md.merchant_name,
  
  -- Spending totals
  SUM(md.amount) AS total_spent,
  
  -- Transaction metrics
  COUNT(*) AS transaction_count,
  AVG(md.amount) AS average_amount,
  MIN(md.amount) AS min_amount,
  MAX(md.amount) AS max_amount,
  
  -- Date ranges
  MIN(md.date) AS first_transaction_date,
  MAX(md.date) AS last_transaction_date,
  
  -- Calculate days between first and last transaction
  (MAX(md.date) - MIN(md.date)) AS days_span,
  
  -- Most used category for this merchant
  MODE() WITHIN GROUP (ORDER BY md.category_id) AS most_used_category_id,
  
  -- Category details (for the most used category)
  (
    SELECT c.name 
    FROM categories c 
    WHERE c.id = MODE() WITHIN GROUP (ORDER BY md.category_id)
    LIMIT 1
  ) AS most_used_category_name,
  
  -- Frequency metrics
  CASE 
    WHEN (MAX(md.date) - MIN(md.date)) > 0
    THEN ROUND(
      (COUNT(*)::DECIMAL / (MAX(md.date) - MIN(md.date)) * 30)::NUMERIC,
      2
    )
    ELSE COUNT(*)::DECIMAL
  END AS avg_transactions_per_month,
  
  -- Recent activity
  MAX(md.date) >= CURRENT_DATE - INTERVAL '30 days' AS active_last_30_days,
  MAX(md.date) >= CURRENT_DATE - INTERVAL '90 days' AS active_last_90_days,
  
  -- Account distribution (JSONB)
  (
    SELECT JSONB_OBJECT_AGG(COALESCE(account_name, 'Unknown'), txn_count)
    FROM account_counts ac
    WHERE ac.user_id = md.user_id 
      AND ac.merchant_name = md.merchant_name
  ) AS account_distribution

FROM merchant_data md
GROUP BY md.user_id, md.merchant_name;

-- Create indexes
CREATE INDEX idx_merchant_analytics_user ON merchant_analytics(user_id);
CREATE INDEX idx_merchant_analytics_merchant ON merchant_analytics(merchant_name);
CREATE INDEX idx_merchant_analytics_total_spent ON merchant_analytics(total_spent DESC);
CREATE INDEX idx_merchant_analytics_transaction_count ON merchant_analytics(transaction_count DESC);
CREATE INDEX idx_merchant_analytics_last_transaction ON merchant_analytics(last_transaction_date DESC);

COMMENT ON MATERIALIZED VIEW merchant_analytics IS 'Merchant-level spending analytics with frequency and patterns';


-- =============================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- =============================================

-- Function to refresh all analytics views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY category_spending;
  REFRESH MATERIALIZED VIEW CONCURRENTLY merchant_analytics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_views() IS 'Refreshes all analytics materialized views';


-- =============================================
-- 4. CALCULATE SPENDING TRENDS FUNCTION
-- =============================================
-- Analyzes spending trends over a date range

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
  transaction_count INTEGER,
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


-- =============================================
-- 5. GET CATEGORY COMPARISON FUNCTION
-- =============================================
-- Compares spending between two time periods

CREATE OR REPLACE FUNCTION get_category_comparison(
  p_user_id UUID,
  p_period1_start DATE,
  p_period1_end DATE,
  p_period2_start DATE,
  p_period2_end DATE
)
RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  category_type TEXT,
  period1_amount DECIMAL(15,2),
  period1_count INTEGER,
  period2_amount DECIMAL(15,2),
  period2_count INTEGER,
  amount_change DECIMAL(15,2),
  amount_change_percentage DECIMAL(10,2),
  count_change INTEGER,
  trend TEXT,
  significance TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH period1_data AS (
    SELECT 
      category_id,
      SUM(total_amount) AS amount,
      SUM(transaction_count)::INTEGER AS count
    FROM category_spending
    WHERE user_id = p_user_id
      AND month BETWEEN p_period1_start AND p_period1_end
    GROUP BY category_id
  ),
  period2_data AS (
    SELECT 
      category_id,
      SUM(total_amount) AS amount,
      SUM(transaction_count)::INTEGER AS count
    FROM category_spending
    WHERE user_id = p_user_id
      AND month BETWEEN p_period2_start AND p_period2_end
    GROUP BY category_id
  )
  SELECT 
    COALESCE(p1.category_id, p2.category_id) AS category_id,
    c.name AS category_name,
    c.type::TEXT AS category_type,
    COALESCE(p1.amount, 0) AS period1_amount,
    COALESCE(p1.count, 0) AS period1_count,
    COALESCE(p2.amount, 0) AS period2_amount,
    COALESCE(p2.count, 0) AS period2_count,
    COALESCE(p2.amount, 0) - COALESCE(p1.amount, 0) AS amount_change,
    CASE 
      WHEN COALESCE(p1.amount, 0) > 0
      THEN ROUND(((COALESCE(p2.amount, 0) - COALESCE(p1.amount, 0)) / p1.amount * 100)::NUMERIC, 2)
      ELSE NULL
    END AS amount_change_percentage,
    COALESCE(p2.count, 0) - COALESCE(p1.count, 0) AS count_change,
    CASE 
      WHEN COALESCE(p2.amount, 0) > COALESCE(p1.amount, 0) THEN 'increasing'
      WHEN COALESCE(p2.amount, 0) < COALESCE(p1.amount, 0) THEN 'decreasing'
      ELSE 'stable'
    END AS trend,
    CASE 
      WHEN ABS(COALESCE(p2.amount, 0) - COALESCE(p1.amount, 0)) > 
           (COALESCE(p1.amount, 0) * 0.5) THEN 'high'
      WHEN ABS(COALESCE(p2.amount, 0) - COALESCE(p1.amount, 0)) > 
           (COALESCE(p1.amount, 0) * 0.2) THEN 'medium'
      ELSE 'low'
    END AS significance
  FROM period1_data p1
  FULL OUTER JOIN period2_data p2 ON p1.category_id = p2.category_id
  INNER JOIN categories c ON COALESCE(p1.category_id, p2.category_id) = c.id
  ORDER BY ABS(COALESCE(p2.amount, 0) - COALESCE(p1.amount, 0)) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_category_comparison(UUID, DATE, DATE, DATE, DATE) IS 'Compares category spending between two time periods';


-- =============================================
-- 6. DETECT SPENDING ANOMALIES FUNCTION
-- =============================================
-- Detects unusual spending patterns using statistical analysis

CREATE OR REPLACE FUNCTION detect_spending_anomalies(
  p_user_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_lookback_months INTEGER DEFAULT 6
)
RETURNS TABLE(
  transaction_id UUID,
  transaction_date DATE,
  amount DECIMAL(15,2),
  category_name TEXT,
  merchant_name TEXT,
  anomaly_type TEXT,
  severity TEXT,
  expected_range_min DECIMAL(15,2),
  expected_range_max DECIMAL(15,2),
  deviation_percentage DECIMAL(10,2),
  description TEXT
) AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - (p_lookback_months || ' months')::INTERVAL;
  
  RETURN QUERY
  WITH category_stats AS (
    SELECT 
      t.category_id,
      AVG(t.amount) AS avg_amount,
      STDDEV(t.amount) AS stddev_amount,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY t.amount) AS q1,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY t.amount) AS q3
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND t.date >= v_start_date
      AND t.type = 'expense'
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
    GROUP BY t.category_id
  ),
  anomalies AS (
    SELECT 
      t.id,
      t.date,
      t.amount,
      c.name AS cat_name,
      t.merchant_name,
      cs.avg_amount,
      cs.stddev_amount,
      cs.q1,
      cs.q3,
      cs.q3 - cs.q1 AS iqr,
      CASE 
        WHEN t.amount > cs.q3 + (1.5 * (cs.q3 - cs.q1)) THEN 'outlier_high'
        WHEN t.amount < cs.q1 - (1.5 * (cs.q3 - cs.q1)) THEN 'outlier_low'
        WHEN t.amount > cs.avg_amount + (2 * cs.stddev_amount) THEN 'unusual_high'
        WHEN t.amount > cs.avg_amount + (3 * cs.stddev_amount) THEN 'extreme_high'
        ELSE 'normal'
      END AS anomaly_type
    FROM transactions t
    INNER JOIN categories c ON t.category_id = c.id
    INNER JOIN category_stats cs ON t.category_id = cs.category_id
    WHERE t.user_id = p_user_id
      AND t.date >= v_start_date - INTERVAL '30 days'
      AND t.type = 'expense'
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
  )
  SELECT 
    a.id,
    a.date,
    a.amount,
    a.cat_name,
    a.merchant_name,
    a.anomaly_type,
    CASE 
      WHEN a.anomaly_type = 'extreme_high' THEN 'critical'
      WHEN a.anomaly_type IN ('outlier_high', 'unusual_high') THEN 'high'
      WHEN a.anomaly_type = 'outlier_low' THEN 'medium'
      ELSE 'low'
    END AS severity,
    ROUND((a.avg_amount - a.stddev_amount)::NUMERIC, 2) AS expected_range_min,
    ROUND((a.avg_amount + a.stddev_amount)::NUMERIC, 2) AS expected_range_max,
    ROUND((((a.amount - a.avg_amount) / NULLIF(a.avg_amount, 0)) * 100)::NUMERIC, 2) AS deviation_percentage,
    CASE 
      WHEN a.anomaly_type = 'extreme_high' 
        THEN 'Transaction is more than 3 standard deviations above average'
      WHEN a.anomaly_type = 'unusual_high' 
        THEN 'Transaction is more than 2 standard deviations above average'
      WHEN a.anomaly_type = 'outlier_high' 
        THEN 'Transaction is an upper outlier (beyond Q3 + 1.5*IQR)'
      WHEN a.anomaly_type = 'outlier_low' 
        THEN 'Transaction is a lower outlier (below Q1 - 1.5*IQR)'
      ELSE 'Transaction is within normal range'
    END AS description
  FROM anomalies a
  WHERE a.anomaly_type != 'normal'
  ORDER BY 
    CASE 
      WHEN a.anomaly_type = 'extreme_high' THEN 1
      WHEN a.anomaly_type = 'outlier_high' THEN 2
      WHEN a.anomaly_type = 'unusual_high' THEN 3
      ELSE 4
    END,
    a.amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_spending_anomalies(UUID, UUID, INTEGER) IS 'Detects unusual spending patterns using statistical analysis';


-- =============================================
-- 7. CALCULATE FINANCIAL HEALTH SCORE FUNCTION
-- =============================================
-- Calculates a comprehensive financial health score (0-100)

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
    ARRAY(
      SELECT unnest(ARRAY[
        CASE WHEN c.savings_score >= 25 THEN 'Excellent savings rate' END,
        CASE WHEN c.spending_score >= 20 THEN 'Consistent spending habits' END,
        CASE WHEN c.budget_score >= 20 THEN 'Great budget adherence' END,
        CASE WHEN c.trend_score >= 8 THEN 'Positive financial trend' END
      ]) WHERE unnest IS NOT NULL
    ) AS strengths,
    ARRAY(
      SELECT unnest(ARRAY[
        CASE WHEN c.savings_score < 15 THEN 'Low savings rate' END,
        CASE WHEN c.spending_score < 15 THEN 'Inconsistent spending' END,
        CASE WHEN c.budget_score < 15 THEN 'Budget overspending' END,
        CASE WHEN c.trend_score < 5 THEN 'Declining financial trend' END
      ]) WHERE unnest IS NOT NULL
    ) AS weaknesses,
    ARRAY(
      SELECT unnest(ARRAY[
        CASE WHEN c.savings_score < 15 THEN 'Increase your savings rate to at least 10%' END,
        CASE WHEN c.spending_score < 15 THEN 'Work on maintaining consistent monthly spending' END,
        CASE WHEN c.budget_score < 15 THEN 'Review and adjust your budget allocations' END,
        CASE WHEN c.consistency_score < 8 THEN 'Track expenses more regularly' END
      ]) WHERE unnest IS NOT NULL
    ) AS recommendations
  FROM calculated c;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_financial_health_score(UUID) IS 'Calculates comprehensive financial health score with breakdown and recommendations';


-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to authenticated users
GRANT SELECT ON monthly_summary TO authenticated;
GRANT SELECT ON category_spending TO authenticated;
GRANT SELECT ON merchant_analytics TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_spending_trends(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_comparison(UUID, DATE, DATE, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_spending_anomalies(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_financial_health_score(UUID) TO authenticated;


-- =============================================
-- REFRESH SCHEDULE (Optional - requires pg_cron extension)
-- =============================================

-- Uncomment if pg_cron is installed:
-- SELECT cron.schedule(
--   'refresh-analytics-daily',
--   '0 2 * * *', -- Every day at 2 AM
--   $$SELECT refresh_analytics_views();$$
-- );

-- For manual refresh, run:
-- SELECT refresh_analytics_views();
