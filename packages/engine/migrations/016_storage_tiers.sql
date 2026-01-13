-- Migration: Add Hot/Warm/Cold Storage Tier Support
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/016_storage_tiers.sql --remote
--
-- This migration adds storage tier tracking for the Loom pattern (DO Phase 4):
-- - Hot: Active posts, frequently accessed (DO memory)
-- - Warm: Inactive posts, still in D1/DO SQLite (hibernated)
-- - Cold: Archived posts, content moved to R2 (bulk storage)
--
-- Also adds post_views table for view tracking (used by migration cron to
-- determine which posts should be migrated between tiers).

-- =============================================================================
-- POSTS TABLE MODIFICATIONS
-- =============================================================================
-- Add storage tier columns to posts table

-- storage_location: Current storage tier for this post
ALTER TABLE posts ADD COLUMN storage_location TEXT DEFAULT 'hot'
  CHECK (storage_location IN ('hot', 'warm', 'cold'));

-- r2_key: For cold storage, the R2 object key where content is stored
-- NULL when content is in D1/DO, set when migrated to R2
ALTER TABLE posts ADD COLUMN r2_key TEXT;

-- font: Font preference for post (some DOs reference this)
ALTER TABLE posts ADD COLUMN font TEXT DEFAULT 'default';

-- Index for storage tier queries (migration batch processing)
CREATE INDEX IF NOT EXISTS idx_posts_storage_location ON posts(storage_location);

-- Index for finding cold posts (R2 lookups)
CREATE INDEX IF NOT EXISTS idx_posts_r2_key ON posts(r2_key) WHERE r2_key IS NOT NULL;

-- =============================================================================
-- POST VIEWS TABLE (NEW)
-- =============================================================================
-- Tracks individual view events for accurate tier migration decisions.
-- Views older than 7 days are periodically cleaned up by the migrator worker.

CREATE TABLE IF NOT EXISTS post_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,                  -- Foreign key to posts table
  tenant_id TEXT NOT NULL,                -- Denormalized for faster queries
  session_id TEXT,                        -- Optional session ID for deduplication
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000), -- Milliseconds for precision

  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for counting views by post (most common query)
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);

-- Index for time-based queries (migration thresholds)
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);

-- Composite index for migration queries (post + time range)
CREATE INDEX IF NOT EXISTS idx_post_views_post_time ON post_views(post_id, viewed_at DESC);

-- Index for cleanup queries (delete old views)
CREATE INDEX IF NOT EXISTS idx_post_views_tenant_time ON post_views(tenant_id, viewed_at);

-- =============================================================================
-- MIGRATION STATISTICS TABLE (NEW)
-- =============================================================================
-- Tracks migration runs for monitoring and debugging

CREATE TABLE IF NOT EXISTS migration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  hot_to_warm INTEGER DEFAULT 0,
  warm_to_cold INTEGER DEFAULT 0,
  cold_to_warm INTEGER DEFAULT 0,
  errors TEXT,                           -- JSON array of error messages (NULL if no errors)
  duration_ms INTEGER,
  completed_at INTEGER
);

-- Index for recent runs
CREATE INDEX IF NOT EXISTS idx_migration_runs_time ON migration_runs(run_at DESC);

-- =============================================================================
-- UPDATE EXISTING POSTS
-- =============================================================================
-- Set all existing posts to 'hot' storage (default, they're in D1)
-- This is a no-op if the DEFAULT already applied, but ensures consistency

UPDATE posts SET storage_location = 'hot' WHERE storage_location IS NULL;

-- =============================================================================
-- POST-MIGRATION CHECKLIST
-- =============================================================================
--
-- [ ] Verify columns added to posts table
-- [ ] Verify post_views table created
-- [ ] Verify migration_runs table created
-- [ ] Verify all indexes created
-- [ ] Deploy post-migrator worker (packages/post-migrator)
-- [ ] Configure wrangler secret for manual trigger auth
-- [ ] Test migration with a few posts manually
-- [ ] Monitor first automated cron run (3 AM UTC)
--
-- =============================================================================
