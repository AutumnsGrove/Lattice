-- Guestbook Curio
-- Visitor signatures with moderation, styles, and rate limiting.
-- THE classic personal web element.

-- Per-tenant guestbook configuration
CREATE TABLE IF NOT EXISTS guestbook_config (
  tenant_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'cozy',
  entries_per_page INTEGER NOT NULL DEFAULT 20,
  require_approval INTEGER NOT NULL DEFAULT 1,
  allow_emoji INTEGER NOT NULL DEFAULT 1,
  max_message_length INTEGER NOT NULL DEFAULT 500,
  custom_prompt TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Guestbook entries (visitor signatures)
CREATE TABLE IF NOT EXISTS guestbook_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Anonymous Wanderer',
  message TEXT NOT NULL,
  emoji TEXT DEFAULT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_tenant
  ON guestbook_entries(tenant_id);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_approved
  ON guestbook_entries(tenant_id, approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guestbook_entries_ip_hash
  ON guestbook_entries(tenant_id, ip_hash, created_at DESC);
