-- Curio: Weird Artifacts
-- Interactive chaos objects — Magic 8-Ball, fortune cookies, dice rollers, marquee text

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'right-vine',
  config TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_artifacts_tenant ON artifacts(tenant_id);
