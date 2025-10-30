-- =====================================================
-- DROP INVESTMENT PORTFOLIO SYSTEM
-- =====================================================
-- This migration removes all investment-related tables,
-- functions, and triggers from the database
-- =====================================================

-- Drop Tables (CASCADE will automatically drop triggers, policies, and constraints)
DROP TABLE IF EXISTS investment_price_history CASCADE;
DROP TABLE IF EXISTS investment_transactions CASCADE;
DROP TABLE IF EXISTS investment_holdings CASCADE;
DROP TABLE IF EXISTS investment_accounts CASCADE;

-- Drop Functions (CASCADE to drop any remaining dependencies)
DROP FUNCTION IF EXISTS update_prices_from_history(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_portfolio_allocation(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_portfolio_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS process_investment_transaction(UUID, investment_transaction_type, TEXT, DECIMAL, DECIMAL, DECIMAL, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_account_totals() CASCADE;
DROP FUNCTION IF EXISTS update_investment_account_totals(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_holding_last_updated() CASCADE;
DROP FUNCTION IF EXISTS update_investment_updated_at() CASCADE;

-- Drop Enum Types
DROP TYPE IF EXISTS investment_transaction_type CASCADE;
DROP TYPE IF EXISTS asset_type CASCADE;
DROP TYPE IF EXISTS investment_account_type CASCADE;

-- =====================================================
-- CONFIRMATION
-- =====================================================
-- All investment-related database objects have been removed
