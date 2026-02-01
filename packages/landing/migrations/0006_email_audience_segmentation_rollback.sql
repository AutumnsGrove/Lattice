-- Rollback Migration: Email audience segmentation
-- Database: D1 (SQLite) - grove-engine-db
--
-- USE THIS ONLY IF: The v2 email infrastructure has issues and you need to
-- revert to the old boolean tracking columns.
--
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/0006_email_audience_segmentation_rollback.sql --remote
--
-- WARNING: This will lose sequence_stage precision. Users will be mapped back
-- to approximate boolean states based on their current sequence_stage.

-- =============================================================================
-- Step 1: Restore old tracking columns from sequence_stage
-- =============================================================================

-- Convert sequence_stage back to boolean flags
-- This is an approximation since we don't know exact send timestamps
UPDATE email_signups SET
  welcome_email_sent = CASE WHEN sequence_stage >= 0 AND last_email_at IS NOT NULL THEN 1 ELSE 0 END,
  day3_email_sent = CASE WHEN sequence_stage >= 1 THEN 1 ELSE 0 END,
  day7_email_sent = CASE WHEN sequence_stage >= 7 THEN 1 ELSE 0 END,
  day14_email_sent = CASE WHEN sequence_stage >= 14 OR sequence_stage = -1 THEN 1 ELSE 0 END
WHERE sequence_stage IS NOT NULL;

-- =============================================================================
-- Step 2: Drop v2 columns (optional - only if you want to fully revert)
-- =============================================================================

-- Uncomment these lines ONLY if you want to completely remove v2 columns:
-- ALTER TABLE email_signups DROP COLUMN audience_type;
-- ALTER TABLE email_signups DROP COLUMN sequence_stage;
-- ALTER TABLE email_signups DROP COLUMN last_email_at;
-- DROP INDEX IF EXISTS idx_email_signups_sequence;

-- =============================================================================
-- Notes:
-- =============================================================================
--
-- After running this rollback:
-- 1. Re-enable the old onboarding-emails worker
-- 2. Disable the new email-catchup worker
-- 3. Monitor email sends to ensure the old system is working
--
-- The v2 columns are kept by default so you can try again later.
-- To fully remove them, uncomment the DROP statements above.
