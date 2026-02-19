-- Migration: Git Dashboard
-- Description: Add tables for Git Dashboard feature (GitHub stats display)
-- Date: 2026-01-19

-- =============================================================================
-- Git Dashboard Configuration (per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS git_dashboard_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    github_username TEXT,
    show_on_homepage INTEGER DEFAULT 0,  -- Whether to show stats on homepage
    cache_ttl_seconds INTEGER DEFAULT 3600,  -- How long to cache GitHub data
    settings TEXT DEFAULT '{}',  -- JSON: additional settings
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- Comments
-- =============================================================================

-- Note: This migration creates a minimal schema for the Git Dashboard feature.
--
-- Key design decisions:
-- 1. GitHub API data is NOT stored in D1 - it's fetched live and cached in KV
-- 2. This table only stores per-tenant configuration
-- 3. Actual stats, commits, and activity come from GitHub API
-- 4. Cache TTL is configurable per tenant (default 1 hour)
--
-- The Git Dashboard uses:
-- - GitHub REST API for user info, repos
-- - GitHub GraphQL API for commit stats, contributions
-- - KV storage for caching (via CACHE_KV binding)
