-- Drop observability tables from grove-engine-db
-- These tables have been migrated to grove-observability-db
-- See: libs/engine/migrations/observability/001_initial_schema.sql

DROP TABLE IF EXISTS observability_collection_log;
DROP TABLE IF EXISTS observability_alerts;
DROP TABLE IF EXISTS observability_alert_thresholds;
DROP TABLE IF EXISTS observability_daily_costs;
DROP TABLE IF EXISTS observability_do_stats;
DROP TABLE IF EXISTS observability_kv_stats;
DROP TABLE IF EXISTS observability_r2_stats;
DROP TABLE IF EXISTS observability_d1_stats;
DROP TABLE IF EXISTS observability_health_checks;
DROP TABLE IF EXISTS observability_metrics;
