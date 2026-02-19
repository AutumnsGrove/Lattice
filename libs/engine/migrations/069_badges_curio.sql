-- Curio: Badges
-- Collectible achievement badges celebrating milestones

-- Badge definitions (what badges exist)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'achievement',
  rarity TEXT NOT NULL DEFAULT 'common',
  auto_criteria TEXT DEFAULT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Badges earned by tenants
CREATE TABLE IF NOT EXISTS tenant_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_showcased INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badge_definitions(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, badge_id)
);

-- Custom badges created by tenants (Oak+)
CREATE TABLE IF NOT EXISTS custom_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_badges_tenant ON tenant_badges(tenant_id);
CREATE INDEX idx_tenant_badges_showcased ON tenant_badges(tenant_id, is_showcased);
