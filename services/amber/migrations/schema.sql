-- Amber Database Schema
-- Cloudflare D1 (SQLite)

-- User storage quotas and usage
CREATE TABLE IF NOT EXISTS user_storage (
  user_id TEXT PRIMARY KEY,
  tier_gb INTEGER NOT NULL DEFAULT 0,
  additional_gb INTEGER DEFAULT 0,
  used_bytes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- File metadata
CREATE TABLE IF NOT EXISTS storage_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('blog', 'ivy', 'profile', 'themes')),
  category TEXT NOT NULL,
  parent_id TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_storage(user_id)
);

-- Storage add-on purchases
CREATE TABLE IF NOT EXISTS storage_addons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('storage_10gb', 'storage_50gb', 'storage_100gb')),
  gb_amount INTEGER NOT NULL,
  stripe_subscription_item_id TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_storage(user_id)
);

-- Export jobs
CREATE TABLE IF NOT EXISTS storage_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_type TEXT NOT NULL CHECK (export_type IN ('full', 'blog', 'ivy', 'category')),
  filter_params TEXT,
  r2_key TEXT,
  size_bytes INTEGER,
  file_count INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES user_storage(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user ON storage_files(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_files_product ON storage_files(user_id, product, category);
CREATE INDEX IF NOT EXISTS idx_files_created ON storage_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_size ON storage_files(user_id, size_bytes DESC);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON storage_files(r2_key);
CREATE INDEX IF NOT EXISTS idx_addons_user ON storage_addons(user_id, active);
CREATE INDEX IF NOT EXISTS idx_exports_user ON storage_exports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_expiry ON storage_exports(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON storage_files(deleted_at) WHERE deleted_at IS NOT NULL;
