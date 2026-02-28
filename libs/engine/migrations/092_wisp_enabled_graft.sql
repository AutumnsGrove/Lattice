-- ============================================================================
-- WISP ENABLED FEATURE GRAFT
-- ============================================================================
-- Promotes wisp_enabled from a tenant_settings key (migration 016) to a proper
-- graft. This gives it self-service toggling, KV caching, greenhouse-first
-- rollout, and the audit trail that all other feature flags enjoy.
--
-- The old tenant_settings rows become inert — nothing reads them anymore.
-- UI layer gates Fireside/Scribe buttons via this graft; API layer relies on
-- its own auth + subscription + rate limiting guards.
--
-- @see libs/engine/migrations/040_fireside_scribe_grafts.sql (pattern source)
-- ============================================================================

-- Wisp Writing Assistant graft (parent toggle for all Wisp features)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'wisp_enabled',
  'Wisp Writing Assistant',
  'Master toggle for the Wisp AI writing assistant. Controls visibility of Fireside, Scribe, and analysis features in the editor.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'wisp_enabled',
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
  'wisp_enabled',
  30,
  'greenhouse',
  '{}',
  'true',
  1
);
