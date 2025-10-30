-- =============================================
-- Budget System Migration
-- =============================================
-- Creates tables, functions, triggers for budget management
-- with automatic tracking, alerts, and rollover support

-- Create enum for budget period types
CREATE TYPE budget_period_type AS ENUM (
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);

-- Create enum for budget alert types
CREATE TYPE budget_alert_type AS ENUM (
  'threshold',      -- Reached alert threshold (e.g., 80%)
  'exceeded',       -- Budget exceeded (over 100%)
  'approaching'     -- Approaching threshold (e.g., 70%)
);

-- =============================================
-- Main Budgets Table
-- =============================================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_type budget_period_type NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount >= 0),
  rollover_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  
  -- Unique active budget per period for user
  CONSTRAINT unique_active_budget UNIQUE (user_id, period_type, start_date, is_active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- =============================================
-- Budget Categories Table
-- =============================================
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount >= 0),
  spent_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  rollover_from_previous DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One category per budget
  CONSTRAINT unique_category_per_budget UNIQUE (budget_id, category_id)
);

-- =============================================
-- Budget Alerts Table
-- =============================================
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  alert_type budget_alert_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for querying unread alerts
  CONSTRAINT unread_alert_idx CHECK (is_read IN (true, false))
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Budgets indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_active ON budgets(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_budgets_date_range ON budgets(start_date, end_date);
CREATE INDEX idx_budgets_period_type ON budgets(period_type);

-- Budget categories indexes
CREATE INDEX idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX idx_budget_categories_category_id ON budget_categories(category_id);
CREATE INDEX idx_budget_categories_spent ON budget_categories(spent_amount, allocated_amount);

-- Budget alerts indexes
CREATE INDEX idx_budget_alerts_budget_id ON budget_alerts(budget_id);
CREATE INDEX idx_budget_alerts_unread ON budget_alerts(budget_id, is_read) WHERE is_read = false;
CREATE INDEX idx_budget_alerts_created_at ON budget_alerts(created_at DESC);

-- =============================================
-- Function: Calculate Spent Amount for Category
-- =============================================
CREATE OR REPLACE FUNCTION calculate_category_spent(
  p_category_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID
)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total DECIMAL(15, 2);
BEGIN
  -- Sum transactions for the category in the date range
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.category_id = p_category_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;
  
  -- Add transaction splits for the category
  SELECT v_total + COALESCE(SUM(ts.amount), 0)
  INTO v_total
  FROM transaction_splits ts
  JOIN transactions t ON ts.transaction_id = t.id
  WHERE t.user_id = p_user_id
    AND ts.category_id = p_category_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;
  
  RETURN v_total;
END;
$$;

-- =============================================
-- Function: Update Budget Spent Amounts
-- =============================================
CREATE OR REPLACE FUNCTION update_budget_spent_amounts(
  p_budget_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget RECORD;
  v_category RECORD;
  v_spent DECIMAL(15, 2);
BEGIN
  -- Get budget details
  SELECT * INTO v_budget
  FROM budgets
  WHERE id = p_budget_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Update spent amount for each category in the budget
  FOR v_category IN 
    SELECT * FROM budget_categories WHERE budget_id = p_budget_id
  LOOP
    -- Calculate spent amount
    v_spent := calculate_category_spent(
      v_category.category_id,
      v_budget.start_date,
      v_budget.end_date,
      v_budget.user_id
    );
    
    -- Update the spent amount
    UPDATE budget_categories
    SET spent_amount = v_spent,
        updated_at = NOW()
    WHERE id = v_category.id;
  END LOOP;
END;
$$;

-- =============================================
-- Function: Check and Create Budget Alerts
-- =============================================
CREATE OR REPLACE FUNCTION check_and_create_budget_alerts(
  p_budget_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget RECORD;
  v_category RECORD;
  v_percentage DECIMAL(5, 2);
  v_alert_exists BOOLEAN;
BEGIN
  -- Get budget details
  SELECT * INTO v_budget
  FROM budgets
  WHERE id = p_budget_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check each budget category
  FOR v_category IN 
    SELECT bc.*, c.name as category_name
    FROM budget_categories bc
    JOIN categories c ON bc.category_id = c.id
    WHERE bc.budget_id = p_budget_id
  LOOP
    -- Skip if no allocated amount
    IF v_category.allocated_amount = 0 THEN
      CONTINUE;
    END IF;
    
    -- Calculate percentage spent
    v_percentage := (v_category.spent_amount / v_category.allocated_amount) * 100;
    
    -- Check if budget exceeded (over 100%)
    IF v_percentage >= 100 THEN
      -- Check if alert already exists
      SELECT EXISTS(
        SELECT 1 FROM budget_alerts
        WHERE budget_id = p_budget_id
          AND budget_category_id = v_category.id
          AND alert_type = 'exceeded'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) INTO v_alert_exists;
      
      IF NOT v_alert_exists THEN
        INSERT INTO budget_alerts (budget_id, budget_category_id, alert_type, message)
        VALUES (
          p_budget_id,
          v_category.id,
          'exceeded',
          format('Budget exceeded for %s: $%s of $%s spent (%.1f%%)',
            v_category.category_name,
            v_category.spent_amount,
            v_category.allocated_amount,
            v_percentage
          )
        );
      END IF;
    
    -- Check if reached alert threshold
    ELSIF v_percentage >= v_budget.alert_threshold THEN
      SELECT EXISTS(
        SELECT 1 FROM budget_alerts
        WHERE budget_id = p_budget_id
          AND budget_category_id = v_category.id
          AND alert_type = 'threshold'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) INTO v_alert_exists;
      
      IF NOT v_alert_exists THEN
        INSERT INTO budget_alerts (budget_id, budget_category_id, alert_type, message)
        VALUES (
          p_budget_id,
          v_category.id,
          'threshold',
          format('Budget threshold reached for %s: $%s of $%s spent (%.1f%%)',
            v_category.category_name,
            v_category.spent_amount,
            v_category.allocated_amount,
            v_percentage
          )
        );
      END IF;
    
    -- Check if approaching (70% of threshold)
    ELSIF v_percentage >= (v_budget.alert_threshold * 0.7) THEN
      SELECT EXISTS(
        SELECT 1 FROM budget_alerts
        WHERE budget_id = p_budget_id
          AND budget_category_id = v_category.id
          AND alert_type = 'approaching'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) INTO v_alert_exists;
      
      IF NOT v_alert_exists THEN
        INSERT INTO budget_alerts (budget_id, budget_category_id, alert_type, message)
        VALUES (
          p_budget_id,
          v_category.id,
          'approaching',
          format('Budget approaching for %s: $%s of $%s spent (%.1f%%)',
            v_category.category_name,
            v_category.spent_amount,
            v_category.allocated_amount,
            v_percentage
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- Function: Refresh All Active Budgets
-- =============================================
CREATE OR REPLACE FUNCTION refresh_active_budgets(
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget RECORD;
BEGIN
  -- Update all active budgets for the user
  FOR v_budget IN 
    SELECT id FROM budgets 
    WHERE user_id = p_user_id 
      AND is_active = true
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
  LOOP
    PERFORM update_budget_spent_amounts(v_budget.id);
    PERFORM check_and_create_budget_alerts(v_budget.id);
  END LOOP;
END;
$$;

-- =============================================
-- Trigger: Update Budget on Transaction Change
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_budgets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  -- For INSERT and UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Only process expense transactions
    IF NEW.type = 'expense' THEN
      -- Find active budgets that cover this transaction date
      FOR v_budget_id IN
        SELECT b.id
        FROM budgets b
        JOIN budget_categories bc ON bc.budget_id = b.id
        WHERE b.user_id = NEW.user_id
          AND b.is_active = true
          AND NEW.date >= b.start_date
          AND NEW.date <= b.end_date
          AND (bc.category_id = NEW.category_id OR NEW.category_id IS NULL)
      LOOP
        PERFORM update_budget_spent_amounts(v_budget_id);
        PERFORM check_and_create_budget_alerts(v_budget_id);
      END LOOP;
    END IF;
  END IF;
  
  -- For DELETE and UPDATE operations, handle OLD values
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.type = 'expense' THEN
      FOR v_budget_id IN
        SELECT b.id
        FROM budgets b
        JOIN budget_categories bc ON bc.budget_id = b.id
        WHERE b.user_id = OLD.user_id
          AND b.is_active = true
          AND OLD.date >= b.start_date
          AND OLD.date <= b.end_date
          AND (bc.category_id = OLD.category_id OR OLD.category_id IS NULL)
      LOOP
        PERFORM update_budget_spent_amounts(v_budget_id);
        PERFORM check_and_create_budget_alerts(v_budget_id);
      END LOOP;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to transactions table
CREATE TRIGGER transactions_budget_update
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_budgets();

-- =============================================
-- Trigger: Update Budget on Transaction Split Change
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_budgets_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction RECORD;
  v_budget_id UUID;
BEGIN
  -- Get the parent transaction
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = NEW.transaction_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = OLD.transaction_id;
  END IF;
  
  IF NOT FOUND OR v_transaction.type != 'expense' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Find and update affected budgets
  FOR v_budget_id IN
    SELECT DISTINCT b.id
    FROM budgets b
    JOIN budget_categories bc ON bc.budget_id = b.id
    WHERE b.user_id = v_transaction.user_id
      AND b.is_active = true
      AND v_transaction.date >= b.start_date
      AND v_transaction.date <= b.end_date
      AND (
        bc.category_id = COALESCE(NEW.category_id, OLD.category_id)
        OR bc.category_id = v_transaction.category_id
      )
  LOOP
    PERFORM update_budget_spent_amounts(v_budget_id);
    PERFORM check_and_create_budget_alerts(v_budget_id);
  END LOOP;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to transaction_splits table
CREATE TRIGGER transaction_splits_budget_update
  AFTER INSERT OR UPDATE OR DELETE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_budgets_splits();

-- =============================================
-- Trigger: Update timestamps
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Budget categories policies
CREATE POLICY "Users can view budget categories for their budgets"
  ON budget_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_categories.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budget categories for their budgets"
  ON budget_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_categories.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budget categories for their budgets"
  ON budget_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_categories.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budget categories for their budgets"
  ON budget_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_categories.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

-- Budget alerts policies
CREATE POLICY "Users can view alerts for their budgets"
  ON budget_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_alerts.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their budget alerts"
  ON budget_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_alerts.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their budget alerts"
  ON budget_alerts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets
      WHERE budgets.id = budget_alerts.budget_id
        AND budgets.user_id = auth.uid()
    )
  );

-- =============================================
-- Helper Views
-- =============================================

-- Budget summary view
CREATE OR REPLACE VIEW budget_summary AS
SELECT 
  b.id as budget_id,
  b.user_id,
  b.name,
  b.period_type,
  b.start_date,
  b.end_date,
  b.total_amount,
  b.is_active,
  COALESCE(SUM(bc.allocated_amount), 0) as total_allocated,
  COALESCE(SUM(bc.spent_amount), 0) as total_spent,
  b.total_amount - COALESCE(SUM(bc.allocated_amount), 0) as unallocated,
  CASE 
    WHEN b.total_amount > 0 THEN 
      (COALESCE(SUM(bc.spent_amount), 0) / b.total_amount * 100)
    ELSE 0
  END as spent_percentage,
  COUNT(DISTINCT bc.id) as category_count,
  COUNT(DISTINCT CASE WHEN bc.spent_amount > bc.allocated_amount THEN bc.id END) as over_budget_count
FROM budgets b
LEFT JOIN budget_categories bc ON bc.budget_id = b.id
GROUP BY b.id;

-- Category budget performance view
CREATE OR REPLACE VIEW budget_category_performance AS
SELECT 
  bc.id,
  bc.budget_id,
  b.user_id,
  b.name as budget_name,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  bc.allocated_amount,
  bc.spent_amount,
  bc.allocated_amount - bc.spent_amount as remaining,
  CASE 
    WHEN bc.allocated_amount > 0 THEN 
      (bc.spent_amount / bc.allocated_amount * 100)
    ELSE 0
  END as spent_percentage,
  CASE
    WHEN bc.spent_amount > bc.allocated_amount THEN 'exceeded'
    WHEN bc.spent_amount >= bc.allocated_amount * 0.8 THEN 'warning'
    WHEN bc.spent_amount >= bc.allocated_amount * 0.5 THEN 'on_track'
    ELSE 'good'
  END as status
FROM budget_categories bc
JOIN budgets b ON b.id = bc.budget_id
JOIN categories c ON c.id = bc.category_id;

-- Grant access to views
GRANT SELECT ON budget_summary TO authenticated;
GRANT SELECT ON budget_category_performance TO authenticated;

-- =============================================
-- Comments for Documentation
-- =============================================

COMMENT ON TABLE budgets IS 'User budgets with date ranges and alert settings';
COMMENT ON TABLE budget_categories IS 'Budget allocations per category with spent tracking';
COMMENT ON TABLE budget_alerts IS 'Budget threshold and exceeded alerts';
COMMENT ON FUNCTION calculate_category_spent IS 'Calculate total spent for a category in date range';
COMMENT ON FUNCTION update_budget_spent_amounts IS 'Refresh spent amounts for all categories in a budget';
COMMENT ON FUNCTION check_and_create_budget_alerts IS 'Check budget status and create alerts if needed';
COMMENT ON FUNCTION refresh_active_budgets IS 'Refresh all active budgets for a user';
