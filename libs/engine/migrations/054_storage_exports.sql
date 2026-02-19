-- Storage Exports table
-- Tracks zip export jobs for self-service data portability.
-- Each export produces a zip file in R2, with a signed download link sent via email.
-- Records expire after 7 days; cleanup runs via the webhook-cleanup cron worker.

CREATE TABLE IF NOT EXISTS storage_exports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  include_images INTEGER NOT NULL DEFAULT 1,
  delivery_method TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT,
  file_size_bytes INTEGER,
  item_counts TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_exports_tenant ON storage_exports(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_expiry ON storage_exports(status, expires_at);
