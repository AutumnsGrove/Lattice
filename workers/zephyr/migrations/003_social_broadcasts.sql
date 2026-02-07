-- Social Broadcasts Schema
-- Phase 1: Bluesky cross-posting (immediate delivery only)
--
-- Two tables: one for the broadcast request, one for per-platform delivery results.
-- Follows the same fire-and-forget logging pattern as zephyr_logs.

-- Broadcast requests (one row per API call)
CREATE TABLE zephyr_broadcasts (
  id TEXT PRIMARY KEY,                           -- brd_ + nanoid
  content TEXT NOT NULL,                         -- Post text content
  platforms TEXT NOT NULL,                       -- JSON array of target platforms
  status TEXT NOT NULL DEFAULT 'delivered',      -- delivered | partial | failed
  tenant TEXT,                                   -- Tenant identifier
  source TEXT,                                   -- Source service
  correlation_id TEXT,                           -- Tracing correlation ID
  idempotency_key TEXT,                          -- Deduplication key
  created_at INTEGER NOT NULL,                   -- Unix timestamp ms
  processed_at INTEGER                           -- When delivery completed
);

-- Idempotency index (partial: only non-null keys)
CREATE UNIQUE INDEX idx_broadcasts_idempotency
  ON zephyr_broadcasts(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Chronological lookup
CREATE INDEX idx_broadcasts_created ON zephyr_broadcasts(created_at);

-- Per-platform delivery results (one row per platform per broadcast)
CREATE TABLE zephyr_social_deliveries (
  id TEXT PRIMARY KEY,                           -- del_ + nanoid
  broadcast_id TEXT NOT NULL REFERENCES zephyr_broadcasts(id),
  platform TEXT NOT NULL,                        -- bluesky | mastodon | devto
  success INTEGER NOT NULL,                      -- 0 or 1
  post_id TEXT,                                  -- Platform-specific post ID
  post_url TEXT,                                 -- Public URL of created post
  error_code TEXT,                               -- Error code if failed
  error_message TEXT,                            -- Human-readable error
  attempts INTEGER DEFAULT 1,                    -- Number of retry attempts
  latency_ms INTEGER,                            -- Per-platform delivery latency
  created_at INTEGER NOT NULL                    -- Unix timestamp ms
);

-- Look up deliveries for a broadcast
CREATE INDEX idx_deliveries_broadcast ON zephyr_social_deliveries(broadcast_id);
