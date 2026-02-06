-- ============================================================================
-- Migration 044: Thorn Text Content Moderation
-- ============================================================================
-- Thorn is Grove's text content moderation system.
-- "Thorns protect what's growing."
--
-- Tables:
-- - thorn_moderation_log: Every moderation decision (audit trail)
-- - thorn_flagged_content: Items needing Wayfinder review
--
-- @see docs/specs/thorn-spec.md
-- ============================================================================

-- ============================================================================
-- Moderation Log Table
-- ============================================================================
-- Every moderation decision, including allows.
-- Used for monitoring, stats, and abuse pattern detection.

CREATE TABLE IF NOT EXISTS thorn_moderation_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  user_id TEXT,
  tenant_id TEXT,

  -- What was checked
  content_type TEXT NOT NULL,  -- 'blog_post' | 'comment' | 'profile_bio'
  hook_point TEXT NOT NULL,    -- 'on_publish' | 'on_edit' | 'on_comment' | 'on_profile_update'

  -- Decision
  action TEXT NOT NULL,        -- 'allow' | 'warn' | 'flag_review' | 'block'
  categories TEXT,             -- JSON array of flagged categories
  confidence REAL,             -- Model confidence (0-1)
  model TEXT,                  -- Model used for moderation

  -- Content reference (never store actual content)
  content_ref TEXT             -- slug or ID reference to the moderated content
);

-- Index for time-based queries (dashboard)
CREATE INDEX IF NOT EXISTS idx_thorn_log_timestamp
  ON thorn_moderation_log(timestamp);

-- Index for finding non-allow actions (dashboard stats)
CREATE INDEX IF NOT EXISTS idx_thorn_log_action
  ON thorn_moderation_log(action)
  WHERE action != 'allow';

-- Index for content type analysis
CREATE INDEX IF NOT EXISTS idx_thorn_log_content_type
  ON thorn_moderation_log(content_type);

-- Index for user pattern detection
CREATE INDEX IF NOT EXISTS idx_thorn_log_user
  ON thorn_moderation_log(user_id)
  WHERE user_id IS NOT NULL;

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_thorn_log_tenant
  ON thorn_moderation_log(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- Flagged Content Table
-- ============================================================================
-- Items that need Wayfinder review.
-- Status workflow: pending -> reviewed -> cleared | removed

CREATE TABLE IF NOT EXISTS thorn_flagged_content (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- What was flagged
  user_id TEXT,
  tenant_id TEXT,
  content_type TEXT NOT NULL,   -- 'blog_post' | 'comment' | 'profile_bio'
  content_ref TEXT,             -- slug or ID reference

  -- Why it was flagged
  action TEXT NOT NULL,         -- 'flag_review' | 'block'
  categories TEXT,              -- JSON array of flagged categories
  confidence REAL,

  -- Review workflow
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'cleared' | 'removed'
  reviewed_by TEXT,             -- Wayfinder email who reviewed
  reviewed_at TEXT,
  review_notes TEXT
);

-- Index for review queue (pending items)
CREATE INDEX IF NOT EXISTS idx_thorn_flagged_status
  ON thorn_flagged_content(status)
  WHERE status = 'pending';

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_thorn_flagged_created
  ON thorn_flagged_content(created_at);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_thorn_flagged_user
  ON thorn_flagged_content(user_id)
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- Feature Flag for Thorn
-- ============================================================================
-- Allows gradual rollout of Thorn text moderation

INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'thorn_moderation',
  'Thorn Text Moderation',
  'boolean',
  'true',
  1,
  'Enable Thorn text content moderation on publish and edit'
);

-- ============================================================================
-- Notes
-- ============================================================================
-- Security:
-- 1. NEVER add columns that store actual post content
-- 2. content_ref points to the content (slug/ID), not the text itself
-- 3. categories is a JSON array from the moderation model
--
-- Retention Policy:
-- - thorn_moderation_log: 90 days (configurable via cleanupOldLogs)
-- - thorn_flagged_content: Until reviewed and resolved by Wayfinder
