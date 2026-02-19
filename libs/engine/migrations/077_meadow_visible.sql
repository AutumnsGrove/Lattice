-- Migration 077: Add visible column to meadow_posts for moderation
--
-- Posts start visible by default. The report API auto-hides posts
-- after 3+ reports by setting visible = 0. Feed queries filter on visible = 1.

ALTER TABLE meadow_posts ADD COLUMN visible INTEGER DEFAULT 1;

-- Index for feed queries that filter on visibility
CREATE INDEX IF NOT EXISTS idx_meadow_posts_visible_published
  ON meadow_posts (visible, published_at DESC);
