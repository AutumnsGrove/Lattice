-- Migration 053: Wanderer Tier Support
-- Adds activity tracking and account reclamation infrastructure for the free tier (Wanderer Plan).
--
-- Run with:
--   npx wrangler d1 execute grove-engine-db --file=packages/engine/migrations/053_wanderer_tier.sql --local
--   npx wrangler d1 execute grove-engine-db --file=packages/engine/migrations/053_wanderer_tier.sql --remote

-- Track last meaningful activity for inactivity reclamation (free tier only).
-- Updated on: login, post create/update, media upload.
ALTER TABLE tenants ADD COLUMN last_activity_at INTEGER DEFAULT (unixepoch());

-- Track reclamation warning state for free tier accounts.
-- null = no warnings sent
-- 'first_warning' = 9-month email sent
-- 'final_warning' = 11-month email sent
-- 'reclaimed' = account reclaimed
ALTER TABLE tenants ADD COLUMN reclamation_status TEXT;

-- Table for archived/reclaimed free-tier accounts.
-- Content is archived to R2 for 30 days after reclamation, then permanently deleted.
CREATE TABLE IF NOT EXISTS reclaimed_accounts (
  id TEXT PRIMARY KEY,
  original_tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  content_archive_key TEXT,
  reclaimed_at INTEGER NOT NULL,
  archive_expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Index for looking up archives by original tenant.
CREATE INDEX IF NOT EXISTS idx_reclaimed_accounts_tenant
  ON reclaimed_accounts(original_tenant_id);

-- Index for the daily reclamation cron to find expired archives efficiently.
CREATE INDEX IF NOT EXISTS idx_reclaimed_accounts_archive_expires
  ON reclaimed_accounts(archive_expires_at);

-- Track free account creation by IP to prevent abuse (max 3 per IP per 30 days).
CREATE TABLE IF NOT EXISTS free_account_creation_log (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for IP-based lookups during signup.
CREATE INDEX IF NOT EXISTS idx_free_account_creation_ip
  ON free_account_creation_log(ip_address, created_at);

-- Index for the reclamation cron to find inactive free-tier accounts.
CREATE INDEX IF NOT EXISTS idx_tenants_plan_activity
  ON tenants(plan, last_activity_at)
  WHERE plan = 'free' AND active = 1;
