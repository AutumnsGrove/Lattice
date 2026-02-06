-- Wisp default settings
-- Run after 014_wisp.sql to set default configuration
-- Uses tenant_settings (created in 009) with example tenant,
-- since site_settings now requires tenant_id (added in 005).

INSERT OR IGNORE INTO tenant_settings (tenant_id, setting_key, setting_value)
VALUES ('example-tenant-001', 'wisp_enabled', 'false');

INSERT OR IGNORE INTO tenant_settings (tenant_id, setting_key, setting_value)
VALUES ('example-tenant-001', 'wisp_mode', 'quick');
