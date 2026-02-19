-- Curio: Custom Uploads
-- User image management system used by other curios

CREATE TABLE IF NOT EXISTS custom_uploads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  r2_key TEXT NOT NULL,
  thumbnail_r2_key TEXT DEFAULT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_uploads_tenant ON custom_uploads(tenant_id);
