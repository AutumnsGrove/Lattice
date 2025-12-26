-- Wisp default settings
-- Run after 014_wisp.sql to set default configuration

INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
VALUES ('wisp_enabled', 'false');

INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
VALUES ('wisp_mode', 'quick');
