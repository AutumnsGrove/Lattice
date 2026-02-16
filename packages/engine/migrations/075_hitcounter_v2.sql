-- Hit Counter v2 — adds count mode (every/unique), since-date style, and visitor dedup table
-- Part of the curio safari redesign: 4 fully-realized styles, label presets, dedup

-- New config columns on existing hit_counters table
ALTER TABLE hit_counters ADD COLUMN count_mode TEXT NOT NULL DEFAULT 'every';
ALTER TABLE hit_counters ADD COLUMN since_date_style TEXT NOT NULL DEFAULT 'footnote';

-- Visitor dedup table for "unique daily" count mode
-- Stores one-way SHA-256 hashes — no PII recovery possible
-- Hash rotates daily (date is part of the input), bounding storage naturally
CREATE TABLE IF NOT EXISTS hit_counter_visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  visitor_hash TEXT NOT NULL,
  visited_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, page_path, visitor_hash, visited_date)
);

-- Lookup index: find if this visitor already counted today
CREATE INDEX IF NOT EXISTS idx_hcv_lookup
  ON hit_counter_visitors(tenant_id, page_path, visitor_hash, visited_date);

-- Cleanup index: DELETE WHERE visited_date < date('now', '-2 days')
CREATE INDEX IF NOT EXISTS idx_hcv_cleanup
  ON hit_counter_visitors(visited_date);
