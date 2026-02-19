-- Status Badges Curio
-- Site status indicators — small, expressive badges that signal the state
-- of your site. Free for all tiers.

CREATE TABLE IF NOT EXISTS status_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'floating',
  animated INTEGER NOT NULL DEFAULT 1,
  custom_text TEXT DEFAULT NULL,
  show_date INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_badges_tenant
  ON status_badges(tenant_id);
