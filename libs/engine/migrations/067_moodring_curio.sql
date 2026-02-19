-- Curio: Mood Ring
-- Visual mood indicator with time/manual/seasonal/random modes

CREATE TABLE IF NOT EXISTS mood_ring_config (
  tenant_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'time',
  manual_mood TEXT DEFAULT NULL,
  manual_color TEXT DEFAULT NULL,
  color_scheme TEXT NOT NULL DEFAULT 'default',
  display_style TEXT NOT NULL DEFAULT 'ring',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mood_ring_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  mood TEXT NOT NULL,
  color TEXT NOT NULL,
  note TEXT DEFAULT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_mood_ring_log_tenant ON mood_ring_log(tenant_id, logged_at);
