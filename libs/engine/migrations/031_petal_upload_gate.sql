-- ============================================================================
-- Migration 031: Petal Image Upload Gate
-- ============================================================================
-- Gates image uploads behind a feature flag until PhotoDNA hash-based
-- CSAM detection is integrated.
--
-- DEPENDENCIES:
-- - 030_petal.sql (Petal tables must exist)
-- - feature_flags table (created in earlier migration)
--
-- CONTEXT:
-- The Petal spec requires hash-based CSAM detection (PhotoDNA) for Layer 1,
-- but this requires vetting/approval from Microsoft (~1 week via Tech Coalition).
--
-- Until PhotoDNA is integrated:
-- - Image uploads are DISABLED by default
-- - Can be enabled per-tenant for trusted beta users via grafts
-- - Cloudflare CSAM Scanning Tool provides CDN-level backup defense
-- - Vision-based detection provides interim upload-time defense
--
-- After PhotoDNA is integrated:
-- - Enable this flag globally
-- - Update Layer 1 to use hash-based detection as primary
--
-- @see docs/specs/petal-spec.md Section 3
-- @see TODOS.md "NCMEC CyberTipline Integration" section
-- ============================================================================

-- Feature flag for image upload availability
-- DEFAULT: false (disabled until PhotoDNA is integrated)
INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'image_uploads_enabled',
  'Image Uploads Enabled',
  'boolean',
  'false',
  1,
  'Enable image uploads. DISABLED by default until PhotoDNA hash-based CSAM detection is integrated. Can be enabled per-tenant for trusted beta users.'
);

-- Also add a flag for when PhotoDNA is ready (for documentation)
INSERT OR IGNORE INTO feature_flags (id, name, flag_type, default_value, enabled, description)
VALUES (
  'petal_photodna_enabled',
  'PhotoDNA Hash Detection',
  'boolean',
  'false',
  0,
  'PhotoDNA hash-based CSAM detection is integrated and active. Enable this when Microsoft PhotoDNA vetting is complete.'
);
