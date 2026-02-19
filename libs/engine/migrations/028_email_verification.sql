-- Migration: Email Verification System
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/028_email_verification.sql --remote
--
-- This migration adds email verification to the onboarding flow:
--   - Adds verification status columns to user_onboarding
--   - Creates email_verifications table for verification codes
--
-- Flow: Auth → Profile → Verify Email (if not OAuth-verified) → Plans → Checkout

-- =============================================================================
-- ADD VERIFICATION STATUS TO USER_ONBOARDING
-- =============================================================================
-- Tracks whether the user's email has been verified and how

ALTER TABLE user_onboarding ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE user_onboarding ADD COLUMN email_verified_at INTEGER;
ALTER TABLE user_onboarding ADD COLUMN email_verified_via TEXT; -- 'code' or 'oauth'

-- =============================================================================
-- EMAIL VERIFICATIONS TABLE
-- =============================================================================
-- Stores pending and used verification codes
-- Codes are 6-digit, expire after 15 minutes, max 5 attempts per code

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,                  -- FK to user_onboarding.id
  email TEXT NOT NULL,                    -- Email being verified (normalized)
  code TEXT NOT NULL,                     -- 6-digit verification code
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,            -- 15 minutes after creation
  verified_at INTEGER,                    -- When code was successfully used
  attempts INTEGER DEFAULT 0,             -- Failed attempts (max 5)
  FOREIGN KEY (user_id) REFERENCES user_onboarding(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. VERIFICATION FLOW:
--    - OAuth users: If Google returns email_verified=true, auto-mark verified via 'oauth'
--    - Email/password users (future): Must verify via 6-digit code
--
-- 2. SECURITY:
--    - 6-digit codes (cryptographically random)
--    - 15-minute expiry
--    - Max 5 attempts per code (prevents brute force)
--    - Rate limit resends: 3/hour per user (enforced in KV, not DB)
--    - Codes are one-time use (verified_at set on success)
--
-- 3. EMAIL NORMALIZATION:
--    - Lowercase
--    - Trim whitespace
--    - (Gmail dot-stripping not done - users expect emails to work as entered)
--
