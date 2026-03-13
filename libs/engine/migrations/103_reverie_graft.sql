-- ============================================================================
-- REVERIE FEATURE GRAFT
-- ============================================================================
-- Gates Reverie (AI configuration pipeline) behind greenhouse mode.
-- Reverie = "make my site cozy" natural language → coordinated API calls
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/935
-- ============================================================================

-- Reverie graft (AI-powered site configuration)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'reverie_enabled',
  'Reverie Configuration',
  'AI-powered natural language site configuration. Translates conversational requests into coordinated API calls to customize a grove.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Add tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'reverie_enabled',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);
