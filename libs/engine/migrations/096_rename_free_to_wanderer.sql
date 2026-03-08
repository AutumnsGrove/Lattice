-- Migration 096: Rename 'free' plan to 'wanderer'
--
-- The codebase now uses 'wanderer' as the TierKey for the free tier.
-- This migration updates existing database rows and rebuilds the partial
-- index from migration 053 to match the new plan value.
--
-- Run with:
--   npx wrangler d1 execute grove-engine-db --file=libs/engine/migrations/096_rename_free_to_wanderer.sql --local
--   npx wrangler d1 execute grove-engine-db --file=libs/engine/migrations/096_rename_free_to_wanderer.sql --remote

-- Update tenant plan values
UPDATE tenants SET plan = 'wanderer' WHERE plan = 'free';

-- Update billing records (if any free-tier rows exist)
UPDATE platform_billing SET plan = 'wanderer' WHERE plan = 'free';

-- Rebuild partial index from migration 053 for new plan name
DROP INDEX IF EXISTS idx_tenants_plan_activity;
CREATE INDEX idx_tenants_plan_activity
  ON tenants(plan, last_activity_at)
  WHERE plan = 'wanderer' AND active = 1;
