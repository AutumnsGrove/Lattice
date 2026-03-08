-- ============================================================================
-- HUMAN.JSON: HUMAN AUTHORSHIP ASSERTION & VOUCH NETWORK
-- ============================================================================
-- Implements the human.json protocol (https://codeberg.org/robida/human.json)
-- for Grove tenants. Allows wanderers to assert human authorship of their
-- site and vouch for other sites they trust.
--
-- The protocol creates a decentralized web of trust between human-maintained
-- websites — a perfect fit for Grove's community ethos.
--
-- Stores:
--   1. Enable/disable flag via site_settings (key: 'human_json_enabled')
--   2. Vouches in a dedicated table with tenant scoping
-- ============================================================================

CREATE TABLE IF NOT EXISTS human_json_vouches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  vouched_at TEXT NOT NULL DEFAULT (date('now')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, url)
);

CREATE INDEX IF NOT EXISTS idx_human_json_vouches_tenant
  ON human_json_vouches (tenant_id);
