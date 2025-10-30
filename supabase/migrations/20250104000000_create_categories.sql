-- Create enum for category types
CREATE TYPE category_type AS ENUM (
  'income',
  'expense',
  'both'
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  type category_type NOT NULL,
  color TEXT,
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_parent_check CHECK (id != parent_id)
);

-- Create indexes
CREATE INDEX categories_user_id_idx ON categories(user_id);
CREATE INDEX categories_parent_id_idx ON categories(parent_id);
CREATE INDEX categories_type_idx ON categories(type);
CREATE INDEX categories_sort_order_idx ON categories(sort_order);
CREATE INDEX categories_is_system_idx ON categories(is_system);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view system categories and their own categories
CREATE POLICY "Users can view system and own categories"
  ON categories
  FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories"
  ON categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own non-system categories
CREATE POLICY "Users can update own categories"
  ON categories
  FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can delete their own non-system categories
CREATE POLICY "Users can delete own categories"
  ON categories
  FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Insert default system categories using a single transaction
-- This approach uses CTEs to ensure unique parent lookups
DO $$
DECLARE
  -- Income categories
  v_salary_id UUID;
  v_freelance_id UUID;
  v_business_id UUID;
  v_investments_income_id UUID;
  v_gifts_id UUID;
  v_refunds_id UUID;
  v_other_income_id UUID;
  
  -- Expense parent categories
  v_food_id UUID;
  v_transport_id UUID;
  v_housing_id UUID;
  v_shopping_id UUID;
  v_entertainment_id UUID;
  v_healthcare_id UUID;
  v_bills_id UUID;
  v_education_id UUID;
  v_personal_care_id UUID;
  v_travel_id UUID;
  v_investments_id UUID;
  v_debt_id UUID;
BEGIN
  -- Income categories
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Salary', NULL, 'income', '#10b981', 'Briefcase', true, 1) 
  RETURNING id INTO v_salary_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Freelance', NULL, 'income', '#3b82f6', 'Code', true, 2) 
  RETURNING id INTO v_freelance_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Business', NULL, 'income', '#8b5cf6', 'Store', true, 3) 
  RETURNING id INTO v_business_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Investments', NULL, 'income', '#f59e0b', 'TrendingUp', true, 4) 
  RETURNING id INTO v_investments_income_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Gifts', NULL, 'income', '#ec4899', 'Gift', true, 5) 
  RETURNING id INTO v_gifts_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Refunds', NULL, 'income', '#06b6d4', 'RotateCcw', true, 6) 
  RETURNING id INTO v_refunds_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Other Income', NULL, 'income', '#6b7280', 'DollarSign', true, 7) 
  RETURNING id INTO v_other_income_id;

  -- Food & Dining
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Food & Dining', NULL, 'expense', '#ef4444', 'Utensils', true, 1) 
  RETURNING id INTO v_food_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Groceries', v_food_id, 'expense', '#f97316', 'ShoppingCart', true, 1),
    (NULL, 'Restaurants', v_food_id, 'expense', '#f97316', 'UtensilsCrossed', true, 2),
    (NULL, 'Coffee', v_food_id, 'expense', '#f97316', 'Coffee', true, 3),
    (NULL, 'Fast Food', v_food_id, 'expense', '#f97316', 'Sandwich', true, 4);

  -- Transportation
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Transportation', NULL, 'expense', '#3b82f6', 'Car', true, 2) 
  RETURNING id INTO v_transport_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Fuel', v_transport_id, 'expense', '#60a5fa', 'Fuel', true, 1),
    (NULL, 'Public Transport', v_transport_id, 'expense', '#60a5fa', 'Bus', true, 2),
    (NULL, 'Taxi/Uber', v_transport_id, 'expense', '#60a5fa', 'Car', true, 3),
    (NULL, 'Parking', v_transport_id, 'expense', '#60a5fa', 'ParkingCircle', true, 4),
    (NULL, 'Maintenance', v_transport_id, 'expense', '#60a5fa', 'Wrench', true, 5);

  -- Housing
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Housing', NULL, 'expense', '#8b5cf6', 'Home', true, 3) 
  RETURNING id INTO v_housing_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Rent', v_housing_id, 'expense', '#a78bfa', 'Home', true, 1),
    (NULL, 'Mortgage', v_housing_id, 'expense', '#a78bfa', 'Building', true, 2),
    (NULL, 'Utilities', v_housing_id, 'expense', '#a78bfa', 'Lightbulb', true, 3),
    (NULL, 'Home Maintenance', v_housing_id, 'expense', '#a78bfa', 'Hammer', true, 4),
    (NULL, 'Home Insurance', v_housing_id, 'expense', '#a78bfa', 'Shield', true, 5);

  -- Shopping
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Shopping', NULL, 'expense', '#ec4899', 'ShoppingBag', true, 4) 
  RETURNING id INTO v_shopping_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Clothing', v_shopping_id, 'expense', '#f472b6', 'Shirt', true, 1),
    (NULL, 'Electronics', v_shopping_id, 'expense', '#f472b6', 'Laptop', true, 2),
    (NULL, 'Home Goods', v_shopping_id, 'expense', '#f472b6', 'Sofa', true, 3),
    (NULL, 'Personal Items', v_shopping_id, 'expense', '#f472b6', 'Package', true, 4);

  -- Entertainment
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Entertainment', NULL, 'expense', '#f59e0b', 'Film', true, 5) 
  RETURNING id INTO v_entertainment_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Movies', v_entertainment_id, 'expense', '#fbbf24', 'Film', true, 1),
    (NULL, 'Events', v_entertainment_id, 'expense', '#fbbf24', 'Ticket', true, 2),
    (NULL, 'Hobbies', v_entertainment_id, 'expense', '#fbbf24', 'Palette', true, 3),
    (NULL, 'Subscriptions', v_entertainment_id, 'expense', '#fbbf24', 'Tv', true, 4);

  -- Healthcare
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Healthcare', NULL, 'expense', '#10b981', 'Heart', true, 6) 
  RETURNING id INTO v_healthcare_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Doctor', v_healthcare_id, 'expense', '#34d399', 'Stethoscope', true, 1),
    (NULL, 'Pharmacy', v_healthcare_id, 'expense', '#34d399', 'Pill', true, 2),
    (NULL, 'Health Insurance', v_healthcare_id, 'expense', '#34d399', 'Shield', true, 3),
    (NULL, 'Fitness', v_healthcare_id, 'expense', '#34d399', 'Dumbbell', true, 4);

  -- Bills & Utilities
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Bills & Utilities', NULL, 'expense', '#06b6d4', 'FileText', true, 7) 
  RETURNING id INTO v_bills_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Electric', v_bills_id, 'expense', '#22d3ee', 'Zap', true, 1),
    (NULL, 'Water', v_bills_id, 'expense', '#22d3ee', 'Droplet', true, 2),
    (NULL, 'Internet', v_bills_id, 'expense', '#22d3ee', 'Wifi', true, 3),
    (NULL, 'Phone', v_bills_id, 'expense', '#22d3ee', 'Phone', true, 4),
    (NULL, 'Gas', v_bills_id, 'expense', '#22d3ee', 'Flame', true, 5);

  -- Education
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Education', NULL, 'expense', '#6366f1', 'GraduationCap', true, 8) 
  RETURNING id INTO v_education_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Tuition', v_education_id, 'expense', '#818cf8', 'School', true, 1),
    (NULL, 'Books', v_education_id, 'expense', '#818cf8', 'BookOpen', true, 2),
    (NULL, 'Courses', v_education_id, 'expense', '#818cf8', 'BookMarked', true, 3),
    (NULL, 'Supplies', v_education_id, 'expense', '#818cf8', 'Pencil', true, 4);

  -- Personal Care
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Personal Care', NULL, 'expense', '#d946ef', 'Sparkles', true, 9) 
  RETURNING id INTO v_personal_care_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Haircut', v_personal_care_id, 'expense', '#e879f9', 'Scissors', true, 1),
    (NULL, 'Spa', v_personal_care_id, 'expense', '#e879f9', 'Sparkles', true, 2),
    (NULL, 'Cosmetics', v_personal_care_id, 'expense', '#e879f9', 'Pipette', true, 3);

  -- Travel
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Travel', NULL, 'expense', '#14b8a6', 'Plane', true, 10) 
  RETURNING id INTO v_travel_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Flights', v_travel_id, 'expense', '#2dd4bf', 'Plane', true, 1),
    (NULL, 'Hotels', v_travel_id, 'expense', '#2dd4bf', 'Hotel', true, 2),
    (NULL, 'Activities', v_travel_id, 'expense', '#2dd4bf', 'Camera', true, 3);

  -- Investments (Expense category for investment purchases)
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Investments', NULL, 'expense', '#f59e0b', 'TrendingUp', true, 11) 
  RETURNING id INTO v_investments_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Stocks', v_investments_id, 'expense', '#fbbf24', 'LineChart', true, 1),
    (NULL, 'Mutual Funds', v_investments_id, 'expense', '#fbbf24', 'PieChart', true, 2),
    (NULL, 'Crypto', v_investments_id, 'expense', '#fbbf24', 'Bitcoin', true, 3);

  -- Debt
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) 
  VALUES (NULL, 'Debt', NULL, 'expense', '#64748b', 'CreditCard', true, 12) 
  RETURNING id INTO v_debt_id;
  
  INSERT INTO categories (user_id, name, parent_id, type, color, icon, is_system, sort_order) VALUES
    (NULL, 'Credit Card', v_debt_id, 'expense', '#94a3b8', 'CreditCard', true, 1),
    (NULL, 'Loan EMI', v_debt_id, 'expense', '#94a3b8', 'Banknote', true, 2);
    
END $$;

-- Create view for category statistics
CREATE OR REPLACE VIEW category_statistics AS
SELECT 
  c.id,
  c.name,
  c.type,
  c.user_id,
  c.is_system,
  COUNT(t.id) as transaction_count,
  COALESCE(SUM(t.amount), 0) as total_amount,
  MAX(t.date) as last_used
FROM categories c
LEFT JOIN transactions t ON t.category_id = c.id
GROUP BY c.id, c.name, c.type, c.user_id, c.is_system;

-- Grant access to view
GRANT SELECT ON category_statistics TO authenticated;

-- Add RLS to view
ALTER VIEW category_statistics SET (security_invoker = true);

-- Comments
COMMENT ON TABLE categories IS 'Stores income and expense categories with hierarchical structure';
COMMENT ON COLUMN categories.parent_id IS 'References parent category for subcategories';
COMMENT ON COLUMN categories.is_system IS 'System categories cannot be deleted by users';
COMMENT ON COLUMN categories.sort_order IS 'Used for custom ordering via drag-and-drop';
COMMENT ON VIEW category_statistics IS 'Aggregated transaction statistics per category';
