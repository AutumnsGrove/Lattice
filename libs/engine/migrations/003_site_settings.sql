-- Migration: Create site_settings table for dynamic configuration
-- Run with: npx wrangler d1 execute autumnsgrove-git-stats --file=migrations/003_site_settings.sql

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for quick lookups by key
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Insert default font setting
INSERT INTO site_settings (setting_key, setting_value, updated_at)
VALUES ('font_family', 'alagard', strftime('%s', 'now'))
ON CONFLICT(setting_key) DO NOTHING;
