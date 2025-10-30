-- Add foreign key constraints for category relationships
-- This migration fixes the "Could not find a relationship" error

-- Add foreign key to transactions.category_id
ALTER TABLE transactions
ADD CONSTRAINT transactions_category_id_fkey
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Add foreign key to transactions.subcategory_id
ALTER TABLE transactions
ADD CONSTRAINT transactions_subcategory_id_fkey
FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Add foreign key to transaction_splits.category_id
ALTER TABLE transaction_splits
ADD CONSTRAINT transaction_splits_category_id_fkey
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subcategory_id ON transactions(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_category_id ON transaction_splits(category_id);
