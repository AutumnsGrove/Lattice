-- Migration: Create magic_codes table for email authentication
-- Run with: npx wrangler d1 execute autumnsgrove-git-stats --file=migrations/001_magic_codes.sql

CREATE TABLE IF NOT EXISTS magic_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);

-- Index for quick lookups by email and code
CREATE INDEX IF NOT EXISTS idx_magic_codes_email ON magic_codes(email);
CREATE INDEX IF NOT EXISTS idx_magic_codes_lookup ON magic_codes(email, code, used);
