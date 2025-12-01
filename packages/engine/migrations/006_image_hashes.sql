-- Image hashes table for duplicate detection
-- Run with: npx wrangler d1 execute your-site-posts --file=migrations/006_image_hashes.sql

CREATE TABLE IF NOT EXISTS image_hashes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_image_hashes_hash ON image_hashes(hash);
