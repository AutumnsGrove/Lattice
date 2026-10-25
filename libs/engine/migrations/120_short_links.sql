-- 120_short_links.sql
-- Short links served from link.grove.place/{slug} (issue #1593)
--
-- Two kinds of link share one table so the redirect worker does a single lookup:
--
--   post    A Wanderer's bloom. Keyed by post_id, never by URL, so the link
--           always resolves to the post's *current* slug (renames just work)
--           and a post only ever has one short link.
--   custom  A chosen slug pointing at an explicit https URL. tenant_id is the
--           owning grove (target must live there); NULL means the Wayfinder's
--           own link, which may point anywhere.
--
-- Deleting a link sets disabled_at instead of removing the row, so a slug that
-- was ever shared can never silently start pointing somewhere else.
-- post_id has no foreign key on purpose: a deleted post leaves its link behind
-- and the worker answers 410 for it.

CREATE TABLE IF NOT EXISTS short_links (
  slug TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('post', 'custom')),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  post_id TEXT,
  target_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  disabled_at INTEGER,
  click_count INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (kind = 'post' AND tenant_id IS NOT NULL AND post_id IS NOT NULL AND target_url IS NULL)
    OR (kind = 'custom' AND post_id IS NULL AND target_url IS NOT NULL)
  )
);

-- One short link per post, ever.
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_post
  ON short_links(post_id) WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_short_links_tenant
  ON short_links(tenant_id, created_at DESC);
