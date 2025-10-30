-- =====================================================
-- INVESTMENT PORTFOLIO SYSTEM
-- =====================================================
-- This migration creates tables and functions for managing
-- investment portfolios with automatic tracking and price updates
-- =====================================================

-- Create enum types for investments
DO $$ BEGIN
  CREATE TYPE investment_account_type AS ENUM (
    'brokerage',
    'retirement_401k',
    'ira',
    'roth_ira',
    'crypto'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM (
    'stock',
    'etf',
    'mutual_fund',
    'crypto',
    'bond',
    'commodity'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE investment_transaction_type AS ENUM (
    'buy',
    'sell',
    'dividend',
    'interest',
    'fee',
    'transfer_in',
    'transfer_out',
    'split'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- INVESTMENT ACCOUNTS TABLE
-- =====================================================
-- Stores investment account information and aggregated values
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Account details
  broker_name TEXT NOT NULL,
  account_type investment_account_type NOT NULL DEFAULT 'brokerage',
  account_number TEXT, -- Masked/encrypted account number
  
  -- Aggregated values (calculated from holdings)
  total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost_basis DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_gain_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_gain_loss_percentage DECIMAL(10, 4) NOT NULL DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_accounts_user_id ON investment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_account_id ON investment_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_is_active ON investment_accounts(is_active);

-- =====================================================
-- INVESTMENT HOLDINGS TABLE
-- =====================================================
-- Stores individual investment holdings and their performance
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  
  -- Asset details
  asset_type asset_type NOT NULL DEFAULT 'stock',
  symbol TEXT NOT NULL, -- Ticker symbol (e.g., AAPL, BTC-USD)
  name TEXT NOT NULL,
  
  -- Position details
  quantity DECIMAL(18, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  average_cost_per_unit DECIMAL(15, 4) NOT NULL DEFAULT 0,
  current_price DECIMAL(15, 4) NOT NULL DEFAULT 0,
  
  -- Calculated values
  current_value DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * current_price) STORED,
  total_cost_basis DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * average_cost_per_unit) STORED,
  unrealized_gain_loss DECIMAL(15, 2) GENERATED ALWAYS AS ((quantity * current_price) - (quantity * average_cost_per_unit)) STORED,
  unrealized_gain_loss_percentage DECIMAL(10, 4) GENERATED ALWAYS AS (
    CASE 
      WHEN (quantity * average_cost_per_unit) > 0 
      THEN (((quantity * current_price) - (quantity * average_cost_per_unit)) / (quantity * average_cost_per_unit) * 100)
      ELSE 0
    END
  ) STORED,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_holdings_account_id ON investment_holdings(investment_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_asset_type ON investment_holdings(asset_type);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_last_updated ON investment_holdings(last_updated);

-- Add unique constraint for holdings (safely)
DO $$ BEGIN
  ALTER TABLE investment_holdings ADD CONSTRAINT unique_holding_per_account UNIQUE (investment_account_id, symbol);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- INVESTMENT TRANSACTIONS TABLE
-- =====================================================
-- Stores all investment transactions
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES investment_holdings(id) ON DELETE SET NULL,
  
  -- Transaction details
  transaction_type investment_transaction_type NOT NULL,
  symbol TEXT NOT NULL, -- Denormalized for easier querying
  
  -- Amounts
  quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
  price_per_unit DECIMAL(15, 4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  fees DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Dates and notes
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_account_id ON investment_transactions(investment_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_holding_id ON investment_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_symbol ON investment_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(transaction_type);

-- =====================================================
-- INVESTMENT PRICE HISTORY TABLE
-- =====================================================
-- Stores historical price data for all tracked symbols
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  
  -- Price data
  date DATE NOT NULL,
  open_price DECIMAL(15, 4),
  close_price DECIMAL(15, 4) NOT NULL,
  high_price DECIMAL(15, 4),
  low_price DECIMAL(15, 4),
  volume BIGINT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_symbol_date UNIQUE (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON investment_price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON investment_price_history(date);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON investment_price_history(symbol, date DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investment_accounts_updated_at
  BEFORE UPDATE ON investment_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_updated_at();

CREATE TRIGGER update_investment_transactions_updated_at
  BEFORE UPDATE ON investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_updated_at();

-- Update holding last_updated when price changes
CREATE OR REPLACE FUNCTION update_holding_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_price IS DISTINCT FROM NEW.current_price THEN
    NEW.last_updated = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_holdings_last_updated
  BEFORE UPDATE ON investment_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_holding_last_updated();

-- =====================================================
-- FUNCTION: Update Investment Account Totals
-- =====================================================
-- Aggregates holding values to update account totals
-- =====================================================

CREATE OR REPLACE FUNCTION update_investment_account_totals(p_account_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE investment_accounts
  SET 
    total_value = COALESCE((
      SELECT SUM(current_value)
      FROM investment_holdings
      WHERE investment_account_id = p_account_id
    ), 0),
    total_cost_basis = COALESCE((
      SELECT SUM(total_cost_basis)
      FROM investment_holdings
      WHERE investment_account_id = p_account_id
    ), 0),
    total_gain_loss = COALESCE((
      SELECT SUM(unrealized_gain_loss)
      FROM investment_holdings
      WHERE investment_account_id = p_account_id
    ), 0),
    total_gain_loss_percentage = CASE 
      WHEN COALESCE((
        SELECT SUM(total_cost_basis)
        FROM investment_holdings
        WHERE investment_account_id = p_account_id
      ), 0) > 0 THEN
        (COALESCE((
          SELECT SUM(unrealized_gain_loss)
          FROM investment_holdings
          WHERE investment_account_id = p_account_id
        ), 0) / COALESCE((
          SELECT SUM(total_cost_basis)
          FROM investment_holdings
          WHERE investment_account_id = p_account_id
        ), 1)) * 100
      ELSE 0
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update account totals when holdings change
CREATE OR REPLACE FUNCTION trigger_update_account_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_investment_account_totals(OLD.investment_account_id);
    RETURN OLD;
  ELSE
    PERFORM update_investment_account_totals(NEW.investment_account_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_totals_on_holding_change
  AFTER INSERT OR UPDATE OR DELETE ON investment_holdings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_account_totals();

-- =====================================================
-- FUNCTION: Process Investment Transaction
-- =====================================================
-- Updates holdings based on transaction type
-- =====================================================

CREATE OR REPLACE FUNCTION process_investment_transaction(
  p_account_id UUID,
  p_transaction_type investment_transaction_type,
  p_symbol TEXT,
  p_quantity DECIMAL(18, 8),
  p_price_per_unit DECIMAL(15, 4),
  p_fees DECIMAL(10, 2) DEFAULT 0,
  p_transaction_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_holding_id UUID;
  v_holding investment_holdings;
  v_total_amount DECIMAL(15, 2);
  v_new_quantity DECIMAL(18, 8);
  v_new_cost_basis DECIMAL(15, 2);
  v_new_avg_cost DECIMAL(15, 4);
BEGIN
  -- Calculate total amount
  v_total_amount := p_quantity * p_price_per_unit + p_fees;
  
  -- Get or create holding
  SELECT * INTO v_holding
  FROM investment_holdings
  WHERE investment_account_id = p_account_id AND symbol = p_symbol;
  
  IF NOT FOUND THEN
    -- Create new holding
    INSERT INTO investment_holdings (
      investment_account_id,
      symbol,
      name,
      asset_type,
      quantity,
      average_cost_per_unit,
      current_price
    ) VALUES (
      p_account_id,
      p_symbol,
      p_symbol, -- Will be updated later
      'stock', -- Default, will be updated later
      0,
      0,
      p_price_per_unit
    )
    RETURNING * INTO v_holding;
  END IF;
  
  v_holding_id := v_holding.id;
  
  -- Process transaction based on type
  CASE p_transaction_type
    WHEN 'buy', 'transfer_in' THEN
      -- Add to position
      v_new_quantity := v_holding.quantity + p_quantity;
      v_new_cost_basis := (v_holding.quantity * v_holding.average_cost_per_unit) + v_total_amount;
      v_new_avg_cost := CASE WHEN v_new_quantity > 0 THEN v_new_cost_basis / v_new_quantity ELSE 0 END;
      
      UPDATE investment_holdings
      SET 
        quantity = v_new_quantity,
        average_cost_per_unit = v_new_avg_cost,
        current_price = p_price_per_unit
      WHERE id = v_holding_id;
      
    WHEN 'sell', 'transfer_out' THEN
      -- Remove from position
      v_new_quantity := v_holding.quantity - p_quantity;
      
      IF v_new_quantity < 0 THEN
        RAISE EXCEPTION 'Cannot sell more than current quantity';
      END IF;
      
      UPDATE investment_holdings
      SET 
        quantity = v_new_quantity,
        current_price = p_price_per_unit
      WHERE id = v_holding_id;
      
      -- If quantity is zero, optionally delete the holding
      IF v_new_quantity = 0 THEN
        -- Keep the holding record for historical purposes but mark it
        -- You could also DELETE FROM investment_holdings WHERE id = v_holding_id;
        NULL;
      END IF;
      
    WHEN 'split' THEN
      -- Stock split: adjust quantity and average cost
      UPDATE investment_holdings
      SET 
        quantity = quantity * p_quantity,
        average_cost_per_unit = average_cost_per_unit / p_quantity
      WHERE id = v_holding_id;
      
    WHEN 'dividend', 'interest' THEN
      -- These don't affect holdings quantity, just record the transaction
      NULL;
      
    WHEN 'fee' THEN
      -- Fees reduce cost basis
      v_new_cost_basis := (v_holding.quantity * v_holding.average_cost_per_unit) - v_total_amount;
      v_new_avg_cost := CASE WHEN v_holding.quantity > 0 THEN v_new_cost_basis / v_holding.quantity ELSE 0 END;
      
      UPDATE investment_holdings
      SET average_cost_per_unit = v_new_avg_cost
      WHERE id = v_holding_id;
  END CASE;
  
  -- Create transaction record
  INSERT INTO investment_transactions (
    investment_account_id,
    holding_id,
    transaction_type,
    symbol,
    quantity,
    price_per_unit,
    total_amount,
    fees,
    transaction_date,
    notes
  ) VALUES (
    p_account_id,
    v_holding_id,
    p_transaction_type,
    p_symbol,
    p_quantity,
    p_price_per_unit,
    v_total_amount,
    p_fees,
    p_transaction_date,
    p_notes
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get Portfolio Summary
-- =====================================================
-- Returns aggregated portfolio statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
  total_accounts INTEGER,
  total_value DECIMAL(15, 2),
  total_cost_basis DECIMAL(15, 2),
  total_gain_loss DECIMAL(15, 2),
  total_gain_loss_percentage DECIMAL(10, 4),
  total_holdings INTEGER,
  top_performer_symbol TEXT,
  top_performer_gain DECIMAL(10, 4),
  worst_performer_symbol TEXT,
  worst_performer_loss DECIMAL(10, 4)
) AS $$
BEGIN
  RETURN QUERY
  WITH account_stats AS (
    SELECT 
      COUNT(*)::INTEGER as account_count,
      COALESCE(SUM(ia.total_value), 0) as total_val,
      COALESCE(SUM(ia.total_cost_basis), 0) as total_cost,
      COALESCE(SUM(ia.total_gain_loss), 0) as total_gl
    FROM investment_accounts ia
    WHERE ia.user_id = p_user_id AND ia.is_active = TRUE
  ),
  holding_stats AS (
    SELECT 
      COUNT(*)::INTEGER as holding_count,
      MAX(CASE WHEN ih.unrealized_gain_loss_percentage > 0 THEN ih.symbol END) as top_symbol,
      MAX(ih.unrealized_gain_loss_percentage) as top_gain,
      MIN(CASE WHEN ih.unrealized_gain_loss_percentage < 0 THEN ih.symbol END) as worst_symbol,
      MIN(ih.unrealized_gain_loss_percentage) as worst_loss
    FROM investment_holdings ih
    JOIN investment_accounts ia ON ih.investment_account_id = ia.id
    WHERE ia.user_id = p_user_id AND ia.is_active = TRUE AND ih.quantity > 0
  )
  SELECT 
    a.account_count,
    a.total_val,
    a.total_cost,
    a.total_gl,
    CASE WHEN a.total_cost > 0 THEN (a.total_gl / a.total_cost * 100) ELSE 0 END,
    h.holding_count,
    h.top_symbol,
    h.top_gain,
    h.worst_symbol,
    h.worst_loss
  FROM account_stats a
  CROSS JOIN holding_stats h;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get Holdings by Asset Type
-- =====================================================
-- Returns portfolio allocation by asset type
-- =====================================================

CREATE OR REPLACE FUNCTION get_portfolio_allocation(p_user_id UUID)
RETURNS TABLE (
  asset_type asset_type,
  total_value DECIMAL(15, 2),
  percentage DECIMAL(10, 4),
  holdings_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH portfolio_total AS (
    SELECT COALESCE(SUM(ia.total_value), 1) as total
    FROM investment_accounts ia
    WHERE ia.user_id = p_user_id AND ia.is_active = TRUE
  )
  SELECT 
    ih.asset_type,
    COALESCE(SUM(ih.current_value), 0) as total_value,
    (COALESCE(SUM(ih.current_value), 0) / pt.total * 100) as percentage,
    COUNT(*)::INTEGER as holdings_count
  FROM investment_holdings ih
  JOIN investment_accounts ia ON ih.investment_account_id = ia.id
  CROSS JOIN portfolio_total pt
  WHERE ia.user_id = p_user_id AND ia.is_active = TRUE AND ih.quantity > 0
  GROUP BY ih.asset_type, pt.total
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update Prices from History
-- =====================================================
-- Updates holding prices from price history table
-- =====================================================

CREATE OR REPLACE FUNCTION update_prices_from_history(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE investment_holdings ih
  SET current_price = ph.close_price
  FROM investment_price_history ph
  WHERE ih.symbol = ph.symbol
    AND ph.date = p_date
    AND ih.quantity > 0;
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_price_history ENABLE ROW LEVEL SECURITY;

-- Investment Accounts Policies
CREATE POLICY "Users can view their own investment accounts"
  ON investment_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investment accounts"
  ON investment_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment accounts"
  ON investment_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment accounts"
  ON investment_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Investment Holdings Policies
CREATE POLICY "Users can view holdings from their accounts"
  ON investment_holdings FOR SELECT
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert holdings in their accounts"
  ON investment_holdings FOR INSERT
  WITH CHECK (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update holdings in their accounts"
  ON investment_holdings FOR UPDATE
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete holdings from their accounts"
  ON investment_holdings FOR DELETE
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

-- Investment Transactions Policies
CREATE POLICY "Users can view transactions from their accounts"
  ON investment_transactions FOR SELECT
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions in their accounts"
  ON investment_transactions FOR INSERT
  WITH CHECK (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions in their accounts"
  ON investment_transactions FOR UPDATE
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transactions from their accounts"
  ON investment_transactions FOR DELETE
  USING (
    investment_account_id IN (
      SELECT id FROM investment_accounts WHERE user_id = auth.uid()
    )
  );

-- Price History Policies (public read)
CREATE POLICY "Anyone can view price history"
  ON investment_price_history FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage price history"
  ON investment_price_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE investment_accounts IS 'Investment accounts (brokerage, retirement, etc.)';
COMMENT ON TABLE investment_holdings IS 'Individual investment holdings with real-time valuations';
COMMENT ON TABLE investment_transactions IS 'All investment transactions (buys, sells, dividends, etc.)';
COMMENT ON TABLE investment_price_history IS 'Historical price data for all tracked symbols';

COMMENT ON FUNCTION process_investment_transaction IS 'Process a transaction and update holdings automatically';
COMMENT ON FUNCTION update_investment_account_totals IS 'Recalculate account totals from holdings';
COMMENT ON FUNCTION get_portfolio_summary IS 'Get aggregated portfolio statistics';
COMMENT ON FUNCTION get_portfolio_allocation IS 'Get portfolio allocation by asset type';
COMMENT ON FUNCTION update_prices_from_history IS 'Update current prices from price history';
