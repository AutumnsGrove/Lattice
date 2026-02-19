-- Curio: Clip Art Library
-- Decorative assets that can be positioned anywhere as overlays

CREATE TABLE IF NOT EXISTS clipart_placements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  x_position REAL NOT NULL DEFAULT 50,
  y_position REAL NOT NULL DEFAULT 50,
  scale REAL NOT NULL DEFAULT 1.0,
  rotation REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_clipart_placements_tenant ON clipart_placements(tenant_id, page_path);
