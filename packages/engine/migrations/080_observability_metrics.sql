-- Vista Observability Metrics Tables
-- Migration 080: Comprehensive platform monitoring for the Vista dashboard
--
-- Timestamp convention: ALL timestamps use INTEGER (Unix epoch seconds)
-- consistent with the rest of the engine schema. Use Math.floor(Date.now() / 1000)
-- in TypeScript. Never use TEXT/ISO strings for these tables.
--
-- Retention: 90-day rolling window — the daily cleanup job (vista-collector cron)
-- deletes rows older than 90 days from all time-series tables.

-- =============================================================================
-- observability_metrics — General time-series metric store
-- Primary query pattern: WHERE service_name = ? AND recorded_at > ? ORDER BY recorded_at
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  recorded_at INTEGER NOT NULL,
  metadata TEXT -- JSON string for arbitrary extra context
);

CREATE INDEX IF NOT EXISTS idx_obs_metrics_service_time
  ON observability_metrics(service_name, recorded_at);

CREATE INDEX IF NOT EXISTS idx_obs_metrics_type_time
  ON observability_metrics(metric_type, recorded_at);

-- Compound index for alert threshold evaluation:
-- WHERE service_name = ? AND metric_type = ? ORDER BY recorded_at DESC LIMIT 1
-- The two single-column indexes above cannot satisfy this pattern efficiently —
-- SQLite must pick one and post-filter on the other. This covering index avoids that.
CREATE INDEX IF NOT EXISTS idx_obs_metrics_service_type_time
  ON observability_metrics(service_name, metric_type, recorded_at DESC);

-- =============================================================================
-- observability_health_checks — HTTP health check results per worker endpoint
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,        -- Worker name or full URL slug
  status_code INTEGER,
  response_time_ms INTEGER,
  is_healthy INTEGER NOT NULL,   -- 0 or 1 (SQLite boolean)
  error_message TEXT,
  checked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_health_endpoint_time
  ON observability_health_checks(endpoint, checked_at);

-- =============================================================================
-- observability_d1_stats — D1 database size and operation counts
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_d1_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  size_bytes INTEGER,
  rows_read INTEGER,
  rows_written INTEGER,
  query_count INTEGER DEFAULT 0,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_d1_name_time
  ON observability_d1_stats(database_name, recorded_at);

-- =============================================================================
-- observability_r2_stats — R2 bucket storage and operation counts
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_r2_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_name TEXT NOT NULL,
  object_count INTEGER,
  total_size_bytes INTEGER,
  class_a_ops INTEGER DEFAULT 0, -- PUT/POST/LIST (more expensive)
  class_b_ops INTEGER DEFAULT 0, -- GET (cheaper)
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_r2_bucket_time
  ON observability_r2_stats(bucket_name, recorded_at);

-- =============================================================================
-- observability_kv_stats — KV namespace operation counts and health status
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_kv_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace_name TEXT NOT NULL,
  namespace_id TEXT NOT NULL,
  reads INTEGER DEFAULT 0,
  writes INTEGER DEFAULT 0,
  deletes INTEGER DEFAULT 0,
  lists INTEGER DEFAULT 0,
  health_status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'unavailable', 'unknown'
  health_checked_at INTEGER,            -- When the active KV health check ran
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_kv_ns_time
  ON observability_kv_stats(namespace_name, recorded_at);

-- =============================================================================
-- observability_do_stats — Durable Object class stats (self-reported)
-- Note: Shows 'awaiting_instrumentation' for DOs that haven't implemented
-- reportMetrics() — never show zeros as if healthy.
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_do_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  active_count INTEGER DEFAULT 0,
  hibernating_count INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0,
  alarm_count INTEGER DEFAULT 0,
  instrumentation_status TEXT NOT NULL DEFAULT 'awaiting_instrumentation',
  -- 'reporting', 'awaiting_instrumentation', 'unavailable'
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_do_class_time
  ON observability_do_stats(class_name, recorded_at);

-- =============================================================================
-- observability_daily_costs — Per-service daily cost aggregates
--
-- NOTE: estimated_cost_usd is calculated at collection time using the
-- CLOUDFLARE_PRICING constants active at that moment. If pricing changes,
-- historical rows are NOT retroactively recalculated — they reflect what
-- the cost *was* under the pricing in effect when collected. The raw usage
-- columns are always accurate for retroactive recalculation via script.
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_daily_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYY-MM-DD (human-readable, not epoch)
  service_name TEXT NOT NULL,
  d1_reads INTEGER DEFAULT 0,
  d1_writes INTEGER DEFAULT 0,
  r2_class_a INTEGER DEFAULT 0,
  r2_class_b INTEGER DEFAULT 0,
  r2_storage_bytes INTEGER DEFAULT 0,
  kv_reads INTEGER DEFAULT 0,
  kv_writes INTEGER DEFAULT 0,
  worker_requests INTEGER DEFAULT 0,
  do_requests INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  pricing_version TEXT DEFAULT '2026-02-18',
  UNIQUE(date, service_name)
);

CREATE INDEX IF NOT EXISTS idx_obs_costs_date
  ON observability_daily_costs(date);

-- =============================================================================
-- observability_alert_thresholds — Configurable alert rules
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_alert_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  operator TEXT NOT NULL,         -- 'gt', 'lt', 'gte', 'lte', 'eq'
  threshold_value REAL NOT NULL,
  severity TEXT NOT NULL,         -- 'info', 'warning', 'critical'
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(service_name, metric_type)
);

-- =============================================================================
-- observability_alerts — Alert history (triggered + resolved)
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL,         -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  metric_type TEXT,
  metric_value REAL,
  threshold_value REAL,
  triggered_at INTEGER NOT NULL,
  resolved_at INTEGER,            -- NULL = still active
  acknowledged INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_obs_alerts_service_time
  ON observability_alerts(service_name, triggered_at);

-- Partial index for fast "active alerts" queries (resolved_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_obs_alerts_unresolved
  ON observability_alerts(resolved_at)
  WHERE resolved_at IS NULL;

-- =============================================================================
-- observability_collection_log — Track collection runs for freshness monitoring
-- =============================================================================
CREATE TABLE IF NOT EXISTS observability_collection_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  collectors_run INTEGER DEFAULT 0,
  collectors_failed INTEGER DEFAULT 0,
  trigger TEXT DEFAULT 'cron',   -- 'cron', 'manual'
  error_summary TEXT             -- JSON: { collector: error } for failed collectors
);

CREATE INDEX IF NOT EXISTS idx_obs_collection_started
  ON observability_collection_log(started_at DESC);
