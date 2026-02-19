-- Migration 003: Community Themes
-- Creates the community_themes table for Oak+ tier theme sharing

CREATE TABLE IF NOT EXISTS community_themes (
  id TEXT PRIMARY KEY,
  creator_tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT,  -- JSON array
  base_theme TEXT NOT NULL,
  custom_colors TEXT,
  custom_typography TEXT,
  custom_layout TEXT,
  custom_css TEXT,
  thumbnail_path TEXT,
  downloads INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'featured', 'changes_requested', 'rejected', 'removed')),
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (creator_tenant_id) REFERENCES tenants(id)
);

-- Index for filtering by status (for moderation queue)
CREATE INDEX IF NOT EXISTS idx_community_themes_status ON community_themes(status);

-- Index for filtering by creator (for user's themes list)
CREATE INDEX IF NOT EXISTS idx_community_themes_creator ON community_themes(creator_tenant_id);

-- Index for popular themes (approved + downloads)
CREATE INDEX IF NOT EXISTS idx_community_themes_popular ON community_themes(status, downloads DESC) WHERE status = 'approved';
