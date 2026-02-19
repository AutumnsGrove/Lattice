-- Amber Initial Schema
-- Reference: amber-spec.md

-- User storage quotas and usage
CREATE TABLE IF NOT EXISTS user_storage (
  user_id TEXT PRIMARY KEY,
  tier_gb INTEGER NOT NULL,
  additional_gb INTEGER DEFAULT 0,
  used_bytes INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File metadata
CREATE TABLE IF NOT EXISTS storage_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  product TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_id TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Storage add-on purchases
CREATE TABLE IF NOT EXISTS storage_addons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  addon_type TEXT NOT NULL,
  gb_amount INTEGER NOT NULL,
  stripe_subscription_item_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Export jobs
CREATE TABLE IF NOT EXISTS storage_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  export_type TEXT NOT NULL,
  filter_params TEXT,
  r2_key TEXT,
  size_bytes INTEGER,
  file_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_user ON storage_files(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_files_product ON storage_files(user_id, product, category);
CREATE INDEX IF NOT EXISTS idx_files_created ON storage_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_size ON storage_files(user_id, size_bytes DESC);
CREATE INDEX IF NOT EXISTS idx_addons_user ON storage_addons(user_id, active);
CREATE INDEX IF NOT EXISTS idx_exports_user ON storage_exports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_expiry ON storage_exports(status, expires_at);
