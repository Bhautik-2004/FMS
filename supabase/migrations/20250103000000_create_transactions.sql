-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense',
  'transfer'
);

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'bank_transfer',
  'upi',
  'other'
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID,
  subcategory_id UUID,
  merchant_name TEXT,
  payment_method payment_method,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_id UUID,
  notes TEXT,
  receipt_url TEXT,
  location TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transaction_splits table for split transactions
CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  percentage DECIMAL(5, 2) CHECK (percentage >= 0 AND percentage <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
-- Primary query indexes
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_account_id_idx ON transactions(account_id);
CREATE INDEX transactions_category_id_idx ON transactions(category_id);
CREATE INDEX transactions_date_idx ON transactions(date DESC);
CREATE INDEX transactions_type_idx ON transactions(type);

-- Composite indexes for common queries
CREATE INDEX transactions_user_date_idx ON transactions(user_id, date DESC);
CREATE INDEX transactions_user_account_idx ON transactions(user_id, account_id);
CREATE INDEX transactions_user_type_idx ON transactions(user_id, type);
CREATE INDEX transactions_user_category_idx ON transactions(user_id, category_id);

-- Index for recurring transactions
CREATE INDEX transactions_recurring_id_idx ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;

-- Index for split transactions
CREATE INDEX transaction_splits_transaction_id_idx ON transaction_splits(transaction_id);
CREATE INDEX transaction_splits_category_id_idx ON transaction_splits(category_id);

-- Full-text search indexes
-- Create tsvector column for full-text search
ALTER TABLE transactions ADD COLUMN search_vector tsvector;

-- Create index on search vector
CREATE INDEX transactions_search_idx ON transactions USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION transactions_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.merchant_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
CREATE TRIGGER transactions_search_vector_trigger
  BEFORE INSERT OR UPDATE OF description, merchant_name, notes
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION transactions_search_vector_update();

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for transaction_splits
-- Users can view splits of their transactions
CREATE POLICY "Users can view own transaction splits"
  ON transaction_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can insert splits for their transactions
CREATE POLICY "Users can insert own transaction splits"
  ON transaction_splits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can update splits of their transactions
CREATE POLICY "Users can update own transaction splits"
  ON transaction_splits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Users can delete splits of their transactions
CREATE POLICY "Users can delete own transaction splits"
  ON transaction_splits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create function to update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_change DECIMAL(15, 2);
BEGIN
  -- Calculate balance change based on transaction type
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      balance_change := NEW.amount;
    ELSIF NEW.type = 'expense' THEN
      balance_change := -NEW.amount;
    ELSE
      -- For transfers, we'll handle separately
      RETURN NEW;
    END IF;
    
    -- Update account balance
    UPDATE accounts
    SET current_balance = current_balance + balance_change
    WHERE id = NEW.account_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction
    IF OLD.type = 'income' THEN
      balance_change := -OLD.amount;
    ELSIF OLD.type = 'expense' THEN
      balance_change := OLD.amount;
    END IF;
    
    UPDATE accounts
    SET current_balance = current_balance + balance_change
    WHERE id = OLD.account_id;
    
    -- Apply new transaction
    IF NEW.type = 'income' THEN
      balance_change := NEW.amount;
    ELSIF NEW.type = 'expense' THEN
      balance_change := -NEW.amount;
    END IF;
    
    UPDATE accounts
    SET current_balance = current_balance + balance_change
    WHERE id = NEW.account_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse transaction
    IF OLD.type = 'income' THEN
      balance_change := -OLD.amount;
    ELSIF OLD.type = 'expense' THEN
      balance_change := OLD.amount;
    END IF;
    
    UPDATE accounts
    SET current_balance = current_balance + balance_change
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update account balance
CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_splits;

-- Create view for transaction summaries
CREATE OR REPLACE VIEW transaction_summaries AS
SELECT 
  t.user_id,
  t.account_id,
  DATE_TRUNC('month', t.date) as month,
  t.type,
  COUNT(*) as transaction_count,
  SUM(t.amount) as total_amount,
  AVG(t.amount) as avg_amount,
  MIN(t.amount) as min_amount,
  MAX(t.amount) as max_amount
FROM transactions t
GROUP BY t.user_id, t.account_id, DATE_TRUNC('month', t.date), t.type;

-- Create view for category spending
CREATE OR REPLACE VIEW category_spending AS
SELECT 
  t.user_id,
  t.category_id,
  DATE_TRUNC('month', t.date) as month,
  COUNT(*) as transaction_count,
  SUM(t.amount) as total_spent
FROM transactions t
WHERE t.type = 'expense'
GROUP BY t.user_id, t.category_id, DATE_TRUNC('month', t.date);

-- Grant access to views
GRANT SELECT ON transaction_summaries TO authenticated;
GRANT SELECT ON category_spending TO authenticated;

-- Add RLS to views
ALTER VIEW transaction_summaries SET (security_invoker = true);
ALTER VIEW category_spending SET (security_invoker = true);

-- Create function for full-text search
CREATE OR REPLACE FUNCTION search_transactions(
  search_query TEXT,
  user_uuid UUID
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  merchant_name TEXT,
  amount DECIMAL,
  date DATE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.description,
    t.merchant_name,
    t.amount,
    t.date,
    ts_rank(t.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM transactions t
  WHERE t.user_id = user_uuid
    AND t.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, t.date DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data (commented out - uncomment to add test data)
/*
-- Get a sample user_id and account_id
DO $$
DECLARE
  sample_user_id UUID;
  sample_account_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
  
  -- Get first account
  SELECT id INTO sample_account_id FROM accounts WHERE user_id = sample_user_id LIMIT 1;
  
  -- Insert sample transactions
  IF sample_user_id IS NOT NULL AND sample_account_id IS NOT NULL THEN
    INSERT INTO transactions (user_id, account_id, type, amount, description, date, merchant_name, payment_method)
    VALUES
      (sample_user_id, sample_account_id, 'income', 3000.00, 'Monthly Salary', CURRENT_DATE - INTERVAL '5 days', 'Employer Inc', 'bank_transfer'),
      (sample_user_id, sample_account_id, 'expense', 85.50, 'Grocery Shopping', CURRENT_DATE - INTERVAL '3 days', 'Whole Foods', 'card'),
      (sample_user_id, sample_account_id, 'expense', 45.99, 'Amazon Purchase', CURRENT_DATE - INTERVAL '2 days', 'Amazon', 'card'),
      (sample_user_id, sample_account_id, 'expense', 12.50, 'Coffee', CURRENT_DATE - INTERVAL '1 day', 'Starbucks', 'cash'),
      (sample_user_id, sample_account_id, 'income', 150.00, 'Freelance Work', CURRENT_DATE, 'Client XYZ', 'bank_transfer');
  END IF;
END $$;
*/

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Stores all financial transactions for users';
COMMENT ON TABLE transaction_splits IS 'Stores split transaction details for transactions divided across multiple categories';
COMMENT ON COLUMN transactions.search_vector IS 'Full-text search vector for description, merchant_name, and notes';
COMMENT ON FUNCTION search_transactions IS 'Full-text search function for transactions';
COMMENT ON VIEW transaction_summaries IS 'Monthly aggregated transaction summaries by account and type';
COMMENT ON VIEW category_spending IS 'Monthly spending aggregated by category';
