-- Fix financial goals constraint to allow negative current_amount
-- This is needed for:
-- 1. Debt payoff goals where current amount decreases from target toward zero
-- 2. Withdrawal contributions (negative amounts)
-- 3. Goals that may temporarily go negative due to adjustments

-- Drop the restrictive check constraint
ALTER TABLE financial_goals 
DROP CONSTRAINT IF EXISTS financial_goals_current_amount_check;

-- Add a comment explaining that negative values are allowed
COMMENT ON COLUMN financial_goals.current_amount IS 'Current amount saved/paid toward goal. Can be negative for debt payoff goals or after withdrawals.';
