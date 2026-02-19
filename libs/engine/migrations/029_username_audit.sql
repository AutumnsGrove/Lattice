-- Migration: Username Reservation Audit Log
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/029_username_audit.sql --remote
--
-- This migration adds an audit log for reserved username changes.
-- Tracks who added/removed reservations and when, for compliance and accountability.

-- =============================================================================
-- USERNAME AUDIT LOG TABLE
-- =============================================================================
-- Records all changes to the reserved_usernames table

CREATE TABLE IF NOT EXISTS username_audit_log (
  id TEXT PRIMARY KEY,                    -- UUID
  action TEXT NOT NULL,                   -- 'add' or 'remove'
  username TEXT NOT NULL,                 -- The username affected
  reason TEXT,                            -- Reason for reservation (for add)
  actor_email TEXT NOT NULL,              -- Email of admin who made the change
  actor_id TEXT,                          -- Heartwood ID if available
  notes TEXT,                             -- Optional notes explaining the change
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for querying audit history
CREATE INDEX IF NOT EXISTS idx_username_audit_username ON username_audit_log(username);
CREATE INDEX IF NOT EXISTS idx_username_audit_actor ON username_audit_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_username_audit_action ON username_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_username_audit_created ON username_audit_log(created_at);

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. AUDIT LOG RETENTION:
--    - Logs are kept indefinitely for compliance
--    - Consider implementing a cleanup policy for logs older than 2 years
--
-- 2. ACTOR TRACKING:
--    - actor_email is required (from session)
--    - actor_id is optional (may not be available in all contexts)
--
-- 3. NOTES FIELD:
--    - Used for explaining why a username was reserved/released
--    - Helpful for future reference when reviewing reservations
--
