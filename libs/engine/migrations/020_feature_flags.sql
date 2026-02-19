-- ============================================================================
-- FEATURE FLAGS SCHEMA
-- ============================================================================
-- Lightweight, Cloudflare-native feature flag system supporting:
-- - Global flags (enable/disable features platform-wide)
-- - Tenant flags (per-tenant feature access)
-- - Tier flags (features gated by subscription tier)
-- - Percentage rollouts (gradual rollout with deterministic user bucketing)
-- - Kill switches (instant disable without deployment)
-- - A/B variants (multiple values per flag for experimentation)
--
-- @see docs/plans/feature-flags-spec.md
-- ============================================================================

-- Core flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,                 -- e.g., 'jxl_encoding', 'meadow_access'
  name TEXT NOT NULL,                  -- Human-readable name
  description TEXT,                    -- What this flag controls
  flag_type TEXT NOT NULL,             -- 'boolean', 'percentage', 'variant', 'tier', 'json'
  default_value TEXT NOT NULL,         -- Default when no rules match (JSON encoded)
  enabled INTEGER NOT NULL DEFAULT 1,  -- Master kill switch (0 = always returns default)
  cache_ttl INTEGER DEFAULT 60,        -- KV cache TTL in seconds (null = use default)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,                     -- User ID who created
  updated_by TEXT                      -- User ID who last updated
);

-- Rules determine flag values based on context
CREATE TABLE IF NOT EXISTS flag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,    -- Higher priority rules evaluated first
  rule_type TEXT NOT NULL,                -- 'tenant', 'tier', 'percentage', 'user', 'time', 'always'
  rule_value TEXT NOT NULL,               -- JSON: criteria for this rule
  result_value TEXT NOT NULL,             -- JSON: value to return if rule matches
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(flag_id, priority)
);

-- Audit log for flag changes
CREATE TABLE IF NOT EXISTS flag_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id TEXT NOT NULL,
  action TEXT NOT NULL,                   -- 'create', 'update', 'delete', 'enable', 'disable'
  old_value TEXT,                         -- JSON: previous state
  new_value TEXT,                         -- JSON: new state
  changed_by TEXT,                        -- User ID
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT                             -- Optional: why the change was made
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_rules_flag ON flag_rules(flag_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_rules_type ON flag_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_audit_flag ON flag_audit_log(flag_id, changed_at DESC);

-- ============================================================================
-- SEED DATA: Initial feature flags for Grove
-- ============================================================================

-- JXL Encoding flag (for gradual image compression rollout)
INSERT OR IGNORE INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES (
  'jxl_encoding',
  'JPEG XL Encoding',
  'Enable JPEG XL image compression for uploads. Controlled via percentage rollout.',
  'boolean',
  'false',
  0  -- Disabled until ready to roll out
);

-- JXL Kill Switch (instant disable, no caching)
INSERT OR IGNORE INTO feature_flags (id, name, description, flag_type, default_value, enabled, cache_ttl)
VALUES (
  'jxl_kill_switch',
  'JXL Kill Switch',
  'Emergency disable for JPEG XL encoding. When enabled, JXL is disabled regardless of other flags.',
  'boolean',
  'false',
  1,  -- Always enabled (kill switch is "on standby")
  0   -- No caching - instant effect
);

-- Meadow Access flag (tier-gated social features)
INSERT OR IGNORE INTO feature_flags (id, name, description, flag_type, default_value, enabled)
VALUES (
  'meadow_access',
  'Meadow Access',
  'Enable Meadow social features. Gated by subscription tier.',
  'boolean',
  'false',
  0  -- Disabled until Meadow launches
);
