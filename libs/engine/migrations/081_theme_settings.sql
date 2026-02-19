-- Migration 001: Theme Settings
-- Creates the theme_settings table for storing tenant theme preferences

CREATE TABLE IF NOT EXISTS theme_settings (
  tenant_id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL DEFAULT 'grove',
  accent_color TEXT DEFAULT '#4f46e5',
  customizer_enabled INTEGER DEFAULT 0,
  custom_colors TEXT,      -- JSON
  custom_typography TEXT,  -- JSON
  custom_layout TEXT,      -- JSON
  custom_css TEXT,
  community_theme_id TEXT,
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for quick lookups by tenant
CREATE INDEX IF NOT EXISTS idx_theme_settings_tenant ON theme_settings(tenant_id);
