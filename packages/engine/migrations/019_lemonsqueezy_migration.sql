-- Migration: Lemon Squeezy Payment Provider Support
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/019_lemonsqueezy_migration.sql --remote
--
-- This migration adds Lemon Squeezy-specific columns alongside existing Stripe columns.
-- This allows gradual migration without breaking existing flows.
--
-- Lemon Squeezy acts as Merchant of Record (MoR), handling:
-- - Tax collection and VAT compliance
-- - Fraud protection
-- - Payment processing
--
-- The existing platform_billing table already uses generic provider_* column names,
-- so no changes are needed there. This migration only adds LS columns to user_onboarding.

-- =============================================================================
-- USER ONBOARDING TABLE UPDATES
-- =============================================================================
-- Add Lemon Squeezy columns for payment tracking during signup flow

-- Lemon Squeezy customer ID (created during checkout)
ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_customer_id TEXT;

-- Lemon Squeezy subscription ID (created when subscription starts)
ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_subscription_id TEXT;

-- Lemon Squeezy checkout ID (created when user initiates checkout)
ALTER TABLE user_onboarding ADD COLUMN lemonsqueezy_checkout_id TEXT;

-- =============================================================================
-- INDEXES FOR WEBHOOK LOOKUPS
-- =============================================================================
-- These indexes optimize webhook event processing

CREATE INDEX IF NOT EXISTS idx_onboarding_ls_subscription
  ON user_onboarding(lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_ls_customer
  ON user_onboarding(lemonsqueezy_customer_id)
  WHERE lemonsqueezy_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_ls_checkout
  ON user_onboarding(lemonsqueezy_checkout_id)
  WHERE lemonsqueezy_checkout_id IS NOT NULL;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. COEXISTENCE WITH STRIPE:
--    Both Stripe and Lemon Squeezy columns can exist simultaneously.
--    This allows A/B testing or gradual migration.
--
-- 2. PROVIDER-AGNOSTIC BILLING:
--    The platform_billing table uses generic provider_* columns:
--    - provider_customer_id (works for both Stripe cus_xxx and LS customer IDs)
--    - provider_subscription_id (works for both Stripe sub_xxx and LS subscription IDs)
--
-- 3. WEBHOOK EVENTS TABLE:
--    The webhook_events table already supports multiple providers via the
--    'provider' column ('stripe', 'lemonsqueezy', etc.)
--
-- 4. NO DATA MIGRATION NEEDED:
--    Since there are no live Stripe transactions, no data migration is required.
--
-- 5. ROLLBACK:
--    If needed, columns can be dropped with:
--    ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_customer_id;
--    ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_subscription_id;
--    ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_checkout_id;
