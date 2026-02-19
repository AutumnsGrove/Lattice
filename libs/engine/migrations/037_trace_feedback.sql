-- Trace Feedback System
-- Universal inline 👍👎 feedback component for Grove
-- Privacy-preserving with IP hashing, supports optional comments
--
-- NOTE: This table is intentionally NOT tenant-scoped.
-- Trace collects feedback about Grove itself (documentation, help articles,
-- landing pages) rather than tenant-specific content. This allows Grove admins
-- to see feedback across all Grove properties in one dashboard.

-- Main feedback table
CREATE TABLE IF NOT EXISTS trace_feedback (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  comment TEXT,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  read_at INTEGER,
  archived_at INTEGER
);

-- Index for querying by source (most common admin view)
CREATE INDEX IF NOT EXISTS idx_trace_source ON trace_feedback(source_path);

-- Index for chronological listing
CREATE INDEX IF NOT EXISTS idx_trace_created ON trace_feedback(created_at DESC);

-- Composite index for deduplication checks (same IP on same path within time window)
CREATE INDEX IF NOT EXISTS idx_trace_dedup ON trace_feedback(source_path, ip_hash, created_at);

-- Index for unread feedback (admin dashboard filter)
CREATE INDEX IF NOT EXISTS idx_trace_unread ON trace_feedback(read_at) WHERE read_at IS NULL;

-- Composite index for admin dashboard vote filtering (WHERE archived_at IS NULL AND vote = ?)
CREATE INDEX IF NOT EXISTS idx_trace_active_vote ON trace_feedback(vote) WHERE archived_at IS NULL;
