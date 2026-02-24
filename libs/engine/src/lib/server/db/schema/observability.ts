/**
 * Drizzle Schema — grove-observability-db (OBS_DB binding)
 *
 * 10 tables for time-series infrastructure metrics collected
 * by the vista-collector cron worker every 5 minutes.
 * 90-day rolling retention. Zero joins with application tables.
 *
 * Timestamp convention: ALL timestamps use INTEGER (Unix epoch seconds).
 */

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─────────────────────────────────────────────────────────────────────────────
// General Time-Series Metrics
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityMetrics = sqliteTable('observability_metrics', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	serviceName: text('service_name').notNull(),
	metricType: text('metric_type').notNull(),
	value: real('value').notNull(),
	unit: text('unit'),
	recordedAt: integer('recorded_at').notNull(),
	metadata: text('metadata'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Health Checks
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityHealthChecks = sqliteTable('observability_health_checks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	endpoint: text('endpoint').notNull(),
	statusCode: integer('status_code'),
	responseTimeMs: integer('response_time_ms'),
	isHealthy: integer('is_healthy').notNull(),
	errorMessage: text('error_message'),
	checkedAt: integer('checked_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// D1 Stats
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityD1Stats = sqliteTable('observability_d1_stats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	databaseName: text('database_name').notNull(),
	databaseId: text('database_id').notNull(),
	sizeBytes: integer('size_bytes'),
	rowsRead: integer('rows_read'),
	rowsWritten: integer('rows_written'),
	queryCount: integer('query_count').default(0),
	recordedAt: integer('recorded_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// R2 Stats
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityR2Stats = sqliteTable('observability_r2_stats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bucketName: text('bucket_name').notNull(),
	objectCount: integer('object_count'),
	totalSizeBytes: integer('total_size_bytes'),
	classAOps: integer('class_a_ops').default(0),
	classBOps: integer('class_b_ops').default(0),
	recordedAt: integer('recorded_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// KV Stats
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityKvStats = sqliteTable('observability_kv_stats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	namespaceName: text('namespace_name').notNull(),
	namespaceId: text('namespace_id').notNull(),
	reads: integer('reads').default(0),
	writes: integer('writes').default(0),
	deletes: integer('deletes').default(0),
	lists: integer('lists').default(0),
	healthStatus: text('health_status').default('unknown'),
	healthCheckedAt: integer('health_checked_at'),
	recordedAt: integer('recorded_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Durable Object Stats
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityDoStats = sqliteTable('observability_do_stats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	className: text('class_name').notNull(),
	activeCount: integer('active_count').default(0),
	hibernatingCount: integer('hibernating_count').default(0),
	storageBytes: integer('storage_bytes').default(0),
	alarmCount: integer('alarm_count').default(0),
	instrumentationStatus: text('instrumentation_status').notNull().default('awaiting_instrumentation'),
	recordedAt: integer('recorded_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Daily Cost Aggregates
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityDailyCosts = sqliteTable('observability_daily_costs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	date: text('date').notNull(),
	serviceName: text('service_name').notNull(),
	d1Reads: integer('d1_reads').default(0),
	d1Writes: integer('d1_writes').default(0),
	r2ClassA: integer('r2_class_a').default(0),
	r2ClassB: integer('r2_class_b').default(0),
	r2StorageBytes: integer('r2_storage_bytes').default(0),
	kvReads: integer('kv_reads').default(0),
	kvWrites: integer('kv_writes').default(0),
	workerRequests: integer('worker_requests').default(0),
	doRequests: integer('do_requests').default(0),
	estimatedCostUsd: real('estimated_cost_usd').default(0),
	pricingVersion: text('pricing_version').default('2026-02-18'),
}, (table) => [
	uniqueIndex('idx_obs_costs_date_service').on(table.date, table.serviceName),
]);

// ─────────────────────────────────────────────────────────────────────────────
// Alert Thresholds & Alerts
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityAlertThresholds = sqliteTable('observability_alert_thresholds', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	serviceName: text('service_name').notNull(),
	metricType: text('metric_type').notNull(),
	operator: text('operator').notNull(),
	thresholdValue: real('threshold_value').notNull(),
	severity: text('severity').notNull(),
	enabled: integer('enabled').default(1),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
}, (table) => [
	uniqueIndex('idx_obs_thresholds_service_metric').on(table.serviceName, table.metricType),
]);

export const observabilityAlerts = sqliteTable('observability_alerts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	serviceName: text('service_name').notNull(),
	severity: text('severity').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	metricType: text('metric_type'),
	metricValue: real('metric_value'),
	thresholdValue: real('threshold_value'),
	triggeredAt: integer('triggered_at').notNull(),
	resolvedAt: integer('resolved_at'),
	acknowledged: integer('acknowledged').default(0),
});

// ─────────────────────────────────────────────────────────────────────────────
// Collection Log
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityCollectionLog = sqliteTable('observability_collection_log', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	startedAt: integer('started_at').notNull(),
	completedAt: integer('completed_at'),
	durationMs: integer('duration_ms'),
	collectorsRun: integer('collectors_run').default(0),
	collectorsFailed: integer('collectors_failed').default(0),
	trigger: text('trigger').default('cron'),
	errorSummary: text('error_summary'),
});
