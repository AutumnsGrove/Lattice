-- ============================================================================
-- PHOTO GALLERY GRAFT
-- ============================================================================
-- Gates photo gallery and image uploads behind greenhouse mode.
-- Replaces the old dual-gate system (gallery_curio_config + image_uploads_enabled)
-- with a single greenhouse-only graft toggle, matching fireside/scribe pattern.
--
-- When enabled: tenants can upload photos and their /gallery page is live.
-- When disabled: uploads are blocked and /gallery returns 404.
--
-- @see migrations/040_fireside_scribe_grafts.sql (pattern reference)
-- ============================================================================

-- Photo Gallery graft (image uploads + public gallery page)
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only
) VALUES (
  'photo_gallery',
  'Photo Gallery',
  'Upload photos and display a public gallery on your site. Images are stored in R2 with content moderation.',
  'boolean',
  'true',
  1,
  1  -- Greenhouse only: experimental feature for trusted testers
);

-- Add tenant rule for autumn-primary (Wayfinder's grove) to always have access
-- Priority 100 ensures this overrides any tier-based rules
INSERT OR IGNORE INTO flag_rules (flag_id, priority, rule_type, rule_value, result_value, enabled)
VALUES (
  'photo_gallery',
  100,
  'tenant',
  '{"tenant_id": "autumn-primary"}',
  'true',
  1
);
