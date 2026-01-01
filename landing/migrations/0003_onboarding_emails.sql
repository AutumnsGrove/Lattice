-- Migration: Add onboarding email tracking to email_signups
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/0003_onboarding_emails.sql --remote
--
-- This migration adds columns to track follow-up onboarding emails for waitlist signups.
-- Email schedule:
--   - Day 0: Welcome email (existing)
--   - Day 3: What to expect / product preview
--   - Day 7: Tips + resources
--   - Day 14: Check-in + support offer

-- Add tracking columns for follow-up emails
ALTER TABLE email_signups ADD COLUMN welcome_email_sent INTEGER DEFAULT 0;
ALTER TABLE email_signups ADD COLUMN day3_email_sent INTEGER DEFAULT 0;
ALTER TABLE email_signups ADD COLUMN day7_email_sent INTEGER DEFAULT 0;
ALTER TABLE email_signups ADD COLUMN day14_email_sent INTEGER DEFAULT 0;
ALTER TABLE email_signups ADD COLUMN onboarding_emails_unsubscribed INTEGER DEFAULT 0;

-- Add name column for personalization (optional, collected later)
ALTER TABLE email_signups ADD COLUMN name TEXT;

-- Mark existing signups as having received welcome email
-- (since they would have received it at signup)
UPDATE email_signups SET welcome_email_sent = 1 WHERE welcome_email_sent IS NULL OR welcome_email_sent = 0;

-- Index for efficient querying of pending emails
CREATE INDEX IF NOT EXISTS idx_email_signups_onboarding ON email_signups(
  created_at,
  onboarding_emails_unsubscribed
) WHERE unsubscribed_at IS NULL;
