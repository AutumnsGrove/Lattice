-- Webring Hub Curio
-- Classic indie web feature — join and navigate webrings.
-- Phase 1: External webrings (manual prev/next URLs).

CREATE TABLE IF NOT EXISTS webring_memberships (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ring_name TEXT NOT NULL,
  ring_url TEXT DEFAULT NULL,
  prev_url TEXT NOT NULL,
  next_url TEXT NOT NULL,
  home_url TEXT DEFAULT NULL,
  badge_style TEXT NOT NULL DEFAULT 'classic',
  position TEXT NOT NULL DEFAULT 'footer',
  sort_order INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webring_memberships_tenant
  ON webring_memberships(tenant_id);
