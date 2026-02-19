-- Curio: Custom Cursors
-- Custom cursor themes with optional trail effects

CREATE TABLE IF NOT EXISTS cursor_config (
  tenant_id TEXT PRIMARY KEY,
  cursor_type TEXT NOT NULL DEFAULT 'preset',
  preset TEXT DEFAULT 'leaf',
  custom_url TEXT DEFAULT NULL,
  trail_enabled INTEGER NOT NULL DEFAULT 0,
  trail_effect TEXT DEFAULT 'sparkle',
  trail_length INTEGER NOT NULL DEFAULT 8,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
