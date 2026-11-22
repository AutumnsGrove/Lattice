-- Migration 127: cdn_files' foreign key points at a table that was renamed away
-- Database: D1 (SQLite) - grove-engine-db
--
-- Same defect as 126's, one table over, and the same reason it went unnoticed.
-- `107_fix_users_schema.sql` rebuilds `users` via a `_users_107_backup`
-- intermediate table and renames it back. Whether SQLite rewrites the
-- `REFERENCES` clause in *other* tables during that rename depends on the
-- build:
--
--   SQLite 3.51 (this machine)  → cdn_files ends up pointing at users(id)
--   SQLite 3.45 (CI runner)     → cdn_files still points at _users_107_backup
--
-- Production is correct, so this is a rebuild that changes nothing there and
-- removes a dangling key from every fresh bootstrap. Verified against
-- production before writing it: 23 rows, and nothing references cdn_files.
--
-- It was surfaced by the weekly drift check failing in CI while passing
-- locally — which is the whole reason the check runs somewhere other than a
-- laptop.

CREATE TABLE cdn_files_new (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  folder TEXT DEFAULT '/',
  alt_text TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Explicit column list: the source table's column order is 0011_cdn.sql's, and
-- a positional copy is exactly the trap 116 documented.
INSERT INTO cdn_files_new (
  id, filename, original_filename, key, content_type, size_bytes,
  folder, alt_text, uploaded_by, created_at
)
SELECT
  id, filename, original_filename, key, content_type, size_bytes,
  folder, alt_text, uploaded_by, created_at
FROM cdn_files;

DROP TABLE cdn_files;

ALTER TABLE cdn_files_new RENAME TO cdn_files;

-- DROP TABLE takes these with it. Both on the old table and in 0011_cdn.sql.
CREATE INDEX IF NOT EXISTS idx_cdn_files_folder
  ON cdn_files(folder, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cdn_files_key
  ON cdn_files(key);

CREATE INDEX IF NOT EXISTS idx_cdn_files_uploaded_by
  ON cdn_files(uploaded_by);
