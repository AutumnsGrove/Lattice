-- 055: Upload Gate Redesign
--
-- Replaces the greenhouse-only photo_gallery graft with a two-flag system:
--   image_uploads    — master switch (feature exists)
--   uploads_suspended — everyone starts suspended; per-tenant rules unsuspend
--
-- Logic: canUpload = image_uploads && !uploads_suspended
--
-- To unsuspend a tenant: add a tenant rule on uploads_suspended with result_value='false'
-- When PhotoDNA approved: UPDATE feature_flags SET default_value='false' WHERE id='uploads_suspended'
--
-- @see docs/plans/upload-gate-redesign.md

-- Master switch: the image upload feature exists and is available
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only,
  cache_ttl, created_at, updated_at
) VALUES (
  'image_uploads',
  'Image Uploads',
  'Master switch for image upload functionality. When disabled, no tenant can upload images.',
  'boolean',
  'true',
  1,
  0,
  60,
  datetime('now'),
  datetime('now')
);

-- Suspension gate: everyone starts suspended until individually unsuspended
INSERT OR IGNORE INTO feature_flags (
  id, name, description, flag_type, default_value, enabled, greenhouse_only,
  cache_ttl, created_at, updated_at
) VALUES (
  'uploads_suspended',
  'Uploads Suspended',
  'When true, image uploads are suspended for this tenant. Add a tenant rule with result_value=false to unsuspend.',
  'boolean',
  'true',
  1,
  0,
  60,
  datetime('now'),
  datetime('now')
);

-- Soft-retire photo_gallery (keep data, disable evaluation)
UPDATE feature_flags SET enabled = 0, updated_at = datetime('now')
WHERE id = 'photo_gallery';
