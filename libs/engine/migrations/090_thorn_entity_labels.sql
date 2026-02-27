-- ============================================================================
-- Migration 090: Thorn Entity Labels (Behavioral Layer Foundation)
-- ============================================================================
--
-- Adds persistent entity labels for Thorn's behavioral defense layer.
-- Labels give Thorn memory across events: a user blocked 3 times becomes
-- a repeat_offender, a trusted user skips AI moderation, etc.
--
-- @see docs/specs/thorn-behavioral-spec.md

-- ============================================================================
-- Entity Labels Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS thorn_entity_labels (
  -- Tenant isolation (required for all Grove tables)
  tenant_id TEXT NOT NULL,

  -- Composite key: which tenant, what entity, which label
  entity_type TEXT NOT NULL,       -- 'user' | 'ip' | 'email_domain' | 'tenant'
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,

  -- Metadata
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,                  -- NULL = permanent, otherwise ISO datetime
  added_by TEXT NOT NULL,           -- rule name ('rapid_posting') or 'wayfinder'
  reason TEXT,                      -- Human-readable reason

  PRIMARY KEY (tenant_id, entity_type, entity_id, label)
);

-- Find all labels for an entity within a tenant (the most common query)
CREATE INDEX IF NOT EXISTS idx_thorn_labels_entity
  ON thorn_entity_labels(tenant_id, entity_type, entity_id);

-- Find expired labels for cleanup
CREATE INDEX IF NOT EXISTS idx_thorn_labels_expires
  ON thorn_entity_labels(expires_at)
  WHERE expires_at IS NOT NULL;

-- Find labels added by a specific rule within a tenant (for rule tuning)
CREATE INDEX IF NOT EXISTS idx_thorn_labels_added_by
  ON thorn_entity_labels(tenant_id, added_by);

-- ============================================================================
-- Feature Flag: Thorn Behavioral Layer
-- ============================================================================

INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'thorn_behavioral',
  'Thorn Behavioral Layer',
  'boolean',
  'true',
  1,
  'Enable Thorn behavioral defense layer (entity labels, rate limiting, pattern matching before AI inference)'
);
