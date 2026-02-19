-- Zephyr Email Gateway Database Schema
-- Migration for zephyr_logs table

-- Main logging table for all email sends
CREATE TABLE IF NOT EXISTS zephyr_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  success INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  provider TEXT,
  attempts INTEGER DEFAULT 1,
  latency_ms INTEGER,
  tenant TEXT,
  source TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  created_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  sent_at INTEGER
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_zephyr_recipient ON zephyr_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_zephyr_type ON zephyr_logs(type);
CREATE INDEX IF NOT EXISTS idx_zephyr_created ON zephyr_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_zephyr_correlation ON zephyr_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_zephyr_tenant ON zephyr_logs(tenant);
CREATE UNIQUE INDEX IF NOT EXISTS idx_zephyr_idempotency ON zephyr_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for tenant+type queries (rate limiting)
-- This index optimizes the rate limiting queries which filter by:
-- tenant, type, created_at > threshold, and success = 1
-- Partial index WHERE success = 1 avoids indexing failed sends
CREATE INDEX IF NOT EXISTS idx_zephyr_tenant_type_created ON zephyr_logs(tenant, type, created_at)
  WHERE success = 1;
