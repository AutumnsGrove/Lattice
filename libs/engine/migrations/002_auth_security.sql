-- Migration: Add security tables for rate limiting and failed attempt tracking
-- Run with: npx wrangler d1 execute autumnsgrove-git-stats --file=migrations/002_auth_security.sql

-- Table for tracking IP-based rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Index for quick lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON rate_limits(created_at);

-- Table for tracking failed verification attempts
CREATE TABLE IF NOT EXISTS failed_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  attempts INTEGER DEFAULT 0,
  last_attempt INTEGER NOT NULL,
  locked_until INTEGER
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_failed_attempts_email ON failed_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_locked ON failed_attempts(locked_until);
