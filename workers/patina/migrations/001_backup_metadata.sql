-- ================================================
-- GroveBackups Metadata Database Schema
-- Version: 001
-- Description: Tracks backup jobs, results, inventory, and alert config
-- ================================================

-- Backup job history
CREATE TABLE backup_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,           -- UUID for the job
  started_at INTEGER NOT NULL,           -- Unix timestamp
  completed_at INTEGER,                  -- Unix timestamp
  status TEXT NOT NULL,                  -- 'running', 'completed', 'failed'
  trigger_type TEXT NOT NULL,            -- 'scheduled', 'manual'
  total_databases INTEGER NOT NULL,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_backup_jobs_started ON backup_jobs(started_at DESC);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);

-- Individual database backup results
CREATE TABLE backup_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- 'success', 'failed', 'skipped'
  r2_key TEXT,                           -- Path in R2
  size_bytes INTEGER,
  table_count INTEGER,
  row_count INTEGER,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  FOREIGN KEY (job_id) REFERENCES backup_jobs(job_id)
);

CREATE INDEX idx_backup_results_job ON backup_results(job_id);
CREATE INDEX idx_backup_results_db ON backup_results(database_name, started_at DESC);

-- Backup inventory (what's in R2)
CREATE TABLE backup_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT UNIQUE NOT NULL,           -- Full R2 path
  database_name TEXT NOT NULL,
  backup_date TEXT NOT NULL,             -- YYYY-MM-DD
  size_bytes INTEGER NOT NULL,
  table_count INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- When it will be cleaned up
  deleted_at INTEGER                     -- Null if still exists
);

CREATE INDEX idx_inventory_date ON backup_inventory(backup_date DESC);
CREATE INDEX idx_inventory_db ON backup_inventory(database_name);
CREATE INDEX idx_inventory_expires ON backup_inventory(expires_at) WHERE deleted_at IS NULL;

-- Alert configuration
CREATE TABLE alert_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_url TEXT,
  enabled INTEGER DEFAULT 1,
  notify_on_success INTEGER DEFAULT 0,   -- Send alert even on success
  notify_on_failure INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Insert default alert config
INSERT INTO alert_config (enabled, notify_on_success, notify_on_failure, created_at, updated_at)
VALUES (1, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'));
