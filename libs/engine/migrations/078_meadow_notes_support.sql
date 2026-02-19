-- 078: Meadow Notes Support
-- Adds post_type discriminator, user_id for native authors, and body for short-form text.
-- Blooms (RSS posts) get post_type='bloom' via DEFAULT. Notes get post_type='note'.

ALTER TABLE meadow_posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'bloom';
ALTER TABLE meadow_posts ADD COLUMN user_id TEXT;
ALTER TABLE meadow_posts ADD COLUMN body TEXT;

-- Index for user profile queries ("show me my notes")
CREATE INDEX IF NOT EXISTS idx_meadow_posts_user
  ON meadow_posts(user_id, published_at DESC);

-- Index for type-filtered feeds ("show only notes" / "show only blooms")
CREATE INDEX IF NOT EXISTS idx_meadow_posts_type
  ON meadow_posts(post_type, published_at DESC);
