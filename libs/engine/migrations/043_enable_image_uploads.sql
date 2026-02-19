-- ============================================================================
-- Migration 043: Enable Image Uploads
-- ============================================================================
-- The image_uploads_enabled flag (from 031) had default_value='false' and
-- greenhouse_only=0 with no flag_rules. This meant there was no path to
-- enable uploads for any tenant — greenhouse enrollment was ignored because
-- greenhouse_only=0, and no rules existed to match specific tenants.
--
-- Petal content moderation (vision-based CSAM detection + content
-- classification) is already active on the upload endpoint, providing
-- upload-time defense. Cloudflare's CSAM Scanning Tool provides CDN-level
-- backup. This is sufficient for launch.
--
-- This migration flips the default to true, enabling uploads for all tenants.
--
-- @see migrations/031_petal_upload_gate.sql (original gate)
-- @see docs/specs/petal-spec.md (content moderation)
-- ============================================================================

UPDATE feature_flags
SET default_value = 'true',
    updated_at = datetime('now')
WHERE id = 'image_uploads_enabled';
