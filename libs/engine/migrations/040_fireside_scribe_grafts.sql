-- ============================================================================
-- FIRESIDE & SCRIBE FEATURE GRAFTS
-- ============================================================================
-- Gates experimental AI-powered editor features behind greenhouse mode.
-- Fireside = AI-assisted writing prompts
-- Scribe = Voice transcription
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/640
-- ============================================================================

-- Fireside Mode graft (AI-assisted writing prompts in editor)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'fireside_mode',
  'Fireside Mode',
  'AI-assisted writing prompts in the blog editor. Shows a "Start with Fireside" button when editor is empty.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Scribe Mode graft (voice transcription in editor)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'scribe_mode',
  'Scribe Mode',
  'Voice-to-text transcription in the blog editor. Shows a microphone button for dictating content.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Add tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'fireside_mode',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);

INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'scribe_mode',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);
