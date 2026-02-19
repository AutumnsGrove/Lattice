-- Migration: Add navigation visibility and ordering to pages table
-- This allows pages to be dynamically shown/hidden in site navigation

-- Add show_in_nav column (0 = hidden, 1 = visible in nav)
ALTER TABLE pages ADD COLUMN show_in_nav INTEGER DEFAULT 0;

-- Add nav_order column for custom ordering (lower numbers appear first)
ALTER TABLE pages ADD COLUMN nav_order INTEGER DEFAULT 0;

-- Index for efficient navigation queries
-- Optimizes: SELECT ... WHERE tenant_id = ? AND show_in_nav = 1 ORDER BY nav_order
CREATE INDEX IF NOT EXISTS idx_pages_nav ON pages(tenant_id, show_in_nav, nav_order);
