-- Migration: Add composite indexes for storage tier migration performance
-- Database: D1 (SQLite)
-- Run with: npx wrangler d1 execute grove-engine-db --file=migrations/018_storage_tier_indexes.sql --remote
--
-- These composite indexes optimize the post-migrator worker queries that
-- filter by storage_location AND time-based conditions.

-- =============================================================================
-- COMPOSITE INDEXES FOR MIGRATION QUERIES
-- =============================================================================

-- Composite index for hot→warm migration queries
-- Query pattern: WHERE storage_location = 'hot' AND published_at < ?
CREATE INDEX IF NOT EXISTS idx_posts_storage_published
  ON posts(storage_location, published_at);

-- Composite index for warm→cold migration queries with tenant filtering
-- Query pattern: WHERE storage_location = 'warm' AND tenant_id = ? AND published_at < ?
CREATE INDEX IF NOT EXISTS idx_posts_storage_tenant_published
  ON posts(storage_location, tenant_id, published_at);

-- Composite index for view counting in migration decisions
-- Query pattern: WHERE post_id = ? AND viewed_at > ?
-- (Already partially covered by idx_post_views_post_time, but this is more specific)
CREATE INDEX IF NOT EXISTS idx_post_views_recent
  ON post_views(post_id, viewed_at) WHERE viewed_at > 0;

-- =============================================================================
-- TENANT TIER INDEX FOR MIGRATION JOINS
-- =============================================================================

-- Index for tenant tier lookups in post-migrator joins
-- Query pattern: JOIN tenants t ON p.tenant_id = t.id (uses t.plan for tier thresholds)
-- Optimizes the frequently-joined tier lookup during migration batch processing
CREATE INDEX IF NOT EXISTS idx_tenants_plan
  ON tenants(plan);
