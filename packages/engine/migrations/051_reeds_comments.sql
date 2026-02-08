-- ============================================================================
-- 051: Reeds Comments System
-- ============================================================================
-- Dual-mode comment system: private replies (author-only) and public comments
-- (author-moderated). Whisper together at the water's edge.
--
-- Tables: comments, comment_rate_limits, blocked_commenters, comment_settings
-- ============================================================================

-- Main comments table
-- Stores both private replies (is_public = 0) and public comments (is_public = 1)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_email TEXT NOT NULL DEFAULT '',
  parent_id TEXT,

  -- Content
  content TEXT NOT NULL,
  content_html TEXT,

  -- Type: 1 = public comment, 0 = private reply
  is_public INTEGER NOT NULL DEFAULT 1,

  -- Moderation status
  -- 'pending'  = awaiting author approval (public only)
  -- 'approved' = visible to everyone (public) or delivered (private)
  -- 'rejected' = hidden by author
  -- 'spam'     = auto-flagged by Thorn
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_note TEXT,
  moderated_at TEXT,
  moderated_by TEXT,

  -- Timestamps (ISO strings via TenantDb, unix fallback via DEFAULT)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_tenant ON comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- Rate limiting table
-- Tracks comment/reply counts per user per time window
CREATE TABLE IF NOT EXISTS comment_rate_limits (
  user_id TEXT NOT NULL,
  limit_type TEXT NOT NULL,  -- 'public_comment' or 'private_reply'
  period_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, limit_type)
);

-- Composite index for rate limit lookups by period
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON comment_rate_limits(user_id, limit_type, period_start);

-- Blocked commenters table
-- Blog authors can block specific users from commenting
CREATE TABLE IF NOT EXISTS blocked_commenters (
  tenant_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (tenant_id, blocked_user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Comment settings table
-- Per-blog comment configuration
CREATE TABLE IF NOT EXISTS comment_settings (
  tenant_id TEXT PRIMARY KEY,

  comments_enabled INTEGER DEFAULT 1,
  public_comments_enabled INTEGER DEFAULT 1,
  who_can_comment TEXT DEFAULT 'anyone',  -- 'anyone', 'grove_members', 'paid_only'
  show_comment_count INTEGER DEFAULT 1,

  -- Author notification preferences
  notify_on_reply INTEGER DEFAULT 1,
  notify_on_pending INTEGER DEFAULT 1,
  notify_on_thread_reply INTEGER DEFAULT 1,

  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Feature flag for gradual rollout
INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description, created_at, updated_at)
VALUES (
  'reeds_comments',
  'Reeds Comments',
  'boolean',
  'false',
  1,
  'Enable the Reeds comment system on blog posts',
  datetime('now'),
  datetime('now')
);

-- Enable for all paid tiers
INSERT OR IGNORE INTO flag_rules (id, flag_id, priority, rule_type, rule_value, result_value, enabled, created_at, updated_at)
VALUES (
  'reeds_comments_paid',
  'reeds_comments',
  1,
  'tier',
  '["seedling","sapling","oak","evergreen"]',
  'true',
  1,
  datetime('now'),
  datetime('now')
);

-- Default deny for free tier
INSERT OR IGNORE INTO flag_rules (id, flag_id, priority, rule_type, rule_value, result_value, enabled, created_at, updated_at)
VALUES (
  'reeds_comments_default',
  'reeds_comments',
  10,
  'always',
  '{}',
  'false',
  1,
  datetime('now'),
  datetime('now')
);
