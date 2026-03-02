-- Badges Curio v2
-- Glass ornament redesign: config table, expanded rarity, category shapes

-- Per-tenant display configuration
CREATE TABLE IF NOT EXISTS badges_config (
  tenant_id TEXT PRIMARY KEY,
  wall_layout TEXT NOT NULL DEFAULT 'shadow-box',
  showcase_style TEXT NOT NULL DEFAULT 'glowing-shelf',
  badge_size TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
