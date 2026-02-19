-- Rate Limit Counter Table
-- Fixes race condition by using atomic increments instead of counting logs

-- Counter table for atomic rate limiting
-- Uses sliding window buckets (minute-level granularity)
CREATE TABLE IF NOT EXISTS zephyr_rate_limits (
  -- Composite key: tenant + email type + minute bucket
  tenant TEXT NOT NULL,
  type TEXT NOT NULL,
  bucket INTEGER NOT NULL, -- Unix timestamp truncated to minute
  count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (tenant, type, bucket)
);

-- Index for cleanup of old buckets
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON zephyr_rate_limits(bucket);

-- Daily counter table for daily limits (separate to avoid huge row sizes)
CREATE TABLE IF NOT EXISTS zephyr_rate_limits_daily (
  tenant TEXT NOT NULL,
  type TEXT NOT NULL,
  bucket INTEGER NOT NULL, -- Unix timestamp truncated to day
  count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (tenant, type, bucket)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_daily_cleanup ON zephyr_rate_limits_daily(bucket);
