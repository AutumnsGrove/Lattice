-- Activity Status Curio
-- Customizable status indicator — like Discord's custom status, but for your site.
-- "Currently: coding at 2am" — humanizes your site with a real-time signal.

CREATE TABLE IF NOT EXISTS activity_status (
  tenant_id TEXT PRIMARY KEY,
  status_text TEXT DEFAULT NULL,
  status_emoji TEXT DEFAULT NULL,
  status_type TEXT NOT NULL DEFAULT 'manual',
  preset TEXT DEFAULT NULL,
  auto_source TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
