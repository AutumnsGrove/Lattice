-- Curio: Personal Shrines
-- Emotionally resonant dedication boards

CREATE TABLE IF NOT EXISTS shrines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  shrine_type TEXT NOT NULL DEFAULT 'blank',
  description TEXT DEFAULT NULL,
  size TEXT NOT NULL DEFAULT 'medium',
  frame_style TEXT NOT NULL DEFAULT 'minimal',
  contents TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_shrines_tenant ON shrines(tenant_id);
