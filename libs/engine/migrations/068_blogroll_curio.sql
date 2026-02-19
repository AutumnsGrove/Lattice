-- Curio: Blogroll
-- Blog recommendations with RSS feed tracking

CREATE TABLE IF NOT EXISTS blogroll_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  feed_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  last_post_title TEXT DEFAULT NULL,
  last_post_url TEXT DEFAULT NULL,
  last_post_date TEXT DEFAULT NULL,
  last_feed_check TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_blogroll_items_tenant ON blogroll_items(tenant_id);
