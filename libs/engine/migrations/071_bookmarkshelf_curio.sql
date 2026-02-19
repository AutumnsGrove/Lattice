-- Curio: Bookmark Shelf
-- Curated reading list displayed as visual bookshelf

CREATE TABLE IF NOT EXISTS bookmark_shelves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  shelf_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  cover_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  is_currently_reading INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (shelf_id) REFERENCES bookmark_shelves(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmark_shelves_tenant ON bookmark_shelves(tenant_id);
CREATE INDEX idx_bookmarks_shelf ON bookmarks(shelf_id);
CREATE INDEX idx_bookmarks_tenant ON bookmarks(tenant_id);
