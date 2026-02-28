-- Migration 086: Drop LemonSqueezy columns from user_onboarding
-- Phase 1B of database consolidation (docs/plans/planned/database-consolidation-architecture.md)
-- LemonSqueezy payment provider has been removed; Grove uses Stripe exclusively.

-- Indexes must be dropped BEFORE columns in SQLite
DROP INDEX IF EXISTS idx_onboarding_ls_subscription;
DROP INDEX IF EXISTS idx_onboarding_ls_customer;
DROP INDEX IF EXISTS idx_onboarding_ls_checkout;

ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_customer_id;
ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_subscription_id;
ALTER TABLE user_onboarding DROP COLUMN lemonsqueezy_checkout_id;
