-- Shelves Upgrade: Universal shelf system absorbing bookmarkshelf + linkgarden
-- Adds preset-driven configuration, 4 display modes, shelf materials,
-- and item-level rating/note/thumbnail fields.
-- All columns use defaults so no data migration is needed.

-- ── bookmark_shelves: 9 new columns ──────────────────────────────────────────

ALTER TABLE bookmark_shelves ADD COLUMN preset TEXT DEFAULT 'books';
ALTER TABLE bookmark_shelves ADD COLUMN display_mode TEXT DEFAULT 'cover-grid';
ALTER TABLE bookmark_shelves ADD COLUMN material TEXT DEFAULT 'wood';
ALTER TABLE bookmark_shelves ADD COLUMN creator_label TEXT DEFAULT 'Author';
ALTER TABLE bookmark_shelves ADD COLUMN status1_label TEXT DEFAULT 'In Progress';
ALTER TABLE bookmark_shelves ADD COLUMN status2_label TEXT DEFAULT 'Favorite';
ALTER TABLE bookmark_shelves ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE bookmark_shelves ADD COLUMN group_by_category INTEGER DEFAULT 0;
ALTER TABLE bookmark_shelves ADD COLUMN auto_favicon INTEGER DEFAULT 0;

-- ── bookmarks: 3 new columns ─────────────────────────────────────────────────

ALTER TABLE bookmarks ADD COLUMN rating INTEGER DEFAULT NULL;
ALTER TABLE bookmarks ADD COLUMN note TEXT DEFAULT NULL;
ALTER TABLE bookmarks ADD COLUMN thumbnail_url TEXT DEFAULT NULL;

-- ── Library page config (future) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_config (
  tenant_id TEXT PRIMARY KEY,
  atmosphere TEXT DEFAULT 'cozy',
  enabled INTEGER DEFAULT 0,
  rating_icon TEXT DEFAULT 'star',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Drop Link Garden tables (absorbed into Shelves) ──────────────────────────

DROP TABLE IF EXISTS link_garden_items;
DROP TABLE IF EXISTS link_gardens;
