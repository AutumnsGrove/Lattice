-- Migration: Add two-factor authentication table
-- Date: 2026-01-10

-- Two-factor authentication secrets and backup codes
CREATE TABLE IF NOT EXISTS ba_two_factor (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES ba_user(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT,
  enabled INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_ba_two_factor_user_id ON ba_two_factor(user_id);
