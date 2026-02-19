-- Greenhouse Mode Infrastructure
-- Enables trusted tenants to access experimental features before general release

-- Greenhouse tenants table
-- Tracks which tenants are enrolled in the greenhouse program
CREATE TABLE IF NOT EXISTS greenhouse_tenants (
  tenant_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  enrolled_by TEXT,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Add greenhouse_only column to feature_flags
-- Flags with greenhouse_only=1 are only visible to greenhouse tenants
ALTER TABLE feature_flags ADD COLUMN greenhouse_only INTEGER NOT NULL DEFAULT 0;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_greenhouse_tenants_enabled ON greenhouse_tenants(enabled);
CREATE INDEX IF NOT EXISTS idx_flags_greenhouse ON feature_flags(greenhouse_only) WHERE greenhouse_only = 1;
