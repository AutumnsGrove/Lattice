-- Migration 091: Username Change History
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/091_username_history.sql --remote
--
-- Tracks username (subdomain) changes for:
--   1. 30-day old-username hold period (prevents impersonation)
--   2. Redirect routing from old subdomain to new
--   3. Tier-based rate limiting of username changes
--   4. Audit trail

CREATE TABLE IF NOT EXISTS username_history (
  id TEXT PRIMARY KEY,                                         -- UUID
  tenant_id TEXT NOT NULL,                                     -- FK to tenants.id
  old_subdomain TEXT NOT NULL,                                 -- Previous subdomain
  new_subdomain TEXT NOT NULL,                                 -- New subdomain
  changed_at INTEGER NOT NULL DEFAULT (unixepoch()),           -- When the change occurred
  hold_expires_at INTEGER NOT NULL,                            -- changed_at + 30 days (unix epoch)
  released INTEGER DEFAULT 0,                                  -- 1 when hold expires and old subdomain is freed
  actor_email TEXT NOT NULL,                                   -- Email of the user who made the change
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for redirect lookups: find active holds by old subdomain (hot path on 404)
CREATE INDEX IF NOT EXISTS idx_username_history_old_subdomain
  ON username_history(old_subdomain)
  WHERE released = 0;

-- Index for tenant-scoped history (rate limiting queries, UI display)
CREATE INDEX IF NOT EXISTS idx_username_history_tenant
  ON username_history(tenant_id, changed_at DESC);

-- Index for cleanup job: find expired holds to release
CREATE INDEX IF NOT EXISTS idx_username_history_hold_expires
  ON username_history(hold_expires_at)
  WHERE released = 0;
