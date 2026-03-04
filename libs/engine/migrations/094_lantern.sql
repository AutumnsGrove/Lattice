-- ============================================================================
-- LANTERN: CROSS-GROVE NAVIGATION
-- ============================================================================
-- Adds the lantern_friends table for manual friend connections between groves,
-- and the lantern_enabled feature graft for gating the Lantern navigation panel.
--
-- Lantern lets logged-in users hop between groves, access platform services,
-- and find their way home. In Grove mode it's "Lantern"; in standard mode
-- it's "Compass".
--
-- Phase 1: Manual friends only (no Meadow integration).
--
-- @see docs/specs/lantern-spec.md
-- ============================================================================

-- Friends table: tracks manual grove-to-grove connections
CREATE TABLE IF NOT EXISTS lantern_friends (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id         TEXT NOT NULL,
    friend_tenant_id  TEXT NOT NULL,
    friend_name       TEXT NOT NULL,
    friend_subdomain  TEXT NOT NULL,
    source            TEXT NOT NULL DEFAULT 'manual',
    added_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, friend_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_lantern_friends_tenant
    ON lantern_friends (tenant_id);

-- Lantern navigation panel graft (greenhouse only for Phase 1)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'lantern_enabled',
  'Lantern Navigation',
  'Cross-grove navigation panel. Lets logged-in users hop between groves, access platform services, and find their way home.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'lantern_enabled',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);

-- Greenhouse rule so all greenhouse tenants get access
-- Priority 30 (standard greenhouse tier)
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'lantern_enabled',
  30,
  'greenhouse',
  '{}',
  'true',
  1
);
