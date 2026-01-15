-- Migration 021: Sentinel Stress Testing System
-- Infrastructure validation and load testing for Grove
-- Results feed into The Clearing (separate service) via API

-- =============================================================================
-- SENTINEL TEST RUNS
-- =============================================================================
-- Each stress test execution is a "run" with configuration and results

CREATE TABLE IF NOT EXISTS sentinel_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Test configuration
  name TEXT NOT NULL,
  description TEXT,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('spike', 'sustained', 'oscillation', 'ramp', 'custom')),
  target_operations INTEGER NOT NULL,       -- Target number of operations
  duration_seconds INTEGER NOT NULL,        -- How long the test should run
  concurrency INTEGER DEFAULT 10,           -- Number of concurrent operations

  -- Target systems (JSON array of systems to test)
  -- e.g., ["d1_writes", "d1_reads", "kv_ops", "r2_uploads", "auth_flows"]
  target_systems TEXT NOT NULL DEFAULT '["d1_writes", "d1_reads"]',

  -- Test status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_at INTEGER,                     -- When scheduled to run (null = immediate)
  started_at INTEGER,
  completed_at INTEGER,

  -- Results summary (populated after completion)
  total_operations INTEGER DEFAULT 0,
  successful_operations INTEGER DEFAULT 0,
  failed_operations INTEGER DEFAULT 0,
  avg_latency_ms REAL,
  p50_latency_ms REAL,
  p95_latency_ms REAL,
  p99_latency_ms REAL,
  max_latency_ms REAL,
  min_latency_ms REAL,
  throughput_ops_sec REAL,                  -- Operations per second achieved

  -- Error tracking
  error_count INTEGER DEFAULT 0,
  error_types TEXT DEFAULT '{}',            -- JSON: {error_type: count}

  -- Cost estimation (Cloudflare billing)
  estimated_cost_usd REAL,

  -- Configuration snapshot (for reproducibility)
  config_snapshot TEXT,                     -- Full JSON config at time of run

  -- Metadata
  triggered_by TEXT,                        -- 'manual', 'scheduled', 'api'
  notes TEXT,
  metadata TEXT DEFAULT '{}',

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sentinel_runs_tenant ON sentinel_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_runs_status ON sentinel_runs(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_runs_scheduled ON sentinel_runs(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sentinel_runs_created ON sentinel_runs(created_at DESC);

-- =============================================================================
-- SENTINEL METRICS
-- =============================================================================
-- Detailed per-operation metrics within a test run

CREATE TABLE IF NOT EXISTS sentinel_metrics (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Operation details
  operation_type TEXT NOT NULL,             -- 'd1_write', 'd1_read', 'kv_get', 'kv_put', 'r2_upload', etc.
  operation_name TEXT,                      -- Specific operation like 'insert_post', 'fetch_settings'
  batch_index INTEGER DEFAULT 0,            -- Which batch this operation was in

  -- Timing
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  latency_ms REAL,

  -- Result
  success INTEGER NOT NULL DEFAULT 1,       -- 1 = success, 0 = failure
  error_message TEXT,
  error_code TEXT,

  -- Resource usage (if available)
  rows_affected INTEGER,                    -- For D1 operations
  bytes_transferred INTEGER,                -- For R2 operations

  metadata TEXT DEFAULT '{}',

  FOREIGN KEY (run_id) REFERENCES sentinel_runs(id) ON DELETE CASCADE
);

-- Indexes for analysis
CREATE INDEX IF NOT EXISTS idx_sentinel_metrics_run ON sentinel_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_metrics_type ON sentinel_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_sentinel_metrics_success ON sentinel_metrics(success);

-- =============================================================================
-- SENTINEL CHECKPOINTS
-- =============================================================================
-- Periodic snapshots during long-running tests

CREATE TABLE IF NOT EXISTS sentinel_checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Checkpoint timing
  checkpoint_index INTEGER NOT NULL,        -- 0, 1, 2, ... sequential
  recorded_at INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,

  -- Cumulative stats at this checkpoint
  operations_completed INTEGER NOT NULL,
  operations_failed INTEGER NOT NULL,
  current_throughput REAL,                  -- ops/sec at this moment
  avg_latency_ms REAL,

  -- Resource state
  estimated_d1_reads INTEGER,
  estimated_d1_writes INTEGER,
  estimated_kv_ops INTEGER,
  estimated_r2_ops INTEGER,

  -- System health indicators
  error_rate REAL,                          -- Percentage of failures

  metadata TEXT DEFAULT '{}',

  FOREIGN KEY (run_id) REFERENCES sentinel_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sentinel_checkpoints_run ON sentinel_checkpoints(run_id);

-- =============================================================================
-- SENTINEL BASELINES
-- =============================================================================
-- Store baseline performance metrics for comparison

CREATE TABLE IF NOT EXISTS sentinel_baselines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- What this baseline represents
  name TEXT NOT NULL,
  description TEXT,
  profile_type TEXT NOT NULL,
  target_systems TEXT NOT NULL,

  -- Baseline metrics (derived from successful runs)
  baseline_throughput REAL,                 -- Expected ops/sec
  baseline_p50_latency REAL,
  baseline_p95_latency REAL,
  baseline_p99_latency REAL,
  baseline_error_rate REAL,

  -- Thresholds for alerting
  throughput_threshold REAL,                -- Alert if below this
  latency_p95_threshold REAL,               -- Alert if above this
  error_rate_threshold REAL,                -- Alert if above this (0.01 = 1%)

  -- Source run(s) used to create this baseline
  source_run_ids TEXT,                      -- JSON array of run IDs

  is_active INTEGER DEFAULT 1,              -- Only one active baseline per profile

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sentinel_baselines_tenant ON sentinel_baselines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_baselines_profile ON sentinel_baselines(profile_type);

-- =============================================================================
-- SENTINEL SCHEDULES
-- =============================================================================
-- Recurring test schedules (for cron-triggered tests)

CREATE TABLE IF NOT EXISTS sentinel_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Schedule configuration
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,            -- e.g., '0 0 * * 0' for weekly at midnight Sunday
  timezone TEXT DEFAULT 'UTC',

  -- Test configuration (used when creating runs)
  profile_type TEXT NOT NULL,
  target_operations INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  concurrency INTEGER DEFAULT 10,
  target_systems TEXT NOT NULL DEFAULT '["d1_writes", "d1_reads"]',

  -- Maintenance mode settings
  enable_maintenance_mode INTEGER DEFAULT 1, -- Auto-enable maintenance during tests
  maintenance_message TEXT DEFAULT 'Scheduled infrastructure validation in progress',

  -- Schedule status
  is_active INTEGER DEFAULT 1,
  last_run_at INTEGER,
  last_run_id TEXT,
  next_run_at INTEGER,

  -- Alerting
  alert_on_failure INTEGER DEFAULT 1,
  alert_email TEXT,                         -- Email to notify on failures

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (last_run_id) REFERENCES sentinel_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sentinel_schedules_tenant ON sentinel_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_schedules_active ON sentinel_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_sentinel_schedules_next ON sentinel_schedules(next_run_at);

-- =============================================================================
-- NOTE: Status page tables (status_components, status_incidents, etc.)
-- are managed by The Clearing service in its own D1 database.
-- Sentinel results are pushed to Clearing via API calls.
-- =============================================================================
