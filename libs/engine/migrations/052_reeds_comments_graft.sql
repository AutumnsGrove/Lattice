-- ============================================================================
-- REEDS COMMENTS GRAFT
-- ============================================================================
-- Gates the Reeds comment system behind greenhouse mode.
-- When enabled: blog posts show comment threads, visitors can leave comments,
--   and the arbor/reeds admin page is accessible for moderation.
-- When disabled: no comments are displayed or accepted, arbor nav hides Reeds.
--
-- @see migrations/049_photo_gallery_graft.sql (pattern reference)
-- @see migrations/051_reeds_comments.sql (schema for comments tables)
-- ============================================================================

-- Reeds Comments graft (comment threads on blog posts)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'reeds_comments',
  'Reeds Comments',
  'Enable threaded comments on blog posts with moderation, blocking, and private replies.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Add tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'reeds_comments',
  100,
  'tenant',
  '{"tenantIds": ["autumn-primary"]}',
  'true',
  1
);
