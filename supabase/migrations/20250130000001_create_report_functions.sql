-- =============================================
-- REPORT DATA GENERATION FUNCTIONS
-- =============================================
-- These functions generate the data for various report types
-- The actual PDF/CSV/XLSX formatting happens in the application layer
-- =============================================

-- =============================================
-- 1. INCOME STATEMENT (Profit & Loss) DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_income_statement_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  category TEXT,
  section TEXT,
  amount DECIMAL(15,2),
  percentage DECIMAL(5,2),
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH income_data AS (
    SELECT 
      COALESCE(c.name, 'Uncategorized') as category_name,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.type = 'income'::transaction_type
      AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY c.name
  ),
  expense_data AS (
    SELECT 
      COALESCE(c.name, 'Uncategorized') as category_name,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'::transaction_type
      AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY c.name
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(total), 0) as total_income,
      (SELECT COALESCE(SUM(total), 0) FROM expense_data) as total_expenses
    FROM income_data
  )
  
  -- Income section
  SELECT 
    i.category_name,
    'INCOME'::TEXT,
    i.total,
    CASE WHEN t.total_income > 0 
      THEN ROUND((i.total / t.total_income * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    1::INTEGER
  FROM income_data i, totals t
  
  UNION ALL
  
  -- Total Income
  SELECT 
    'Total Income'::TEXT,
    'INCOME_TOTAL'::TEXT,
    total_income,
    100.00,
    2::INTEGER
  FROM totals
  
  UNION ALL
  
  -- Expense section
  SELECT 
    e.category_name,
    'EXPENSES'::TEXT,
    e.total,
    CASE WHEN t.total_expenses > 0 
      THEN ROUND((e.total / t.total_expenses * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    3::INTEGER
  FROM expense_data e, totals t
  
  UNION ALL
  
  -- Total Expenses
  SELECT 
    'Total Expenses'::TEXT,
    'EXPENSES_TOTAL'::TEXT,
    total_expenses,
    100.00,
    4::INTEGER
  FROM totals
  
  UNION ALL
  
  -- Net Income
  SELECT 
    'Net Income'::TEXT,
    'NET_INCOME'::TEXT,
    (total_income - total_expenses),
    CASE WHEN total_income > 0 
      THEN ROUND(((total_income - total_expenses) / total_income * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    5::INTEGER
  FROM totals
  
  ORDER BY 5, 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_income_statement_data(UUID, DATE, DATE) TO authenticated;

-- =============================================
-- 2. BALANCE SHEET DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_balance_sheet_data(
  p_user_id UUID,
  p_as_of_date DATE
)
RETURNS TABLE(
  item TEXT,
  section TEXT,
  amount DECIMAL(15,2),
  percentage DECIMAL(5,2),
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH assets AS (
    SELECT 
      a.name,
      a.current_balance,
      a.type
    FROM accounts a
    WHERE a.user_id = p_user_id
      AND a.created_at <= p_as_of_date
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(current_balance), 0) as total_assets,
      COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0) as total_liabilities,
      COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as positive_assets
    FROM assets
  )
  
  -- Assets
  SELECT 
    a.name,
    'ASSETS'::TEXT,
    a.current_balance,
    CASE WHEN t.positive_assets > 0 
      THEN ROUND((a.current_balance / t.positive_assets * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    1::INTEGER
  FROM assets a, totals t
  WHERE a.current_balance > 0
  
  UNION ALL
  
  -- Total Assets
  SELECT 
    'Total Assets'::TEXT,
    'ASSETS_TOTAL'::TEXT,
    positive_assets,
    100.00,
    2::INTEGER
  FROM totals
  
  UNION ALL
  
  -- Liabilities (negative balances represent debt)
  SELECT 
    a.name,
    'LIABILITIES'::TEXT,
    ABS(a.current_balance),
    CASE WHEN t.total_liabilities > 0 
      THEN ROUND((ABS(a.current_balance) / t.total_liabilities * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    3::INTEGER
  FROM assets a, totals t
  WHERE a.current_balance < 0
  
  UNION ALL
  
  -- Total Liabilities
  SELECT 
    'Total Liabilities'::TEXT,
    'LIABILITIES_TOTAL'::TEXT,
    total_liabilities,
    100.00,
    4::INTEGER
  FROM totals
  
  UNION ALL
  
  -- Net Worth
  SELECT 
    'Net Worth'::TEXT,
    'NET_WORTH'::TEXT,
    (positive_assets - total_liabilities),
    100.00,
    5::INTEGER
  FROM totals
  
  ORDER BY 5, 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_balance_sheet_data(UUID, DATE) TO authenticated;

-- =============================================
-- 3. CASH FLOW STATEMENT DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_cash_flow_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  item TEXT,
  section TEXT,
  amount DECIMAL(15,2),
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH operating_activities AS (
    SELECT 
      COALESCE(c.name, 'Uncategorized') as category_name,
      SUM(CASE WHEN t.type = 'income'::transaction_type THEN t.amount ELSE -t.amount END) as net_amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.date BETWEEN p_start_date AND p_end_date
      AND c.type IN ('income'::category_type, 'expense'::category_type)
    GROUP BY c.name
  ),
  account_changes AS (
    SELECT 
      a.name as account_name,
      a.type as account_type,
      SUM(CASE WHEN t.type = 'income'::transaction_type THEN t.amount ELSE -t.amount END) as net_change
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = p_user_id
      AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY a.name, a.type
  )
  
  -- Operating Activities
  SELECT 
    oa.category_name,
    'OPERATING'::TEXT,
    oa.net_amount,
    1::INTEGER
  FROM operating_activities oa
  
  UNION ALL
  
  -- Net Operating Cash Flow
  SELECT 
    'Net Cash from Operating Activities'::TEXT,
    'OPERATING_TOTAL'::TEXT,
    COALESCE(SUM(net_amount), 0),
    2::INTEGER
  FROM operating_activities
  
  UNION ALL
  
  -- Investing Activities (transfers between accounts)
  SELECT 
    'Account Transfers'::TEXT,
    'INVESTING'::TEXT,
    COALESCE(SUM(
      CASE WHEN t.type = 'transfer'::transaction_type 
      THEN t.amount 
      ELSE 0 END
    ), 0),
    3::INTEGER
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.date BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Beginning Balance
  SELECT 
    'Beginning Cash Balance'::TEXT,
    'BALANCE'::TEXT,
    COALESCE(SUM(a.current_balance), 0) - COALESCE((
      SELECT SUM(CASE WHEN t.type = 'income'::transaction_type THEN t.amount ELSE -t.amount END)
      FROM transactions t
      WHERE t.user_id = p_user_id
        AND t.date BETWEEN p_start_date AND p_end_date
    ), 0),
    4::INTEGER
  FROM accounts a
  WHERE a.user_id = p_user_id
  
  UNION ALL
  
  -- Ending Balance
  SELECT 
    'Ending Cash Balance'::TEXT,
    'BALANCE_END'::TEXT,
    COALESCE(SUM(a.current_balance), 0),
    5::INTEGER
  FROM accounts a
  WHERE a.user_id = p_user_id
  
  ORDER BY 4, 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_cash_flow_data(UUID, DATE, DATE) TO authenticated;

-- =============================================
-- 4. BUDGET PERFORMANCE REPORT DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_budget_performance_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  budget_name TEXT,
  category_name TEXT,
  allocated DECIMAL(15,2),
  spent DECIMAL(15,2),
  remaining DECIMAL(15,2),
  percentage_used DECIMAL(5,2),
  status TEXT,
  period_start DATE,
  period_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name,
    c.name,
    bc.allocated_amount,
    bc.spent_amount,
    (bc.allocated_amount - bc.spent_amount),
    CASE WHEN bc.allocated_amount > 0 
      THEN ROUND((bc.spent_amount / bc.allocated_amount * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    CASE 
      WHEN bc.spent_amount <= bc.allocated_amount * 0.8 THEN 'On Track'
      WHEN bc.spent_amount <= bc.allocated_amount THEN 'Warning'
      ELSE 'Over Budget'
    END,
    b.start_date,
    b.end_date
  FROM budgets b
  JOIN budget_categories bc ON b.id = bc.budget_id
  JOIN categories c ON bc.category_id = c.id
  WHERE b.user_id = p_user_id
    AND b.start_date <= p_end_date
    AND b.end_date >= p_start_date
  ORDER BY b.name, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_budget_performance_data(UUID, DATE, DATE) TO authenticated;

-- =============================================
-- 5. BUDGET VARIANCE ANALYSIS DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_budget_variance_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  budget_name TEXT,
  category_name TEXT,
  allocated DECIMAL(15,2),
  actual DECIMAL(15,2),
  variance DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  favorable BOOLEAN,
  period TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name,
    c.name,
    bc.allocated_amount,
    bc.spent_amount,
    (bc.allocated_amount - bc.spent_amount),
    CASE WHEN bc.allocated_amount > 0 
      THEN ROUND(((bc.allocated_amount - bc.spent_amount) / bc.allocated_amount * 100)::NUMERIC, 2)
      ELSE 0 
    END,
    (bc.spent_amount <= bc.allocated_amount),
    TO_CHAR(b.start_date, 'Mon YYYY')
  FROM budgets b
  JOIN budget_categories bc ON b.id = bc.budget_id
  JOIN categories c ON bc.category_id = c.id
  WHERE b.user_id = p_user_id
    AND b.start_date <= p_end_date
    AND b.end_date >= p_start_date
  ORDER BY ABS(bc.allocated_amount - bc.spent_amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_budget_variance_data(UUID, DATE, DATE) TO authenticated;

-- =============================================
-- 6. TRANSACTION DETAIL REPORT DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_transaction_detail_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_account_ids UUID[] DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL,
  p_transaction_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  date DATE,
  description TEXT,
  category TEXT,
  account TEXT,
  type TEXT,
  amount DECIMAL(15,2),
  balance_impact DECIMAL(15,2),
  tags TEXT[],
  merchant TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.date,
    t.description,
    COALESCE(c.name, 'Uncategorized'),
    a.name,
    t.type::TEXT,
    t.amount,
    CASE 
      WHEN t.type = 'income'::transaction_type THEN t.amount
      WHEN t.type = 'expense'::transaction_type THEN -t.amount
      ELSE 0
    END,
    t.tags,
    t.merchant_name,
    t.notes
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  JOIN accounts a ON t.account_id = a.id
  WHERE t.user_id = p_user_id
    AND t.date BETWEEN p_start_date AND p_end_date
    AND (p_account_ids IS NULL OR t.account_id = ANY(p_account_ids))
    AND (p_category_ids IS NULL OR t.category_id = ANY(p_category_ids))
    AND (p_transaction_type IS NULL OR t.type = p_transaction_type::transaction_type)
  ORDER BY t.date DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_transaction_detail_data(UUID, DATE, DATE, UUID[], UUID[], TEXT) TO authenticated;

-- =============================================
-- 7. MERCHANT ANALYSIS REPORT DATA
-- =============================================
CREATE OR REPLACE FUNCTION generate_merchant_analysis_data(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  merchant TEXT,
  transaction_count BIGINT,
  total_spent DECIMAL(15,2),
  average_transaction DECIMAL(15,2),
  first_transaction DATE,
  last_transaction DATE,
  categories TEXT[],
  frequency_days DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH merchant_stats AS (
    SELECT 
      t.merchant_name,
      COUNT(*) as txn_count,
      SUM(t.amount) as total,
      AVG(t.amount) as avg_amount,
      MIN(t.date) as first_date,
      MAX(t.date) as last_date,
      ARRAY_AGG(DISTINCT c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL) as cats,
      CASE 
        WHEN COUNT(*) > 1 THEN (MAX(t.date) - MIN(t.date))::NUMERIC / GREATEST(COUNT(*) - 1, 1)
        ELSE 0
      END as freq
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND t.date BETWEEN p_start_date AND p_end_date
      AND t.type = 'expense'::transaction_type
      AND t.merchant_name IS NOT NULL
      AND t.merchant_name != ''
    GROUP BY t.merchant_name
  )
  SELECT 
    ms.merchant_name,
    ms.txn_count,
    ms.total,
    ROUND(ms.avg_amount::NUMERIC, 2),
    ms.first_date,
    ms.last_date,
    COALESCE(ms.cats, ARRAY[]::TEXT[]),
    ROUND(ms.freq, 1)
  FROM merchant_stats ms
  ORDER BY ms.total DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_merchant_analysis_data(UUID, DATE, DATE, INTEGER) TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE 'generate_%_data'
ORDER BY proname;
