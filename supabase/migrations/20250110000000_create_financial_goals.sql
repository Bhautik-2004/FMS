-- =====================================================
-- FINANCIAL GOALS SYSTEM
-- =====================================================
-- This migration creates tables and functions for managing
-- financial goals with automatic tracking and progress monitoring
-- =====================================================

-- Create enum types for financial goals
DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM (
    'savings',
    'debt_payoff',
    'net_worth',
    'investment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contribution_type AS ENUM (
    'manual',
    'automatic',
    'transaction'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- FINANCIAL GOALS TABLE
-- =====================================================
-- Stores user financial goals and targets
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Goal details
  name TEXT NOT NULL,
  goal_type goal_type NOT NULL DEFAULT 'savings',
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Timeline
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  
  -- Linked resources
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Visual customization
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  priority INTEGER DEFAULT 1 CHECK (priority > 0),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (target_date >= start_date),
  CONSTRAINT valid_current_amount CHECK (current_amount <= target_amount OR goal_type = 'debt_payoff')
);

-- Create indexes for financial_goals
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_financial_goals_active ON financial_goals(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_financial_goals_category ON financial_goals(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_account ON financial_goals(account_id);

-- =====================================================
-- GOAL CONTRIBUTIONS TABLE
-- =====================================================
-- Tracks individual contributions to goals
-- =====================================================

CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Contribution details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount != 0),
  type contribution_type NOT NULL DEFAULT 'manual',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for goal_contributions
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_transaction_id ON goal_contributions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(date DESC);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_type ON goal_contributions(type);

-- =====================================================
-- GOAL MILESTONES TABLE
-- =====================================================
-- Tracks milestone achievements for goals
-- =====================================================

CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  
  -- Milestone details
  name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  is_achieved BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_date DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_achievement CHECK (
    (is_achieved = FALSE AND achieved_date IS NULL) OR
    (is_achieved = TRUE AND achieved_date IS NOT NULL)
  )
);

-- Create indexes for goal_milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_achieved ON goal_milestones(goal_id, is_achieved);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_financial_goals_updated_at ON financial_goals;
CREATE TRIGGER trigger_update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_goals_updated_at();

DROP TRIGGER IF EXISTS trigger_update_goal_contributions_updated_at ON goal_contributions;
CREATE TRIGGER trigger_update_goal_contributions_updated_at
  BEFORE UPDATE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_goals_updated_at();

DROP TRIGGER IF EXISTS trigger_update_goal_milestones_updated_at ON goal_milestones;
CREATE TRIGGER trigger_update_goal_milestones_updated_at
  BEFORE UPDATE ON goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_goals_updated_at();

-- =====================================================
-- TRIGGER: Update goal current_amount on contribution
-- =====================================================

CREATE OR REPLACE FUNCTION update_goal_amount_on_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_goal RECORD;
BEGIN
  -- Get the goal details
  SELECT * INTO v_goal FROM financial_goals WHERE id = NEW.goal_id;
  
  IF TG_OP = 'INSERT' THEN
    -- Add contribution to current amount
    UPDATE financial_goals
    SET 
      current_amount = current_amount + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.goal_id;
    
    -- Check if goal is completed
    IF v_goal.current_amount + NEW.amount >= v_goal.target_amount THEN
      UPDATE financial_goals
      SET completed_at = NOW()
      WHERE id = NEW.goal_id AND completed_at IS NULL;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust amount based on difference
    UPDATE financial_goals
    SET 
      current_amount = current_amount - OLD.amount + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.goal_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract contribution from current amount
    UPDATE financial_goals
    SET 
      current_amount = current_amount - OLD.amount,
      updated_at = NOW(),
      completed_at = NULL
    WHERE id = OLD.goal_id;
    
    RETURN OLD;
  END IF;
  
  -- Check and update milestones
  PERFORM check_goal_milestones(NEW.goal_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
  AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_amount_on_contribution();

-- =====================================================
-- FUNCTION: Calculate goal progress
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_goal_progress(p_goal_id UUID)
RETURNS TABLE (
  goal_id UUID,
  target_amount DECIMAL,
  current_amount DECIMAL,
  progress_percentage DECIMAL,
  remaining_amount DECIMAL,
  is_completed BOOLEAN,
  days_remaining INTEGER,
  days_elapsed INTEGER,
  total_days INTEGER,
  average_daily_progress DECIMAL,
  on_track BOOLEAN
) AS $$
DECLARE
  v_goal RECORD;
  v_days_remaining INTEGER;
  v_days_elapsed INTEGER;
  v_total_days INTEGER;
  v_progress_pct DECIMAL;
  v_required_daily DECIMAL;
  v_actual_daily DECIMAL;
BEGIN
  -- Get goal details
  SELECT * INTO v_goal FROM financial_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', p_goal_id;
  END IF;
  
  -- Calculate time metrics
  v_days_remaining := v_goal.target_date - CURRENT_DATE;
  v_days_elapsed := CURRENT_DATE - v_goal.start_date;
  v_total_days := v_goal.target_date - v_goal.start_date;
  
  -- Calculate progress percentage
  IF v_goal.target_amount > 0 THEN
    v_progress_pct := (v_goal.current_amount / v_goal.target_amount * 100)::DECIMAL(5,2);
  ELSE
    v_progress_pct := 0;
  END IF;
  
  -- Calculate daily progress rates
  IF v_days_elapsed > 0 THEN
    v_actual_daily := v_goal.current_amount / v_days_elapsed;
  ELSE
    v_actual_daily := 0;
  END IF;
  
  IF v_days_remaining > 0 THEN
    v_required_daily := (v_goal.target_amount - v_goal.current_amount) / v_days_remaining;
  ELSE
    v_required_daily := 0;
  END IF;
  
  RETURN QUERY SELECT
    v_goal.id,
    v_goal.target_amount,
    v_goal.current_amount,
    v_progress_pct,
    (v_goal.target_amount - v_goal.current_amount)::DECIMAL,
    v_goal.current_amount >= v_goal.target_amount,
    v_days_remaining,
    v_days_elapsed,
    v_total_days,
    v_actual_daily,
    CASE 
      WHEN v_days_elapsed = 0 THEN TRUE
      WHEN v_actual_daily >= v_required_daily THEN TRUE
      ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Project goal completion date
-- =====================================================

CREATE OR REPLACE FUNCTION project_goal_completion_date(
  p_goal_id UUID,
  p_projection_method TEXT DEFAULT 'current_rate'
)
RETURNS TABLE (
  projected_date DATE,
  days_until_completion INTEGER,
  confidence_level TEXT,
  based_on TEXT
) AS $$
DECLARE
  v_goal RECORD;
  v_days_elapsed INTEGER;
  v_daily_rate DECIMAL;
  v_remaining_amount DECIMAL;
  v_days_needed INTEGER;
  v_projected_date DATE;
  v_recent_contributions DECIMAL;
  v_recent_days INTEGER := 30;
BEGIN
  -- Get goal details
  SELECT * INTO v_goal FROM financial_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', p_goal_id;
  END IF;
  
  -- Check if already completed
  IF v_goal.current_amount >= v_goal.target_amount THEN
    RETURN QUERY SELECT
      CURRENT_DATE,
      0,
      'high'::TEXT,
      'already_completed'::TEXT;
    RETURN;
  END IF;
  
  v_remaining_amount := v_goal.target_amount - v_goal.current_amount;
  v_days_elapsed := CURRENT_DATE - v_goal.start_date;
  
  -- Calculate projection based on method
  IF p_projection_method = 'current_rate' THEN
    -- Use overall average rate
    IF v_days_elapsed > 0 AND v_goal.current_amount > 0 THEN
      v_daily_rate := v_goal.current_amount / v_days_elapsed;
      v_days_needed := CEIL(v_remaining_amount / v_daily_rate)::INTEGER;
      v_projected_date := CURRENT_DATE + v_days_needed;
      
      RETURN QUERY SELECT
        v_projected_date,
        v_days_needed,
        CASE 
          WHEN v_days_elapsed >= 90 THEN 'high'
          WHEN v_days_elapsed >= 30 THEN 'medium'
          ELSE 'low'
        END::TEXT,
        'overall_average'::TEXT;
    ELSE
      RETURN QUERY SELECT
        v_goal.target_date,
        (v_goal.target_date - CURRENT_DATE)::INTEGER,
        'low'::TEXT,
        'insufficient_data'::TEXT;
    END IF;
    
  ELSIF p_projection_method = 'recent_rate' THEN
    -- Use recent 30-day average
    SELECT COALESCE(SUM(amount), 0)
    INTO v_recent_contributions
    FROM goal_contributions
    WHERE goal_id = p_goal_id
      AND date >= CURRENT_DATE - v_recent_days
      AND amount > 0;
    
    IF v_recent_contributions > 0 THEN
      v_daily_rate := v_recent_contributions / v_recent_days;
      v_days_needed := CEIL(v_remaining_amount / v_daily_rate)::INTEGER;
      v_projected_date := CURRENT_DATE + v_days_needed;
      
      RETURN QUERY SELECT
        v_projected_date,
        v_days_needed,
        'medium'::TEXT,
        'recent_30_days'::TEXT;
    ELSE
      RETURN QUERY SELECT
        v_goal.target_date,
        (v_goal.target_date - CURRENT_DATE)::INTEGER,
        'low'::TEXT,
        'no_recent_activity'::TEXT;
    END IF;
    
  ELSIF p_projection_method = 'target_based' THEN
    -- Use target date to calculate required rate
    RETURN QUERY SELECT
      v_goal.target_date,
      (v_goal.target_date - CURRENT_DATE)::INTEGER,
      'medium'::TEXT,
      'target_date'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Suggest monthly contribution
-- =====================================================

CREATE OR REPLACE FUNCTION suggest_monthly_contribution(p_goal_id UUID)
RETURNS TABLE (
  required_monthly DECIMAL,
  recommended_monthly DECIMAL,
  current_monthly_avg DECIMAL,
  months_remaining DECIMAL,
  suggested_adjustment DECIMAL,
  is_achievable BOOLEAN,
  notes TEXT
) AS $$
DECLARE
  v_goal RECORD;
  v_remaining_amount DECIMAL;
  v_months_remaining DECIMAL;
  v_required_monthly DECIMAL;
  v_current_avg DECIMAL;
  v_recent_contributions DECIMAL;
  v_buffer_multiplier DECIMAL := 1.1; -- 10% buffer
BEGIN
  -- Get goal details
  SELECT * INTO v_goal FROM financial_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', p_goal_id;
  END IF;
  
  -- Calculate remaining amount and time
  v_remaining_amount := v_goal.target_amount - v_goal.current_amount;
  v_months_remaining := (v_goal.target_date - CURRENT_DATE) / 30.0;
  
  -- Calculate required monthly contribution
  IF v_months_remaining > 0 THEN
    v_required_monthly := v_remaining_amount / v_months_remaining;
  ELSE
    v_required_monthly := v_remaining_amount;
  END IF;
  
  -- Calculate current monthly average (last 90 days)
  SELECT COALESCE(SUM(amount) / 3.0, 0)
  INTO v_current_avg
  FROM goal_contributions
  WHERE goal_id = p_goal_id
    AND date >= CURRENT_DATE - 90
    AND amount > 0;
  
  -- Calculate recent contributions (last 30 days)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_recent_contributions
  FROM goal_contributions
  WHERE goal_id = p_goal_id
    AND date >= CURRENT_DATE - 30
    AND amount > 0;
  
  RETURN QUERY SELECT
    v_required_monthly::DECIMAL(15,2),
    (v_required_monthly * v_buffer_multiplier)::DECIMAL(15,2),
    v_current_avg::DECIMAL(15,2),
    v_months_remaining::DECIMAL(10,2),
    (v_required_monthly - v_current_avg)::DECIMAL(15,2),
    CASE 
      WHEN v_months_remaining <= 0 THEN FALSE
      WHEN v_required_monthly <= 0 THEN TRUE
      WHEN v_current_avg > 0 AND v_current_avg >= v_required_monthly * 0.8 THEN TRUE
      WHEN v_recent_contributions > v_required_monthly * 0.8 THEN TRUE
      ELSE FALSE
    END,
    CASE
      WHEN v_months_remaining <= 0 THEN 'Goal deadline has passed. Consider extending target date.'
      WHEN v_remaining_amount <= 0 THEN 'Goal already achieved!'
      WHEN v_current_avg >= v_required_monthly THEN 'On track! Current pace will meet goal.'
      WHEN v_current_avg >= v_required_monthly * 0.8 THEN 'Nearly on track. Small increase recommended.'
      WHEN v_current_avg > 0 THEN 'Significant increase needed to meet goal on time.'
      ELSE 'No contributions yet. Start contributing to reach goal.'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check and update goal milestones
-- =====================================================

CREATE OR REPLACE FUNCTION check_goal_milestones(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_milestone RECORD;
  v_current_amount DECIMAL;
BEGIN
  -- Get current goal amount
  SELECT current_amount INTO v_current_amount
  FROM financial_goals
  WHERE id = p_goal_id;
  
  -- Check all unachieved milestones
  FOR v_milestone IN
    SELECT * FROM goal_milestones
    WHERE goal_id = p_goal_id
      AND is_achieved = FALSE
      AND target_amount <= v_current_amount
  LOOP
    -- Mark milestone as achieved
    UPDATE goal_milestones
    SET 
      is_achieved = TRUE,
      achieved_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = v_milestone.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get user goals summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_goals_summary(p_user_id UUID)
RETURNS TABLE (
  total_goals INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  total_target_amount DECIMAL,
  total_current_amount DECIMAL,
  overall_progress DECIMAL,
  on_track_goals INTEGER,
  behind_schedule_goals INTEGER,
  total_contributions_30d DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE is_active = TRUE)::INTEGER,
    COUNT(*) FILTER (WHERE current_amount >= target_amount)::INTEGER,
    COALESCE(SUM(target_amount), 0)::DECIMAL,
    COALESCE(SUM(current_amount), 0)::DECIMAL,
    CASE 
      WHEN SUM(target_amount) > 0 THEN (SUM(current_amount) / SUM(target_amount) * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL
    END,
    COUNT(*) FILTER (WHERE 
      is_active = TRUE AND
      current_amount::DECIMAL / NULLIF(target_amount, 0) >= 
      (CURRENT_DATE - start_date)::DECIMAL / NULLIF((target_date - start_date), 0)
    )::INTEGER,
    COUNT(*) FILTER (WHERE 
      is_active = TRUE AND
      current_amount::DECIMAL / NULLIF(target_amount, 0) < 
      (CURRENT_DATE - start_date)::DECIMAL / NULLIF((target_date - start_date), 0)
    )::INTEGER,
    COALESCE((
      SELECT SUM(gc.amount)
      FROM goal_contributions gc
      INNER JOIN financial_goals fg ON fg.id = gc.goal_id
      WHERE fg.user_id = p_user_id
        AND gc.date >= CURRENT_DATE - 30
    ), 0)::DECIMAL
  FROM financial_goals
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Auto-create standard milestones
-- =====================================================

CREATE OR REPLACE FUNCTION create_standard_milestones(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_target_amount DECIMAL;
BEGIN
  -- Get target amount
  SELECT target_amount INTO v_target_amount
  FROM financial_goals
  WHERE id = p_goal_id;
  
  -- Create 25%, 50%, 75%, and 100% milestones
  INSERT INTO goal_milestones (goal_id, name, target_amount)
  VALUES
    (p_goal_id, '25% Complete', v_target_amount * 0.25),
    (p_goal_id, '50% Complete', v_target_amount * 0.50),
    (p_goal_id, '75% Complete', v_target_amount * 0.75),
    (p_goal_id, '100% Complete', v_target_amount);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- Policies for financial_goals
DROP POLICY IF EXISTS "Users can view their own goals" ON financial_goals;
CREATE POLICY "Users can view their own goals"
  ON financial_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON financial_goals;
CREATE POLICY "Users can insert their own goals"
  ON financial_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON financial_goals;
CREATE POLICY "Users can update their own goals"
  ON financial_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON financial_goals;
CREATE POLICY "Users can delete their own goals"
  ON financial_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for goal_contributions
DROP POLICY IF EXISTS "Users can view their own goal contributions" ON goal_contributions;
CREATE POLICY "Users can view their own goal contributions"
  ON goal_contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own goal contributions" ON goal_contributions;
CREATE POLICY "Users can insert their own goal contributions"
  ON goal_contributions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own goal contributions" ON goal_contributions;
CREATE POLICY "Users can update their own goal contributions"
  ON goal_contributions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own goal contributions" ON goal_contributions;
CREATE POLICY "Users can delete their own goal contributions"
  ON goal_contributions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
        AND fg.user_id = auth.uid()
    )
  );

-- Policies for goal_milestones
DROP POLICY IF EXISTS "Users can view their own goal milestones" ON goal_milestones;
CREATE POLICY "Users can view their own goal milestones"
  ON goal_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_milestones.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own goal milestones" ON goal_milestones;
CREATE POLICY "Users can insert their own goal milestones"
  ON goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_milestones.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own goal milestones" ON goal_milestones;
CREATE POLICY "Users can update their own goal milestones"
  ON goal_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_milestones.goal_id
        AND fg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own goal milestones" ON goal_milestones;
CREATE POLICY "Users can delete their own goal milestones"
  ON goal_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_goals fg
      WHERE fg.id = goal_milestones.goal_id
        AND fg.user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE financial_goals IS 'Stores user financial goals and savings targets';
COMMENT ON TABLE goal_contributions IS 'Tracks individual contributions toward goals';
COMMENT ON TABLE goal_milestones IS 'Defines and tracks milestone achievements for goals';
COMMENT ON FUNCTION calculate_goal_progress IS 'Calculates comprehensive progress metrics for a goal';
COMMENT ON FUNCTION project_goal_completion_date IS 'Projects when a goal will be completed based on contribution patterns';
COMMENT ON FUNCTION suggest_monthly_contribution IS 'Suggests required and recommended monthly contributions to meet goal';
COMMENT ON FUNCTION check_goal_milestones IS 'Checks and updates milestone achievement status';
COMMENT ON FUNCTION get_user_goals_summary IS 'Returns aggregate summary of all user goals';
COMMENT ON FUNCTION create_standard_milestones IS 'Creates 25%, 50%, 75%, 100% milestones for a goal';
