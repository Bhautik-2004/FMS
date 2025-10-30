-- Create enum for account types
CREATE TYPE account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'loan'
);

-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  institution_name TEXT,
  account_number_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX accounts_user_id_idx ON accounts(user_id);

-- Create index on type for filtering
CREATE INDEX accounts_type_idx ON accounts(type);

-- Create index on is_active for filtering
CREATE INDEX accounts_is_active_idx ON accounts(is_active);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own accounts
CREATE POLICY "Users can view own accounts"
  ON accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own accounts
CREATE POLICY "Users can insert own accounts"
  ON accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts
CREATE POLICY "Users can update own accounts"
  ON accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own accounts
CREATE POLICY "Users can delete own accounts"
  ON accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

-- Insert sample data (optional - for testing)
-- Uncomment to add sample accounts
/*
INSERT INTO accounts (user_id, name, type, currency, initial_balance, current_balance, color, icon, institution_name, account_number_last4)
VALUES
  (auth.uid(), 'Chase Checking', 'checking', 'USD', 5000.00, 6543.21, '#3b82f6', 'Building2', 'Chase Bank', '1234'),
  (auth.uid(), 'Savings Account', 'savings', 'USD', 10000.00, 12345.67, '#10b981', 'PiggyBank', 'Chase Bank', '5678'),
  (auth.uid(), 'Amex Credit Card', 'credit_card', 'USD', 0.00, -2543.18, '#ef4444', 'CreditCard', 'American Express', '9012');
*/
