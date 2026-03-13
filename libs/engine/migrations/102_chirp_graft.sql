-- ============================================================================
-- CHIRP FEATURE GRAFT
-- ============================================================================
-- Gates Chirp (direct messaging) behind greenhouse mode.
-- Chirp = 1:1 real-time messaging between mutual friends
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/1441
-- ============================================================================

-- Chirp graft (direct messaging between mutual friends)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'chirp_enabled',
  'Chirp Direct Messages',
  'Private 1:1 messaging between mutual friends. Real-time text and image sharing via Durable Objects.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Add tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'chirp_enabled',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);
