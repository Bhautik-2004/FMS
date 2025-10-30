-- =====================================================
-- RECURRING TRANSACTIONS SYSTEM
-- =====================================================
-- This migration creates tables and functions for managing
-- recurring transactions with automatic generation and tracking
-- =====================================================

-- Create enum types for recurring transactions
DO $$ BEGIN
  CREATE TYPE frequency_type AS ENUM (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE occurrence_status AS ENUM (
    'pending',
    'generated',
    'skipped',
    'modified'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- RECURRING TRANSACTIONS TABLE
-- =====================================================
-- Stores recurring transaction templates and schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Frequency configuration
  frequency frequency_type NOT NULL DEFAULT 'monthly',
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  
  -- Schedule dates
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means no end date
  occurrence_count INTEGER CHECK (occurrence_count > 0), -- NULL means indefinite
  next_occurrence_date DATE NOT NULL,
  last_generated_date DATE,
  
  -- Template data (stored as JSONB for flexibility)
  template_data JSONB NOT NULL, -- Stores amount, category_id, merchant, description, type, etc.
  
  -- Status and settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notification_days_before INTEGER NOT NULL DEFAULT 1 CHECK (notification_days_before >= 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create indexes for recurring_transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_occurrence ON recurring_transactions(next_occurrence_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_template ON recurring_transactions(template_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active ON recurring_transactions(user_id, is_active);

-- =====================================================
-- RECURRING OCCURRENCES TABLE
-- =====================================================
-- Tracks individual occurrences of recurring transactions
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_id UUID NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  generated_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Occurrence dates
  expected_date DATE NOT NULL,
  actual_date DATE,
  
  -- Status tracking
  status occurrence_status NOT NULL DEFAULT 'pending',
  amount_variance DECIMAL(12, 2) DEFAULT 0, -- Difference between expected and actual amount
  
  -- Additional metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for recurring_occurrences
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_recurring_id ON recurring_occurrences(recurring_id);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_transaction_id ON recurring_occurrences(generated_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_status ON recurring_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_expected_date ON recurring_occurrences(expected_date);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recurring_transactions_updated_at ON recurring_transactions;
CREATE TRIGGER trigger_update_recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_transactions_updated_at();

DROP TRIGGER IF EXISTS trigger_update_recurring_occurrences_updated_at ON recurring_occurrences;
CREATE TRIGGER trigger_update_recurring_occurrences_updated_at
  BEFORE UPDATE ON recurring_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- =====================================================
-- FUNCTION: Calculate next occurrence date
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_next_occurrence_date(
  p_current_date DATE,
  p_frequency frequency_type,
  p_interval INTEGER,
  p_day_of_month INTEGER DEFAULT NULL,
  p_day_of_week INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_temp_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_current_date + (p_interval * INTERVAL '1 day');
    
    WHEN 'weekly' THEN
      v_next_date := p_current_date + (p_interval * INTERVAL '1 week');
      -- Adjust to specific day of week if provided
      IF p_day_of_week IS NOT NULL THEN
        v_next_date := v_next_date + (p_day_of_week - EXTRACT(DOW FROM v_next_date))::INTEGER * INTERVAL '1 day';
      END IF;
    
    WHEN 'biweekly' THEN
      v_next_date := p_current_date + (2 * p_interval * INTERVAL '1 week');
      IF p_day_of_week IS NOT NULL THEN
        v_next_date := v_next_date + (p_day_of_week - EXTRACT(DOW FROM v_next_date))::INTEGER * INTERVAL '1 day';
      END IF;
    
    WHEN 'monthly' THEN
      v_temp_date := p_current_date + (p_interval * INTERVAL '1 month');
      -- Adjust to specific day of month if provided
      IF p_day_of_month IS NOT NULL THEN
        -- Handle end of month cases (e.g., setting day 31 in February)
        v_next_date := LEAST(
          MAKE_DATE(
            EXTRACT(YEAR FROM v_temp_date)::INTEGER,
            EXTRACT(MONTH FROM v_temp_date)::INTEGER,
            p_day_of_month
          ),
          (DATE_TRUNC('month', v_temp_date) + INTERVAL '1 month - 1 day')::DATE
        );
      ELSE
        v_next_date := v_temp_date;
      END IF;
    
    WHEN 'quarterly' THEN
      v_next_date := p_current_date + (3 * p_interval * INTERVAL '1 month');
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := LEAST(
          MAKE_DATE(
            EXTRACT(YEAR FROM v_next_date)::INTEGER,
            EXTRACT(MONTH FROM v_next_date)::INTEGER,
            p_day_of_month
          ),
          (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::DATE
        );
      END IF;
    
    WHEN 'yearly' THEN
      v_next_date := p_current_date + (p_interval * INTERVAL '1 year');
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := MAKE_DATE(
          EXTRACT(YEAR FROM v_next_date)::INTEGER,
          EXTRACT(MONTH FROM v_next_date)::INTEGER,
          p_day_of_month
        );
      END IF;
    
    WHEN 'custom' THEN
      -- Custom interval in days
      v_next_date := p_current_date + (p_interval * INTERVAL '1 day');
    
    ELSE
      v_next_date := p_current_date + INTERVAL '1 month';
  END CASE;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCTION: Generate pending recurring transactions
-- =====================================================
-- This function is called daily by the Edge Function
-- to generate transactions that are due
-- =====================================================

CREATE OR REPLACE FUNCTION generate_pending_recurring_transactions(
  p_up_to_date DATE DEFAULT CURRENT_DATE,
  p_days_ahead INTEGER DEFAULT 0
)
RETURNS TABLE (
  recurring_id UUID,
  transaction_id UUID,
  expected_date DATE,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_recurring RECORD;
  v_new_transaction_id UUID;
  v_occurrence_id UUID;
  v_target_date DATE;
  v_generated_count INTEGER;
BEGIN
  v_target_date := p_up_to_date + p_days_ahead;
  
  -- Loop through all active recurring transactions that are due
  FOR v_recurring IN
    SELECT 
      rt.*,
      rt.template_data->>'amount' as amount,
      rt.template_data->>'category_id' as category_id,
      rt.template_data->>'account_id' as account_id,
      rt.template_data->>'merchant' as merchant,
      rt.template_data->>'description' as description,
      rt.template_data->>'type' as type
    FROM recurring_transactions rt
    WHERE rt.is_active = TRUE
      AND rt.next_occurrence_date <= v_target_date
      AND (rt.end_date IS NULL OR rt.next_occurrence_date <= rt.end_date)
      AND (rt.occurrence_count IS NULL OR 
           (SELECT COUNT(*) FROM recurring_occurrences ro WHERE ro.recurring_id = rt.id AND ro.status = 'generated') < rt.occurrence_count)
  LOOP
    BEGIN
      -- Check if auto-approve is enabled
      IF v_recurring.auto_approve THEN
        -- Create the transaction directly
        INSERT INTO transactions (
          user_id,
          account_id,
          category_id,
          amount,
          merchant_name,
          description,
          type,
          date,
          is_recurring
        ) VALUES (
          v_recurring.user_id,
          (v_recurring.template_data->>'account_id')::UUID,
          (v_recurring.template_data->>'category_id')::UUID,
          (v_recurring.template_data->>'amount')::DECIMAL,
          v_recurring.template_data->>'merchant',
          v_recurring.template_data->>'description',
          v_recurring.template_data->>'type',
          v_recurring.next_occurrence_date,
          TRUE
        )
        RETURNING id INTO v_new_transaction_id;
        
        -- Create occurrence record
        INSERT INTO recurring_occurrences (
          recurring_id,
          generated_transaction_id,
          expected_date,
          actual_date,
          status,
          amount_variance
        ) VALUES (
          v_recurring.id,
          v_new_transaction_id,
          v_recurring.next_occurrence_date,
          v_recurring.next_occurrence_date,
          'generated',
          0
        )
        RETURNING id INTO v_occurrence_id;
        
        RETURN QUERY SELECT 
          v_recurring.id,
          v_new_transaction_id,
          v_recurring.next_occurrence_date,
          'generated'::TEXT,
          'Transaction generated automatically'::TEXT;
      ELSE
        -- Create pending occurrence (requires manual approval)
        INSERT INTO recurring_occurrences (
          recurring_id,
          expected_date,
          status
        ) VALUES (
          v_recurring.id,
          v_recurring.next_occurrence_date,
          'pending'
        )
        RETURNING id INTO v_occurrence_id;
        
        RETURN QUERY SELECT 
          v_recurring.id,
          NULL::UUID,
          v_recurring.next_occurrence_date,
          'pending'::TEXT,
          'Pending manual approval'::TEXT;
      END IF;
      
      -- Update recurring transaction with next occurrence date and last generated date
      UPDATE recurring_transactions
      SET 
        next_occurrence_date = calculate_next_occurrence_date(
          next_occurrence_date,
          frequency,
          interval,
          day_of_month,
          day_of_week
        ),
        last_generated_date = v_recurring.next_occurrence_date
      WHERE id = v_recurring.id;
      
      -- Check if we've reached the occurrence limit or end date
      SELECT COUNT(*) INTO v_generated_count
      FROM recurring_occurrences ro
      WHERE ro.recurring_id = v_recurring.id AND ro.status IN ('generated', 'modified');
      
      IF (v_recurring.occurrence_count IS NOT NULL AND v_generated_count >= v_recurring.occurrence_count)
         OR (v_recurring.end_date IS NOT NULL AND v_recurring.next_occurrence_date > v_recurring.end_date) THEN
        UPDATE recurring_transactions
        SET is_active = FALSE
        WHERE id = v_recurring.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 
        v_recurring.id,
        NULL::UUID,
        v_recurring.next_occurrence_date,
        'error'::TEXT,
        SQLERRM::TEXT;
      CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get upcoming recurring transactions
-- =====================================================

CREATE OR REPLACE FUNCTION get_upcoming_recurring_transactions(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  template_data JSONB,
  next_occurrence_date DATE,
  frequency frequency_type,
  amount DECIMAL,
  merchant TEXT,
  category_id UUID,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.template_data,
    rt.next_occurrence_date,
    rt.frequency,
    (rt.template_data->>'amount')::DECIMAL,
    rt.template_data->>'merchant',
    (rt.template_data->>'category_id')::UUID,
    rt.is_active
  FROM recurring_transactions rt
  WHERE rt.user_id = p_user_id
    AND rt.is_active = TRUE
    AND rt.next_occurrence_date <= CURRENT_DATE + p_days_ahead
  ORDER BY rt.next_occurrence_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get recurring transaction history
-- =====================================================

CREATE OR REPLACE FUNCTION get_recurring_transaction_history(
  p_user_id UUID,
  p_recurring_id UUID
)
RETURNS TABLE (
  id UUID,
  expected_date DATE,
  actual_date DATE,
  status occurrence_status,
  amount_variance DECIMAL,
  transaction_id UUID,
  transaction_amount DECIMAL,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.id,
    ro.expected_date,
    ro.actual_date,
    ro.status,
    ro.amount_variance,
    ro.generated_transaction_id,
    t.amount,
    ro.notes
  FROM recurring_occurrences ro
  LEFT JOIN transactions t ON t.id = ro.generated_transaction_id
  INNER JOIN recurring_transactions rt ON rt.id = ro.recurring_id
  WHERE rt.user_id = p_user_id
    AND ro.recurring_id = p_recurring_id
  ORDER BY ro.expected_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Approve pending recurring occurrence
-- =====================================================

CREATE OR REPLACE FUNCTION approve_recurring_occurrence(
  p_user_id UUID,
  p_occurrence_id UUID,
  p_actual_amount DECIMAL DEFAULT NULL,
  p_actual_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_occurrence RECORD;
  v_recurring RECORD;
  v_new_transaction_id UUID;
  v_amount DECIMAL;
  v_date DATE;
BEGIN
  -- Get occurrence and verify ownership
  SELECT ro.*, rt.user_id, rt.template_data
  INTO v_occurrence
  FROM recurring_occurrences ro
  INNER JOIN recurring_transactions rt ON rt.id = ro.recurring_id
  WHERE ro.id = p_occurrence_id
    AND rt.user_id = p_user_id
    AND ro.status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Occurrence not found or not pending';
  END IF;
  
  -- Use provided amount or template amount
  v_amount := COALESCE(p_actual_amount, (v_occurrence.template_data->>'amount')::DECIMAL);
  v_date := COALESCE(p_actual_date, v_occurrence.expected_date);
  
  -- Create transaction
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    amount,
    merchant_name,
    description,
    type,
    date,
    is_recurring
  ) VALUES (
    v_occurrence.user_id,
    (v_occurrence.template_data->>'account_id')::UUID,
    (v_occurrence.template_data->>'category_id')::UUID,
    v_amount,
    v_occurrence.template_data->>'merchant',
    v_occurrence.template_data->>'description',
    v_occurrence.template_data->>'type',
    v_date,
    TRUE
  )
  RETURNING id INTO v_new_transaction_id;
  
  -- Update occurrence
  UPDATE recurring_occurrences
  SET 
    generated_transaction_id = v_new_transaction_id,
    actual_date = v_date,
    status = CASE 
      WHEN v_amount != (v_occurrence.template_data->>'amount')::DECIMAL THEN 'modified'::occurrence_status
      ELSE 'generated'::occurrence_status
    END,
    amount_variance = v_amount - (v_occurrence.template_data->>'amount')::DECIMAL
  WHERE id = p_occurrence_id;
  
  RETURN v_new_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Skip recurring occurrence
-- =====================================================

CREATE OR REPLACE FUNCTION skip_recurring_occurrence(
  p_user_id UUID,
  p_occurrence_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_occurrence_exists BOOLEAN;
BEGIN
  -- Update occurrence status to skipped
  UPDATE recurring_occurrences ro
  SET 
    status = 'skipped',
    notes = p_reason
  FROM recurring_transactions rt
  WHERE ro.id = p_occurrence_id
    AND ro.recurring_id = rt.id
    AND rt.user_id = p_user_id
    AND ro.status = 'pending';
  
  GET DIAGNOSTICS v_occurrence_exists = ROW_COUNT;
  
  RETURN v_occurrence_exists > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get pending approvals requiring notifications
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_notifications(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id UUID,
  recurring_id UUID,
  occurrence_id UUID,
  expected_date DATE,
  days_until DATE,
  notification_days_before INTEGER,
  template_data JSONB,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.user_id,
    rt.id,
    ro.id,
    ro.expected_date,
    (ro.expected_date - p_date)::DATE,
    rt.notification_days_before,
    rt.template_data,
    p.email
  FROM recurring_occurrences ro
  INNER JOIN recurring_transactions rt ON rt.id = ro.recurring_id
  INNER JOIN user_profiles p ON p.id = rt.user_id
  WHERE ro.status = 'pending'
    AND rt.notification_enabled = TRUE
    AND ro.expected_date - p_date <= rt.notification_days_before
    AND ro.expected_date >= p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_occurrences ENABLE ROW LEVEL SECURITY;

-- Policies for recurring_transactions
DROP POLICY IF EXISTS "Users can view their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can view their own recurring transactions"
  ON recurring_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can insert their own recurring transactions"
  ON recurring_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can update their own recurring transactions"
  ON recurring_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recurring transactions" ON recurring_transactions;
CREATE POLICY "Users can delete their own recurring transactions"
  ON recurring_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for recurring_occurrences
DROP POLICY IF EXISTS "Users can view their own recurring occurrences" ON recurring_occurrences;
CREATE POLICY "Users can view their own recurring occurrences"
  ON recurring_occurrences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recurring_transactions rt
      WHERE rt.id = recurring_occurrences.recurring_id
        AND rt.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own recurring occurrences" ON recurring_occurrences;
CREATE POLICY "Users can insert their own recurring occurrences"
  ON recurring_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurring_transactions rt
      WHERE rt.id = recurring_occurrences.recurring_id
        AND rt.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own recurring occurrences" ON recurring_occurrences;
CREATE POLICY "Users can update their own recurring occurrences"
  ON recurring_occurrences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recurring_transactions rt
      WHERE rt.id = recurring_occurrences.recurring_id
        AND rt.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own recurring occurrences" ON recurring_occurrences;
CREATE POLICY "Users can delete their own recurring occurrences"
  ON recurring_occurrences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recurring_transactions rt
      WHERE rt.id = recurring_occurrences.recurring_id
        AND rt.user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE recurring_transactions IS 'Stores recurring transaction templates and schedules';
COMMENT ON TABLE recurring_occurrences IS 'Tracks individual occurrences of recurring transactions';
COMMENT ON FUNCTION calculate_next_occurrence_date IS 'Calculates the next occurrence date based on frequency and interval';
COMMENT ON FUNCTION generate_pending_recurring_transactions IS 'Generates transactions for active recurring schedules (called by cron)';
COMMENT ON FUNCTION get_upcoming_recurring_transactions IS 'Returns upcoming recurring transactions for a user';
COMMENT ON FUNCTION approve_recurring_occurrence IS 'Approves a pending recurring occurrence and creates the transaction';
COMMENT ON FUNCTION skip_recurring_occurrence IS 'Marks a pending occurrence as skipped';
COMMENT ON FUNCTION get_pending_notifications IS 'Returns pending occurrences that need notification';
