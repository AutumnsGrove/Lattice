-- Job Index - Centralized registry of all search jobs
-- This table mirrors key metadata from Durable Objects for discoverability

CREATE TABLE IF NOT EXISTS job_index (
  job_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  business_name TEXT,
  batch_num INTEGER DEFAULT 0,
  domains_checked INTEGER DEFAULT 0,
  good_results INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_index_status ON job_index(status);
CREATE INDEX IF NOT EXISTS idx_job_index_created ON job_index(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_index_client ON job_index(client_id);
