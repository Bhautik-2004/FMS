# Budget System Documentation

## Overview

The budget system provides comprehensive financial planning and tracking capabilities with automatic monitoring, alerts, and category-level budget management.

## Database Schema

### Tables

#### 1. `budgets`
Main budget container with period settings and alert configuration.

**Columns:**
- `id` (UUID): Primary key
- `user_id` (UUID): References auth.users
- `name` (TEXT): Budget name (e.g., "January 2025 Budget")
- `period_type` (ENUM): monthly, quarterly, yearly, custom
- `start_date` (DATE): Budget period start
- `end_date` (DATE): Budget period end
- `total_amount` (DECIMAL): Total budget amount
- `rollover_enabled` (BOOLEAN): Allow unused budget to roll over
- `alert_threshold` (INTEGER): Percentage for threshold alerts (default 80%)
- `is_active` (BOOLEAN): Whether budget is active
- `notes` (TEXT): Optional notes
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- `end_date > start_date`
- `alert_threshold` between 0-100
- Unique active budget per period for user

#### 2. `budget_categories`
Category-level budget allocations with spending tracking.

**Columns:**
- `id` (UUID): Primary key
- `budget_id` (UUID): References budgets
- `category_id` (UUID): References categories
- `allocated_amount` (DECIMAL): Budgeted amount for category
- `spent_amount` (DECIMAL): Automatically calculated spent amount
- `rollover_from_previous` (DECIMAL): Amount rolled over from previous budget
- `notes` (TEXT): Category-specific notes
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- Unique category per budget
- One category can only appear once per budget

#### 3. `budget_alerts`
Automated alerts for budget monitoring.

**Columns:**
- `id` (UUID): Primary key
- `budget_id` (UUID): References budgets
- `budget_category_id` (UUID): References budget_categories (nullable)
- `alert_type` (ENUM): threshold, exceeded, approaching
- `message` (TEXT): Alert message
- `is_read` (BOOLEAN): Whether user has read the alert
- `created_at` (TIMESTAMPTZ)

**Alert Types:**
- `approaching`: 70% of alert threshold (default: 56% of budget)
- `threshold`: Alert threshold reached (default: 80% of budget)
- `exceeded`: Budget exceeded (>100% spent)

### Enums

```sql
CREATE TYPE budget_period_type AS ENUM ('monthly', 'quarterly', 'yearly', 'custom');
CREATE TYPE budget_alert_type AS ENUM ('threshold', 'exceeded', 'approaching');
```

## Functions

### 1. `calculate_category_spent(category_id, start_date, end_date, user_id)`

Calculates total spent amount for a category within a date range.

**Parameters:**
- `p_category_id` (UUID): Category to calculate
- `p_start_date` (DATE): Period start
- `p_end_date` (DATE): Period end
- `p_user_id` (UUID): User ID

**Returns:** `DECIMAL(15, 2)` - Total spent amount

**Logic:**
1. Sums all expense transactions with matching category
2. Adds transaction splits with matching category
3. Only includes transactions within date range

**Example:**
```sql
SELECT calculate_category_spent(
  'category-uuid',
  '2025-01-01',
  '2025-01-31',
  'user-uuid'
);
-- Returns: 450.75
```

### 2. `update_budget_spent_amounts(budget_id)`

Refreshes spent amounts for all categories in a budget.

**Parameters:**
- `p_budget_id` (UUID): Budget to update

**Returns:** `void`

**Logic:**
1. Retrieves budget details (dates, user)
2. Loops through all budget categories
3. Calls `calculate_category_spent` for each
4. Updates `spent_amount` column
5. Sets `updated_at` timestamp

**Usage:**
```sql
-- Manually refresh a budget
SELECT update_budget_spent_amounts('budget-uuid');
```

### 3. `check_and_create_budget_alerts(budget_id)`

Checks budget status and creates alerts if thresholds are met.

**Parameters:**
- `p_budget_id` (UUID): Budget to check

**Returns:** `void`

**Logic:**
1. Gets active budget details
2. For each budget category:
   - Calculates percentage spent
   - Checks if exceeded (≥100%)
   - Checks if threshold reached (≥80% by default)
   - Checks if approaching (≥70% of threshold)
3. Creates alert if threshold met and no recent alert exists (24hr)

**Alert Deduplication:**
- Only creates one alert per type per category per 24 hours
- Prevents spam from frequent transaction updates

**Example Alerts:**
- "Budget exceeded for Groceries: $520.00 of $500.00 spent (104.0%)"
- "Budget threshold reached for Entertainment: $80.00 of $100.00 spent (80.0%)"
- "Budget approaching for Transportation: $56.00 of $100.00 spent (56.0%)"

### 4. `refresh_active_budgets(user_id)`

Refreshes all active budgets for a user.

**Parameters:**
- `p_user_id` (UUID): User ID

**Returns:** `void`

**Usage:**
```sql
-- Refresh all user's budgets
SELECT refresh_active_budgets('user-uuid');
```

## Triggers

### 1. `trigger_update_budgets()`

**Attached to:** `transactions` table
**Events:** INSERT, UPDATE, DELETE
**Timing:** AFTER

**Logic:**
1. Only processes expense transactions
2. Finds all active budgets that cover the transaction date
3. Updates spent amounts for affected budgets
4. Checks and creates alerts

**Performance:**
- Uses indexes on date ranges and categories
- Only updates budgets that are actually affected
- Runs asynchronously after transaction commit

### 2. `trigger_update_budgets_splits()`

**Attached to:** `transaction_splits` table
**Events:** INSERT, UPDATE, DELETE
**Timing:** AFTER

**Logic:**
1. Gets parent transaction details
2. Finds budgets covering the transaction date
3. Updates budgets affected by the split category
4. Creates alerts if needed

### 3. `update_updated_at_column()`

**Attached to:** `budgets`, `budget_categories`
**Events:** UPDATE
**Timing:** BEFORE

Updates the `updated_at` timestamp on row modification.

## Views

### 1. `budget_summary`

Aggregate view of budget status.

**Columns:**
- `budget_id`, `user_id`, `name`, `period_type`
- `start_date`, `end_date`, `is_active`
- `total_amount`: Total budget
- `total_allocated`: Sum of category allocations
- `total_spent`: Sum of spent amounts
- `unallocated`: Amount not allocated to categories
- `spent_percentage`: Overall spending percentage
- `category_count`: Number of categories
- `over_budget_count`: Number of categories over budget

**Usage:**
```sql
SELECT * FROM budget_summary 
WHERE user_id = 'user-uuid' 
AND is_active = true;
```

### 2. `budget_category_performance`

Category-level performance metrics.

**Columns:**
- `id`, `budget_id`, `user_id`
- `budget_name`, `category_name`, `category_icon`, `category_color`
- `allocated_amount`, `spent_amount`, `remaining`
- `spent_percentage`
- `status`: exceeded, warning, on_track, good

**Status Thresholds:**
- `good`: <50% spent
- `on_track`: 50-79% spent
- `warning`: 80-99% spent
- `exceeded`: ≥100% spent

**Usage:**
```sql
SELECT * FROM budget_category_performance
WHERE budget_id = 'budget-uuid'
ORDER BY spent_percentage DESC;
```

## Row Level Security (RLS)

All tables have RLS enabled with user-scoped policies:

**Budgets:**
- Users can only view/edit/delete their own budgets
- Based on `user_id` column

**Budget Categories:**
- Users can access categories for their budgets
- Checks budget ownership via subquery

**Budget Alerts:**
- Users can view/mark read/delete their alerts
- Checks budget ownership via subquery

## Indexes

Performance indexes created on:
- `budgets`: user_id, active status, date ranges, period type
- `budget_categories`: budget_id, category_id, spent amounts
- `budget_alerts`: budget_id, unread status, created_at

## Usage Examples

### Create a Monthly Budget

```sql
-- Create budget
INSERT INTO budgets (user_id, name, period_type, start_date, end_date, total_amount)
VALUES (
  'user-uuid',
  'January 2025 Budget',
  'monthly',
  '2025-01-01',
  '2025-01-31',
  3000.00
)
RETURNING id;

-- Allocate to categories
INSERT INTO budget_categories (budget_id, category_id, allocated_amount)
VALUES
  ('budget-uuid', 'groceries-category', 500.00),
  ('budget-uuid', 'entertainment-category', 200.00),
  ('budget-uuid', 'transportation-category', 300.00);
```

### Check Budget Status

```sql
-- Overall summary
SELECT * FROM budget_summary WHERE budget_id = 'budget-uuid';

-- Category breakdown
SELECT 
  category_name,
  allocated_amount,
  spent_amount,
  remaining,
  spent_percentage,
  status
FROM budget_category_performance
WHERE budget_id = 'budget-uuid'
ORDER BY spent_percentage DESC;
```

### Get Unread Alerts

```sql
SELECT 
  ba.alert_type,
  ba.message,
  ba.created_at,
  b.name as budget_name
FROM budget_alerts ba
JOIN budgets b ON b.id = ba.budget_id
WHERE b.user_id = 'user-uuid'
  AND ba.is_read = false
ORDER BY ba.created_at DESC;
```

### Mark Alert as Read

```sql
UPDATE budget_alerts
SET is_read = true
WHERE id = 'alert-uuid';
```

### Manually Refresh Budget

```sql
-- Refresh single budget
SELECT update_budget_spent_amounts('budget-uuid');
SELECT check_and_create_budget_alerts('budget-uuid');

-- Refresh all user's budgets
SELECT refresh_active_budgets('user-uuid');
```

## Automatic Updates

The system automatically:

1. **Updates spent amounts** when transactions are added/modified/deleted
2. **Creates alerts** when thresholds are crossed
3. **Maintains timestamps** on all modifications
4. **Prevents duplicate alerts** within 24-hour windows

## Best Practices

### 1. Budget Setup
- Set realistic `alert_threshold` (default 80% works well)
- Enable `rollover_enabled` for flexible budgeting
- Use descriptive names with dates

### 2. Category Allocation
- Allocate all or most of total budget to categories
- Leave some unallocated for flexibility
- Use notes to document category purposes

### 3. Alert Management
- Check unread alerts regularly
- Mark as read after taking action
- Use alert history to identify spending patterns

### 4. Performance
- Budgets auto-update via triggers (no manual refresh needed)
- Use views for reporting (pre-aggregated)
- Limit active budgets per period (one is usually sufficient)

### 5. Data Integrity
- Don't manually modify `spent_amount` (auto-calculated)
- Ensure transactions have proper dates
- Keep budgets within reasonable date ranges

## Migration Notes

**Prerequisites:**
- `auth.users` table must exist
- `categories` table must exist
- `transactions` table must exist
- `transaction_splits` table must exist

**Migration Order:**
1. Run categories migration first
2. Run transactions migration second
3. Run budgets migration third

**Post-Migration:**
- All triggers are automatically active
- Existing transactions will be included in budget calculations
- No data migration needed

## Future Enhancements

Potential additions:
1. Budget templates (monthly templates to copy)
2. Budget goals (savings targets)
3. Budget sharing (household budgets)
4. Budget forecasting (predict future spending)
5. Budget comparison (month-over-month)
6. Custom alert rules
7. Budget rollover automation
8. Budget approval workflows
9. Budget reports export (PDF, CSV)
10. Budget visualization widgets
