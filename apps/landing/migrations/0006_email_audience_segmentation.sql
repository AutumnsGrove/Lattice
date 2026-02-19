-- Migration: Email audience segmentation for v2 infrastructure
-- Database: D1 (SQLite) - grove-engine-db
-- Issue: #453
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/0006_email_audience_segmentation.sql --remote
--
-- This migration adds audience segmentation to support different email sequences
-- for different user types (waitlist, trial, rooted).
--
-- Changes:
--   - audience_type: 'waitlist' | 'trial' | 'rooted'
--   - sequence_stage: Replaces individual day*_sent columns
--     - 0 = welcome sent
--     - 1, 7, 14, 30 = days since signup
--     - -1 = sequence complete
--   - last_email_at: ISO timestamp for catch-up cron

-- =============================================================================
-- Step 1: Add new columns
-- =============================================================================

-- Audience type: wanderer (landing), promo (plant), rooted (subscriber)
ALTER TABLE email_signups ADD COLUMN audience_type TEXT DEFAULT 'wanderer';

-- Sequence stage: which email in the sequence they're on
-- Values: 0 (welcome), 1, 7, 14, 30, -1 (complete)
ALTER TABLE email_signups ADD COLUMN sequence_stage INTEGER DEFAULT 0;

-- Last email timestamp for catch-up cron
ALTER TABLE email_signups ADD COLUMN last_email_at TEXT;

-- =============================================================================
-- Step 2: Migrate existing data from old tracking columns
-- =============================================================================

-- Convert old boolean flags to sequence_stage
-- Logic: Find the highest email that was sent and set next stage
UPDATE email_signups SET sequence_stage =
  CASE
    WHEN day14_email_sent = 1 THEN -1  -- Sequence complete (was on day 14, no day 30 in old system)
    WHEN day7_email_sent = 1 THEN 14   -- Next email is day 14
    WHEN day3_email_sent = 1 THEN 7    -- Next email is day 7 (we're changing day 3 to day 1)
    WHEN welcome_email_sent = 1 THEN 1 -- Next email is day 1
    ELSE 0                              -- Hasn't received welcome yet
  END
WHERE sequence_stage = 0 OR sequence_stage IS NULL;

-- Set last_email_at for users who have received emails
-- Use created_at + days as approximation
UPDATE email_signups SET last_email_at =
  CASE
    WHEN day14_email_sent = 1 THEN datetime(created_at, '+14 days')
    WHEN day7_email_sent = 1 THEN datetime(created_at, '+7 days')
    WHEN day3_email_sent = 1 THEN datetime(created_at, '+3 days')
    WHEN welcome_email_sent = 1 THEN created_at
    ELSE NULL
  END
WHERE last_email_at IS NULL AND welcome_email_sent = 1;

-- =============================================================================
-- Step 3: Create optimized index for catch-up cron
-- =============================================================================

-- Index for finding users who need catch-up emails
-- Covers: audience type, sequence stage, and timing
CREATE INDEX IF NOT EXISTS idx_email_signups_sequence ON email_signups(
  audience_type,
  sequence_stage,
  last_email_at
) WHERE unsubscribed_at IS NULL AND onboarding_emails_unsubscribed = 0;

-- =============================================================================
-- Notes:
-- =============================================================================
--
-- The old columns (welcome_email_sent, day3_email_sent, day7_email_sent,
-- day14_email_sent, onboarding_emails_unsubscribed) are kept for backward
-- compatibility with the existing cron worker during transition.
--
-- After the v2 email infrastructure is fully deployed and verified:
-- 1. Deploy the new email-catchup worker
-- 2. Disable the old onboarding-emails worker
-- 3. Run cleanup migration to drop old columns:
--
--    ALTER TABLE email_signups DROP COLUMN welcome_email_sent;
--    ALTER TABLE email_signups DROP COLUMN day3_email_sent;
--    ALTER TABLE email_signups DROP COLUMN day7_email_sent;
--    ALTER TABLE email_signups DROP COLUMN day14_email_sent;
--    DROP INDEX IF EXISTS idx_email_signups_onboarding;
--
