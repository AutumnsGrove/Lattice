-- JXL Format Tracking Migration
-- Adds format tracking to support JPEG XL encoding analytics
--
-- USAGE: wrangler d1 migrations apply groveengine-db --remote
--
-- IDEMPOTENCY: This migration is safe to run multiple times.
-- - CREATE TABLE IF NOT EXISTS: Safe for tables
-- - CREATE INDEX IF NOT EXISTS: Safe for indexes
-- - INSERT OR IGNORE: Safe for seed data
-- - ALTER TABLE: D1 migration system tracks which migrations have run, preventing re-runs.
--   If manually executing, duplicate column errors are non-fatal and can be ignored.

-- =============================================================================
-- Update image_hashes table to track format conversions
-- =============================================================================

-- Add columns for format tracking and compression analytics
-- SQLite ALTER TABLE ADD COLUMN will fail if column exists (non-fatal error)
-- D1 migrations system ensures this file only runs once per database

-- Track output format (jxl, webp, gif, original)
ALTER TABLE image_hashes ADD COLUMN image_format TEXT DEFAULT 'webp';

-- Track input format for analytics
ALTER TABLE image_hashes ADD COLUMN original_format TEXT;

-- Track sizes for compression ratio analytics
ALTER TABLE image_hashes ADD COLUMN original_size_bytes INTEGER;
ALTER TABLE image_hashes ADD COLUMN stored_size_bytes INTEGER;

-- =============================================================================
-- Create JXL encoding metrics table for analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS jxl_encoding_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,

  -- Encoding outcome
  success INTEGER NOT NULL DEFAULT 1,      -- 1 = success, 0 = fallback to WebP
  fallback_reason TEXT,                    -- Error message if fallback

  -- Performance metrics
  encoding_time_ms INTEGER,                -- Time to encode
  original_size_bytes INTEGER NOT NULL,
  encoded_size_bytes INTEGER NOT NULL,

  -- Image metadata
  width INTEGER,
  height INTEGER,
  quality INTEGER,                         -- Quality setting used (0-100)
  effort INTEGER,                          -- Effort level used (1-10)

  -- Environment
  user_agent TEXT,                         -- Browser info for compatibility tracking
  device_type TEXT,                        -- mobile/desktop

  -- Timestamp
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_jxl_metrics_tenant ON jxl_encoding_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jxl_metrics_success ON jxl_encoding_metrics(success);
CREATE INDEX IF NOT EXISTS idx_jxl_metrics_created ON jxl_encoding_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_jxl_metrics_tenant_date ON jxl_encoding_metrics(tenant_id, created_at);

-- Index on image_hashes for format queries
CREATE INDEX IF NOT EXISTS idx_image_hashes_format ON image_hashes(image_format);

-- =============================================================================
-- Feature flag seeds for JXL rollout
-- =============================================================================

-- JXL encoding feature flag (disabled by default for safe rollout)
INSERT OR IGNORE INTO feature_flags (
  key,
  name,
  description,
  flag_type,
  default_value,
  enabled,
  created_at,
  updated_at
) VALUES (
  'jxl_encoding',
  'JPEG XL Encoding',
  'Enable JPEG XL encoding for image uploads. Falls back to WebP if browser does not support WASM JXL encoder.',
  'boolean',
  'false',
  0,
  datetime('now'),
  datetime('now')
);

-- JXL kill switch (enabled = encoding allowed, disabled = force WebP)
INSERT OR IGNORE INTO feature_flags (
  key,
  name,
  description,
  flag_type,
  default_value,
  enabled,
  created_at,
  updated_at
) VALUES (
  'jxl_kill_switch',
  'JPEG XL Kill Switch',
  'Emergency kill switch for JXL encoding. When disabled, all uploads fall back to WebP regardless of jxl_encoding flag.',
  'boolean',
  'true',
  1,
  datetime('now'),
  datetime('now')
);

-- JXL percentage rollout flag for gradual enablement
INSERT OR IGNORE INTO feature_flags (
  key,
  name,
  description,
  flag_type,
  default_value,
  enabled,
  created_at,
  updated_at
) VALUES (
  'jxl_rollout_percentage',
  'JPEG XL Rollout Percentage',
  'Percentage of users who get JXL encoding. Use for gradual rollout (0-100).',
  'number',
  '0',
  1,
  datetime('now'),
  datetime('now')
);
