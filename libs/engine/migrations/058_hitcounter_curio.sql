-- Hit Counter Curio
-- Nostalgic page view counter. Privacy-first: no IP logging, just a number.
-- "You are visitor #1,247!"

CREATE TABLE IF NOT EXISTS hit_counters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  count INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'classic',
  label TEXT DEFAULT 'You are visitor',
  show_since_date INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, page_path)
);

CREATE INDEX IF NOT EXISTS idx_hit_counters_tenant
  ON hit_counters(tenant_id);
