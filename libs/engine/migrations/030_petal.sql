-- ============================================================================
-- Migration 030: Petal Image Content Moderation
-- ============================================================================
-- Petal is Grove's 4-layer image moderation system.
-- "Petals close to protect what's precious."
--
-- Tables:
-- - petal_account_flags: Account blocking for CSAM and repeated violations
-- - petal_security_log: Security event logging (hashes only, never images)
-- - petal_ncmec_queue: NCMEC reporting queue (legal requirement)
--
-- @see docs/specs/petal-spec.md
-- ============================================================================

-- ============================================================================
-- Account Flags Table
-- ============================================================================
-- Used to block accounts after CSAM detection or repeated violations.
-- CSAM flags require manual review by Wayfinder before clearing.

CREATE TABLE IF NOT EXISTS petal_account_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  flag_type TEXT NOT NULL, -- 'csam_detection' | 'content_violations' | 'abuse_pattern'
  created_at TEXT DEFAULT (datetime('now')),

  -- Blocking behavior
  block_uploads INTEGER DEFAULT 1, -- 1 = blocked, 0 = allowed
  requires_manual_review INTEGER DEFAULT 1, -- 1 = needs Wayfinder review

  -- Review tracking
  review_status TEXT DEFAULT 'pending', -- pending | reviewed | cleared | confirmed
  reviewed_by TEXT, -- Wayfinder user ID
  reviewed_at TEXT,
  review_notes TEXT, -- Internal notes only

  -- Ensure one flag per type per user
  UNIQUE(user_id, flag_type)
);

-- Index for quick lookups during upload
CREATE INDEX IF NOT EXISTS idx_petal_flags_user
  ON petal_account_flags(user_id);

-- Index for admin review queue
CREATE INDEX IF NOT EXISTS idx_petal_flags_status
  ON petal_account_flags(review_status)
  WHERE review_status = 'pending';

-- Index for flag type queries
CREATE INDEX IF NOT EXISTS idx_petal_flags_type
  ON petal_account_flags(flag_type);

-- ============================================================================
-- Security Event Log Table
-- ============================================================================
-- Logs Petal moderation decisions for monitoring and abuse detection.
-- CRITICAL: Never stores image content - only SHA-256 hashes.

CREATE TABLE IF NOT EXISTS petal_security_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  layer TEXT NOT NULL, -- 'layer1' | 'layer2' | 'layer3' | 'layer4'
  result TEXT NOT NULL, -- 'pass' | 'block' | 'retry'

  -- Only populated for blocks
  category TEXT, -- Content category that triggered block
  confidence REAL, -- Model confidence (0-1)

  -- Content identification (NEVER the image itself)
  content_hash TEXT NOT NULL, -- SHA-256 of image

  -- Context
  feature TEXT NOT NULL, -- 'upload' | 'tryon' | 'model_farm' | 'profile'
  user_id TEXT, -- Anonymous ID for pattern detection
  tenant_id TEXT
);

-- Index for time-based queries (monitoring)
CREATE INDEX IF NOT EXISTS idx_petal_log_timestamp
  ON petal_security_log(timestamp);

-- Index for layer analysis
CREATE INDEX IF NOT EXISTS idx_petal_log_layer
  ON petal_security_log(layer);

-- Index for finding blocks
CREATE INDEX IF NOT EXISTS idx_petal_log_result
  ON petal_security_log(result)
  WHERE result = 'block';

-- Index for user pattern detection
CREATE INDEX IF NOT EXISTS idx_petal_log_user
  ON petal_security_log(user_id)
  WHERE user_id IS NOT NULL;

-- Composite index for user block history
CREATE INDEX IF NOT EXISTS idx_petal_log_user_blocks
  ON petal_security_log(user_id, result, timestamp)
  WHERE result = 'block';

-- ============================================================================
-- NCMEC Reporting Queue Table
-- ============================================================================
-- Federal law requires CSAM reports to NCMEC within 24 hours.
-- This table queues detected content for reporting.
--
-- IMPORTANT: Only stores hashes and metadata, NEVER image content.

CREATE TABLE IF NOT EXISTS petal_ncmec_queue (
  id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL, -- SHA-256 of detected content
  detected_at TEXT NOT NULL, -- When content was detected
  report_deadline TEXT NOT NULL, -- 24 hours from detection

  -- Minimal metadata for report
  user_id TEXT NOT NULL, -- For law enforcement if requested
  tenant_id TEXT,

  -- Report tracking
  reported INTEGER DEFAULT 0, -- 1 = reported to NCMEC
  reported_at TEXT,
  report_id TEXT, -- NCMEC CyberTipline report ID

  -- Error tracking
  last_attempt TEXT,
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Index for pending reports
CREATE INDEX IF NOT EXISTS idx_petal_ncmec_pending
  ON petal_ncmec_queue(reported, report_deadline)
  WHERE reported = 0;

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_petal_ncmec_user
  ON petal_ncmec_queue(user_id);

-- ============================================================================
-- Feature Flag for Petal
-- ============================================================================
-- Allows gradual rollout of Petal moderation

INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'petal_moderation',
  'Petal Image Moderation',
  'boolean',
  'true',
  1,
  'Enable Petal 4-layer image content moderation on uploads'
);

-- Flag for strict try-on validation
INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'petal_tryon_strict',
  'Petal Try-On Strict Mode',
  'boolean',
  'true',
  1,
  'Enable strict sanity checks for try-on uploads (face detection, quality)'
);

-- ============================================================================
-- Comments
-- ============================================================================
-- Security Notes:
-- 1. NEVER add columns that store image content
-- 2. content_hash is SHA-256, sufficient for deduplication and logging
-- 3. user_id may be anonymized for pattern detection
-- 4. NCMEC queue retains minimal data required by law
--
-- Retention Policy:
-- - petal_security_log: 90 days (configurable)
-- - petal_account_flags: Until cleared by review
-- - petal_ncmec_queue: Permanent (legal requirement)
