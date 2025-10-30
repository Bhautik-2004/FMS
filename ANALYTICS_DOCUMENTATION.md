# Analytics Views and Functions Documentation

This document describes the materialized views and analytics functions for comprehensive financial analysis and insights.

## 📊 Materialized Views

### 1. monthly_summary

**Purpose:** Aggregates monthly income, expenses, savings data, and account balances.

**Columns:**
- `user_id` (UUID): User identifier
- `month` (DATE): First day of the month
- `total_income` (DECIMAL): Total income for the month
- `total_expenses` (DECIMAL): Total expenses for the month
- `net_savings` (DECIMAL): Income minus expenses
- `savings_rate` (DECIMAL): Percentage of income saved
- `account_balances` (JSONB): Current balances for all accounts
- `income_transaction_count` (INTEGER): Number of income transactions
- `expense_transaction_count` (INTEGER): Number of expense transactions
- `avg_income_transaction` (DECIMAL): Average income transaction amount
- `avg_expense_transaction` (DECIMAL): Average expense transaction amount
- `period_start` (DATE): First transaction date in month
- `period_end` (DATE): Last transaction date in month
- `total_transactions` (INTEGER): Total transaction count

**Indexes:**
- `idx_monthly_summary_user_month`: (user_id, month DESC)
- `idx_monthly_summary_month`: (month DESC)

**Usage Example:**
```sql
-- Get last 6 months summary
SELECT * FROM monthly_summary
WHERE user_id = 'your-user-id'
  AND month >= CURRENT_DATE - INTERVAL '6 months'
ORDER BY month DESC;

-- Check savings trend
SELECT 
  month,
  total_income,
  total_expenses,
  net_savings,
  savings_rate
FROM monthly_summary
WHERE user_id = 'your-user-id'
ORDER BY month DESC
LIMIT 12;
```

---

### 2. category_spending

**Purpose:** Analyzes spending patterns by category with trends and percentages.

**Columns:**
- `user_id` (UUID): User identifier
- `category_id` (UUID): Category identifier
- `category_name` (TEXT): Category name
- `category_icon` (TEXT): Icon name
- `category_color` (TEXT): Color code
- `category_type` (TEXT): 'income' or 'expense'
- `month` (DATE): First day of the month
- `total_amount` (DECIMAL): Total spending in category
- `transaction_count` (INTEGER): Number of transactions
- `average_transaction` (DECIMAL): Average transaction amount
- `min_transaction` (DECIMAL): Smallest transaction
- `max_transaction` (DECIMAL): Largest transaction
- `percentage_of_total` (DECIMAL): Percentage of total monthly spending
- `previous_month_amount` (DECIMAL): Previous month's total
- `month_over_month_change` (DECIMAL): Percentage change from previous month
- `first_transaction_date` (DATE): First transaction in period
- `last_transaction_date` (DATE): Last transaction in period

**Indexes:**
- `idx_category_spending_user_month`: (user_id, month DESC)
- `idx_category_spending_category`: (category_id)
- `idx_category_spending_type`: (category_type)
- `idx_category_spending_amount`: (total_amount DESC)

**Usage Example:**
```sql
-- Top spending categories this month
SELECT 
  category_name,
  total_amount,
  transaction_count,
  percentage_of_total,
  month_over_month_change
FROM category_spending
WHERE user_id = 'your-user-id'
  AND month = DATE_TRUNC('month', CURRENT_DATE)
  AND category_type = 'expense'
ORDER BY total_amount DESC
LIMIT 10;

-- Category trend over time
SELECT 
  month,
  category_name,
  total_amount,
  month_over_month_change
FROM category_spending
WHERE user_id = 'your-user-id'
  AND category_id = 'category-id'
ORDER BY month DESC;
```

---

### 3. merchant_analytics

**Purpose:** Analyzes spending patterns by merchant with frequency metrics.

**Columns:**
- `user_id` (UUID): User identifier
- `merchant_name` (TEXT): Normalized merchant name (lowercase, trimmed)
- `total_spent` (DECIMAL): Total amount spent at merchant
- `transaction_count` (INTEGER): Number of transactions
- `average_amount` (DECIMAL): Average transaction amount
- `min_amount` (DECIMAL): Smallest transaction
- `max_amount` (DECIMAL): Largest transaction
- `first_transaction_date` (DATE): First purchase date
- `last_transaction_date` (DATE): Most recent purchase date
- `days_span` (INTEGER): Days between first and last transaction
- `most_used_category_id` (UUID): Most common category
- `most_used_category_name` (TEXT): Category name
- `avg_transactions_per_month` (DECIMAL): Average monthly frequency
- `active_last_30_days` (BOOLEAN): Purchased in last 30 days
- `active_last_90_days` (BOOLEAN): Purchased in last 90 days
- `account_distribution` (JSONB): Transaction count by account

**Indexes:**
- `idx_merchant_analytics_user`: (user_id)
- `idx_merchant_analytics_merchant`: (merchant_name)
- `idx_merchant_analytics_total_spent`: (total_spent DESC)
- `idx_merchant_analytics_transaction_count`: (transaction_count DESC)
- `idx_merchant_analytics_last_transaction`: (last_transaction_date DESC)

**Usage Example:**
```sql
-- Top merchants by spending
SELECT 
  merchant_name,
  total_spent,
  transaction_count,
  average_amount,
  most_used_category_name,
  active_last_30_days
FROM merchant_analytics
WHERE user_id = 'your-user-id'
ORDER BY total_spent DESC
LIMIT 20;

-- Frequent merchants
SELECT 
  merchant_name,
  transaction_count,
  avg_transactions_per_month,
  last_transaction_date
FROM merchant_analytics
WHERE user_id = 'your-user-id'
  AND active_last_90_days = true
ORDER BY transaction_count DESC;
```

---

## 🔧 Analytics Functions

### 1. refresh_analytics_views()

**Purpose:** Refreshes all materialized views concurrently.

**Parameters:** None

**Returns:** VOID

**Usage:**
```sql
-- Refresh all analytics views
SELECT refresh_analytics_views();
```

**When to refresh:**
- After bulk transaction imports
- Daily (via cron job)
- Before generating reports
- After significant data changes

---

### 2. calculate_spending_trends()

**Purpose:** Analyzes spending trends over a date range with detailed metrics.

**Parameters:**
- `p_user_id` (UUID): User identifier
- `p_start_date` (DATE): Start of analysis period
- `p_end_date` (DATE): End of analysis period

**Returns Table:**
- `period` (TEXT): Month in YYYY-MM format
- `total_spent` (DECIMAL): Total expenses
- `total_income` (DECIMAL): Total income
- `net_savings` (DECIMAL): Savings amount
- `transaction_count` (INTEGER): Number of transactions
- `avg_daily_spending` (DECIMAL): Average daily expense
- `trend_direction` (TEXT): 'increasing', 'decreasing', 'stable', or 'neutral'
- `trend_percentage` (DECIMAL): Month-over-month change percentage
- `top_category` (TEXT): Highest spending category
- `top_category_amount` (DECIMAL): Amount spent in top category

**Usage Example:**
```sql
-- Analyze last 6 months trends
SELECT * FROM calculate_spending_trends(
  'your-user-id',
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE
)
ORDER BY period DESC;

-- Find months with highest spending
SELECT 
  period,
  total_spent,
  trend_direction,
  trend_percentage
FROM calculate_spending_trends(
  'your-user-id',
  '2024-01-01',
  '2024-12-31'
)
WHERE total_spent > 5000
ORDER BY total_spent DESC;
```

---

### 3. get_category_comparison()

**Purpose:** Compares category spending between two time periods.

**Parameters:**
- `p_user_id` (UUID): User identifier
- `p_period1_start` (DATE): First period start
- `p_period1_end` (DATE): First period end
- `p_period2_start` (DATE): Second period start
- `p_period2_end` (DATE): Second period end

**Returns Table:**
- `category_id` (UUID): Category identifier
- `category_name` (TEXT): Category name
- `category_type` (TEXT): 'income' or 'expense'
- `period1_amount` (DECIMAL): First period total
- `period1_count` (INTEGER): First period transaction count
- `period2_amount` (DECIMAL): Second period total
- `period2_count` (INTEGER): Second period transaction count
- `amount_change` (DECIMAL): Difference between periods
- `amount_change_percentage` (DECIMAL): Percentage change
- `count_change` (INTEGER): Transaction count difference
- `trend` (TEXT): 'increasing', 'decreasing', or 'stable'
- `significance` (TEXT): 'high', 'medium', or 'low'

**Usage Example:**
```sql
-- Compare this month to last month
SELECT 
  category_name,
  period1_amount AS last_month,
  period2_amount AS this_month,
  amount_change,
  amount_change_percentage,
  trend,
  significance
FROM get_category_comparison(
  'your-user-id',
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
)
WHERE category_type = 'expense'
ORDER BY ABS(amount_change) DESC;

-- Compare Q1 to Q2
SELECT * FROM get_category_comparison(
  'your-user-id',
  '2024-01-01', '2024-03-31',
  '2024-04-01', '2024-06-30'
)
WHERE significance IN ('high', 'medium')
ORDER BY amount_change_percentage DESC;
```

---

### 4. detect_spending_anomalies()

**Purpose:** Detects unusual spending patterns using statistical analysis (IQR and standard deviation).

**Parameters:**
- `p_user_id` (UUID): User identifier
- `p_category_id` (UUID): Optional - specific category to analyze
- `p_lookback_months` (INTEGER): Number of months to analyze (default: 6)

**Returns Table:**
- `transaction_id` (UUID): Transaction identifier
- `transaction_date` (DATE): Transaction date
- `amount` (DECIMAL): Transaction amount
- `category_name` (TEXT): Category name
- `merchant_name` (TEXT): Merchant name
- `anomaly_type` (TEXT): Type of anomaly detected
  - `extreme_high`: >3 standard deviations above mean
  - `unusual_high`: >2 standard deviations above mean
  - `outlier_high`: Beyond Q3 + 1.5*IQR
  - `outlier_low`: Below Q1 - 1.5*IQR
- `severity` (TEXT): 'critical', 'high', 'medium', or 'low'
- `expected_range_min` (DECIMAL): Lower bound of normal range
- `expected_range_max` (DECIMAL): Upper bound of normal range
- `deviation_percentage` (DECIMAL): How far from average
- `description` (TEXT): Human-readable explanation

**Usage Example:**
```sql
-- Find all spending anomalies for user
SELECT 
  transaction_date,
  amount,
  category_name,
  merchant_name,
  anomaly_type,
  severity,
  description
FROM detect_spending_anomalies('your-user-id')
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  transaction_date DESC;

-- Check specific category for anomalies
SELECT * FROM detect_spending_anomalies(
  'your-user-id',
  'groceries-category-id',
  12  -- Look back 12 months
)
WHERE severity IN ('critical', 'high');

-- Recent unusual transactions
SELECT 
  transaction_date,
  merchant_name,
  amount,
  expected_range_max,
  deviation_percentage
FROM detect_spending_anomalies('your-user-id')
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY amount DESC;
```

---

### 5. calculate_financial_health_score()

**Purpose:** Calculates a comprehensive financial health score (0-100) with detailed breakdown.

**Parameters:**
- `p_user_id` (UUID): User identifier

**Returns Table:**
- `overall_score` (INTEGER): Total score (0-100)
- `savings_score` (INTEGER): Savings rate score (0-30)
- `spending_score` (INTEGER): Spending consistency score (0-25)
- `budget_score` (INTEGER): Budget adherence score (0-25)
- `consistency_score` (INTEGER): Transaction tracking consistency (0-10)
- `trend_score` (INTEGER): Financial trend score (0-10)
- `grade` (TEXT): Letter grade (A+, A, B, C, D, F)
- `strengths` (TEXT[]): Array of positive factors
- `weaknesses` (TEXT[]): Array of areas needing improvement
- `recommendations` (TEXT[]): Array of actionable suggestions

**Scoring Breakdown:**

**Savings Score (0-30 points):**
- 30 points: Savings rate ≥ 20%
- 25 points: Savings rate ≥ 15%
- 20 points: Savings rate ≥ 10%
- 15 points: Savings rate ≥ 5%
- 10 points: Savings rate ≥ 0%
- 5 points: Negative savings

**Spending Score (0-25 points):**
- 25 points: Very consistent (stddev < $100)
- 20 points: Consistent (stddev < $300)
- 15 points: Moderate (stddev < $500)
- 10 points: Variable (stddev < $1000)
- 5 points: Highly variable

**Budget Score (0-25 points):**
- 25 points: Spending ≤ 80% of budget
- 20 points: Spending ≤ 90% of budget
- 15 points: Spending ≤ 100% of budget
- 10 points: Spending ≤ 110% of budget
- 5 points: Spending > 110% of budget

**Consistency Score (0-10 points):**
- 10 points: 3+ months of data
- 7 points: 2 months of data
- 5 points: 1 month of data

**Trend Score (0-10 points):**
- Based on savings rate trend over time

**Letter Grades:**
- A+: 90-100
- A: 80-89
- B: 70-79
- C: 60-69
- D: 50-59
- F: 0-49

**Usage Example:**
```sql
-- Get complete financial health assessment
SELECT * FROM calculate_financial_health_score('your-user-id');

-- Display score breakdown
SELECT 
  overall_score,
  grade,
  savings_score || '/30' AS savings,
  spending_score || '/25' AS spending,
  budget_score || '/25' AS budget,
  consistency_score || '/10' AS consistency,
  trend_score || '/10' AS trend
FROM calculate_financial_health_score('your-user-id');

-- Get recommendations
SELECT 
  overall_score,
  grade,
  UNNEST(recommendations) AS recommendation
FROM calculate_financial_health_score('your-user-id');

-- Check strengths and weaknesses
SELECT 
  'Strengths' AS type,
  UNNEST(strengths) AS item
FROM calculate_financial_health_score('your-user-id')
UNION ALL
SELECT 
  'Weaknesses' AS type,
  UNNEST(weaknesses) AS item
FROM calculate_financial_health_score('your-user-id');
```

---

## 🔄 Refresh Strategy

### Manual Refresh
```sql
-- Refresh all views
SELECT refresh_analytics_views();

-- Refresh individual views
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY category_spending;
REFRESH MATERIALIZED VIEW CONCURRENTLY merchant_analytics;
```

### Automated Refresh (if pg_cron is available)
```sql
-- Daily refresh at 2 AM
SELECT cron.schedule(
  'refresh-analytics-daily',
  '0 2 * * *',
  $$SELECT refresh_analytics_views();$$
);
```

### When to Refresh
- After importing transactions
- Before generating reports
- Daily (automated)
- After bulk data changes
- Before user requests analytics

---

## 📈 Common Analytics Queries

### Monthly Financial Overview
```sql
SELECT 
  m.month,
  m.total_income,
  m.total_expenses,
  m.net_savings,
  m.savings_rate,
  t.top_category,
  t.trend_direction
FROM monthly_summary m
LEFT JOIN LATERAL (
  SELECT * FROM calculate_spending_trends(
    m.user_id,
    m.month,
    m.month
  )
) t ON true
WHERE m.user_id = 'your-user-id'
ORDER BY m.month DESC
LIMIT 12;
```

### Category Performance Dashboard
```sql
SELECT 
  cs.category_name,
  cs.total_amount AS this_month,
  cs.previous_month_amount AS last_month,
  cs.month_over_month_change AS change_pct,
  cs.percentage_of_total AS pct_of_spending,
  cs.transaction_count,
  CASE 
    WHEN cs.month_over_month_change > 20 THEN 'Significant Increase'
    WHEN cs.month_over_month_change > 0 THEN 'Slight Increase'
    WHEN cs.month_over_month_change < -20 THEN 'Significant Decrease'
    WHEN cs.month_over_month_change < 0 THEN 'Slight Decrease'
    ELSE 'Stable'
  END AS trend_label
FROM category_spending cs
WHERE cs.user_id = 'your-user-id'
  AND cs.month = DATE_TRUNC('month', CURRENT_DATE)
  AND cs.category_type = 'expense'
ORDER BY cs.total_amount DESC;
```

### Merchant Loyalty Analysis
```sql
SELECT 
  merchant_name,
  total_spent,
  transaction_count,
  average_amount,
  avg_transactions_per_month,
  EXTRACT(DAY FROM CURRENT_DATE - last_transaction_date)::INTEGER AS days_since_last_visit,
  CASE 
    WHEN active_last_30_days THEN 'Active'
    WHEN active_last_90_days THEN 'Recent'
    ELSE 'Inactive'
  END AS customer_status
FROM merchant_analytics
WHERE user_id = 'your-user-id'
ORDER BY total_spent DESC
LIMIT 50;
```

### Anomaly Report
```sql
SELECT 
  DATE_TRUNC('week', transaction_date) AS week,
  COUNT(*) AS anomaly_count,
  SUM(amount) AS anomalous_spending,
  STRING_AGG(DISTINCT category_name, ', ') AS affected_categories
FROM detect_spending_anomalies('your-user-id')
WHERE severity IN ('critical', 'high')
GROUP BY week
ORDER BY week DESC;
```

---

## 🎯 Best Practices

### Performance Tips
1. **Refresh views during off-peak hours** (e.g., 2 AM)
2. **Use indexes** - All views have optimized indexes
3. **Filter by user_id first** in all queries
4. **Limit date ranges** for better performance
5. **Use CONCURRENTLY** when refreshing views

### Data Quality
1. **Ensure transactions have dates** - Views exclude null dates
2. **Categorize transactions** - Better analytics with categories
3. **Clean merchant names** - Merchant view normalizes names
4. **Regular refreshes** - Keep views up-to-date

### Query Optimization
1. **Use materialized views** instead of complex queries
2. **Leverage indexes** in WHERE clauses
3. **Combine with functions** for deeper insights
4. **Cache results** in application layer

---

## 🔒 Security

All views and functions have Row Level Security through user_id filtering:
- Views only show data for authenticated users
- Functions require user_id parameter
- Grants limited to authenticated role
- No cross-user data access

---

## 📊 Integration Examples

### React Component Example
```typescript
// Fetch monthly summary
const { data, error } = await supabase
  .from('monthly_summary')
  .select('*')
  .eq('user_id', user.id)
  .gte('month', startDate)
  .lte('month', endDate)
  .order('month', { ascending: false });

// Call analytics function
const { data: trends } = await supabase
  .rpc('calculate_spending_trends', {
    p_user_id: user.id,
    p_start_date: '2024-01-01',
    p_end_date: '2024-12-31'
  });
```

---

**Migration File:** `supabase/migrations/20250107000000_create_analytics_views.sql`

**Last Updated:** December 2024  
**Version:** 1.0.0
