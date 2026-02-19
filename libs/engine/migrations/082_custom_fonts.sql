-- Migration 002: Custom Fonts
-- Creates the custom_fonts table for Evergreen tier font uploads

CREATE TABLE IF NOT EXISTS custom_fonts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sans-serif', 'serif', 'mono', 'display')),
  woff2_path TEXT NOT NULL,
  woff_path TEXT,
  file_size INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for querying fonts by tenant
CREATE INDEX IF NOT EXISTS idx_custom_fonts_tenant ON custom_fonts(tenant_id);
