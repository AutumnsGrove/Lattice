-- Link Gardens Curio
-- Curated link collections — blogroll, friends list, cool sites.
-- The indie web's answer to algorithmic discovery.

CREATE TABLE IF NOT EXISTS link_gardens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Links',
  description TEXT DEFAULT NULL,
  style TEXT NOT NULL DEFAULT 'list',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_gardens_tenant
  ON link_gardens(tenant_id);

CREATE TABLE IF NOT EXISTS link_garden_items (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  button_image_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (garden_id) REFERENCES link_gardens(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_garden_items_garden
  ON link_garden_items(garden_id);

CREATE INDEX IF NOT EXISTS idx_link_garden_items_tenant
  ON link_garden_items(tenant_id);
