-- ============================================================================
-- 076: Meadow Social Infrastructure
-- ============================================================================
-- Creates the tables powering Meadow's community feed: aggregated posts from
-- tenant RSS feeds, votes, reactions, bookmarks, follows, and reports.
--
-- The meadow-poller worker fetches tenant feeds on a 15-minute cron cycle,
-- parses RSS 2.0 with content:encoded, and upserts into meadow_posts.
--
-- published_at stores Unix seconds (NOT milliseconds). Convert with * 1000
-- before passing to JavaScript Date constructors.
-- ============================================================================

-- Opt-in flag for tenants who want their posts in the Meadow feed
ALTER TABLE tenants ADD COLUMN meadow_opt_in INTEGER DEFAULT 0;

-- Aggregated feed items from tenant RSS feeds
CREATE TABLE IF NOT EXISTS meadow_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_html TEXT,
  link TEXT NOT NULL,
  author_name TEXT,
  author_subdomain TEXT,
  tags TEXT DEFAULT '[]',
  featured_image TEXT,
  published_at INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL,
  content_hash TEXT,
  score REAL DEFAULT 0,
  reaction_counts TEXT DEFAULT '{}',
  UNIQUE(tenant_id, guid),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_published
  ON meadow_posts(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_tenant
  ON meadow_posts(tenant_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_score
  ON meadow_posts(score DESC, published_at DESC);

-- User votes (upvote only — one per user per post)
CREATE TABLE IF NOT EXISTS meadow_votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_votes_user
  ON meadow_votes(user_id);

-- Emoji reactions (one per emoji type per user per post)
CREATE TABLE IF NOT EXISTS meadow_reactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id, emoji),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_reactions_post
  ON meadow_reactions(post_id);

-- Bookmarks (save for later)
CREATE TABLE IF NOT EXISTS meadow_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_bookmarks_user
  ON meadow_bookmarks(user_id, created_at DESC);

-- Follow relationships (user follows a tenant's feed)
CREATE TABLE IF NOT EXISTS meadow_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  followed_tenant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(follower_id, followed_tenant_id),
  FOREIGN KEY (followed_tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_follows_follower
  ON meadow_follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_meadow_follows_tenant
  ON meadow_follows(followed_tenant_id);

-- Content reports for moderation
CREATE TABLE IF NOT EXISTS meadow_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meadow_reports_status
  ON meadow_reports(status, created_at DESC);
