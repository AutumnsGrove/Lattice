-- Knowledge Base articles table
-- Stores pre-rendered KB content synced from docs/ markdown files at build time.
-- Replaces filesystem-based scanning (readdirSync + gray-matter) with D1 queries at runtime,
-- fixing hydration failures on large articles (95KB+ markdown → 250KB+ rendered HTML).
CREATE TABLE IF NOT EXISTS kb_articles (
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  html TEXT NOT NULL,
  headers_json TEXT NOT NULL DEFAULT '[]',
  excerpt TEXT DEFAULT '',
  reading_time INTEGER NOT NULL DEFAULT 1,
  last_updated TEXT,
  content_hash TEXT NOT NULL,
  related_json TEXT DEFAULT '[]',
  spec_category TEXT,
  help_section TEXT,
  exhibit_wing TEXT,
  icon TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (category, slug)
);

-- Index for category listings (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_kb_articles_category
  ON kb_articles (category, published, sort_order, title);

-- Index for content hash lookups during sync (skip unchanged articles)
CREATE INDEX IF NOT EXISTS idx_kb_articles_hash
  ON kb_articles (content_hash);
