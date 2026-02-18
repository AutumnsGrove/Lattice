/**
 * Vista Observability — Main Barrel Export
 *
 * Exports the collector factory, all types, and query functions for the API endpoints.
 * Import from '@autumnsgrove/groveengine/server/observability'
 *
 * @module server/observability
 */

// Core factory
export { createObservabilityCollector } from "./scheduler.js";
export type { ObservabilityEnv, ObservabilityCollector } from "./scheduler.js";

// Types and service registry
export type {
	WorkerMetrics,
	D1Metrics,
	R2Metrics,
	KVMetrics,
	DurableObjectMetrics,
	DOInstanceMetrics,
	HealthCheckResult,
	HealthStatus,
	CostBreakdown,
	AlertSeverity,
	AlertThreshold,
	ObservabilityAlert,
	CollectorResult,
	CollectionResult,
	LumenAggregateResult,
	ModerationAggregateResult,
	SentinelAggregateResult,
	ClearingAggregateResult,
	WardenAggregateResult,
	MeadowAggregateResult,
	FireflyAggregateResult,
	WorkerRegistryEntry,
	D1RegistryEntry,
	R2RegistryEntry,
	KVRegistryEntry,
	DORegistryEntry,
} from "./types.js";

export { SERVICE_REGISTRY } from "./types.js";

// Cost calculations
export {
	CLOUDFLARE_PRICING,
	FIREFLY_PROVIDER_PRICING,
	PRICING_LAST_VERIFIED,
	calculateDailyCosts,
	projectMonthly,
	calculateFireflySessionCost,
} from "./costs.js";

// Individual collectors (for direct use when needed)
export { collectWorkerMetrics } from "./collectors/cloudflare-analytics.js";
export { collectD1Metrics } from "./collectors/d1-collector.js";
export { collectR2Metrics } from "./collectors/r2-collector.js";
export { collectKVMetrics } from "./collectors/kv-collector.js";
export { runHealthChecks, getLatestHealthChecks } from "./collectors/health-checker.js";
export { collectDOMetrics, getLatestDOMetrics } from "./collectors/do-collector.js";

// Aggregators
export { aggregateLumen } from "./aggregators/lumen-aggregator.js";
export { aggregatePetal } from "./aggregators/petal-aggregator.js";
export type { PetalAggregateResult } from "./aggregators/petal-aggregator.js";
export { aggregateThorn } from "./aggregators/thorn-aggregator.js";
export type { ThornAggregateResult } from "./aggregators/thorn-aggregator.js";
export { aggregateSentinel } from "./aggregators/sentinel-aggregator.js";
export { aggregateClearing } from "./aggregators/clearing-aggregator.js";
export { aggregateWarden } from "./aggregators/warden-aggregator.js";
export { aggregateMeadow } from "./aggregators/meadow-aggregator.js";
export { aggregateFirefly } from "./aggregators/firefly-aggregator.js";

// =============================================================================
// Query Functions — read from observability tables for API endpoints
// =============================================================================

/**
 * Get a full overview summary: health statuses, active alerts, last collection time.
 */
export async function getObservabilityOverview(db: D1Database): Promise<{
	lastCollectionAt: number | null;
	activeAlerts: number;
	healthSummary: Array<{ endpoint: string; isHealthy: boolean; checkedAt: number }>;
	collectionTokenConfigured: boolean;
}> {
	const [lastCollection, activeAlerts, healthChecks] = await Promise.allSettled([
		db
			.prepare(
				`SELECT completed_at FROM observability_collection_log
         WHERE completed_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT 1`,
			)
			.first<{ completed_at: number }>(),

		db
			.prepare(
				`SELECT COUNT(*) as count FROM observability_alerts
         WHERE resolved_at IS NULL`,
			)
			.first<{ count: number }>(),

		db
			.prepare(
				`SELECT h1.endpoint, h1.is_healthy, h1.checked_at
         FROM observability_health_checks h1
         WHERE h1.checked_at = (
           SELECT MAX(h2.checked_at) FROM observability_health_checks h2
           WHERE h2.endpoint = h1.endpoint
         )`,
			)
			.all<{ endpoint: string; is_healthy: number; checked_at: number }>(),
	]);

	const lastAt =
		lastCollection.status === "fulfilled" ? (lastCollection.value?.completed_at ?? null) : null;
	const alerts = activeAlerts.status === "fulfilled" ? (activeAlerts.value?.count ?? 0) : 0;
	const health = healthChecks.status === "fulfilled" ? (healthChecks.value.results ?? []) : [];

	return {
		lastCollectionAt: lastAt,
		activeAlerts: alerts,
		healthSummary: health.map((h) => ({
			endpoint: h.endpoint,
			isHealthy: h.is_healthy === 1,
			checkedAt: h.checked_at,
		})),
		// Token configured is determined by checking if we have any non-unavailable CF collector runs
		collectionTokenConfigured: false, // Set by the API endpoint based on env
	};
}

/**
 * Get the latest worker metrics from the observability_metrics table.
 */
export async function getWorkerMetrics(
	db: D1Database,
	hoursBack = 24,
): Promise<
	Array<{
		serviceName: string;
		metricType: string;
		value: number;
		recordedAt: number;
		metadata: Record<string, unknown> | null;
	}>
> {
	const since = Math.floor(Date.now() / 1000) - hoursBack * 3600;

	const result = await db
		.prepare(
			`SELECT service_name, metric_type, value, recorded_at, metadata
       FROM observability_metrics
       WHERE recorded_at >= ?
       ORDER BY recorded_at DESC`,
		)
		.bind(since)
		.all<{
			service_name: string;
			metric_type: string;
			value: number;
			recorded_at: number;
			metadata: string | null;
		}>()
		.catch(() => ({ results: [] }));

	return (result.results ?? []).map((r) => ({
		serviceName: r.service_name,
		metricType: r.metric_type,
		value: r.value,
		recordedAt: r.recorded_at,
		metadata: r.metadata ? (JSON.parse(r.metadata) as Record<string, unknown>) : null,
	}));
}

/**
 * Get the latest D1 stats per database.
 */
export async function getDatabaseMetrics(db: D1Database): Promise<
	Array<{
		databaseName: string;
		databaseId: string;
		sizeBytes: number;
		rowsRead: number;
		rowsWritten: number;
		queryCount: number;
		recordedAt: number;
	}>
> {
	const result = await db
		.prepare(
			`SELECT s1.database_name, s1.database_id, s1.size_bytes, s1.rows_read,
              s1.rows_written, s1.query_count, s1.recorded_at
       FROM observability_d1_stats s1
       WHERE s1.recorded_at = (
         SELECT MAX(s2.recorded_at)
         FROM observability_d1_stats s2
         WHERE s2.database_name = s1.database_name
       )
       ORDER BY s1.database_name`,
		)
		.all<{
			database_name: string;
			database_id: string;
			size_bytes: number;
			rows_read: number;
			rows_written: number;
			query_count: number;
			recorded_at: number;
		}>()
		.catch(() => ({ results: [] }));

	return (result.results ?? []).map((r) => ({
		databaseName: r.database_name,
		databaseId: r.database_id,
		sizeBytes: r.size_bytes,
		rowsRead: r.rows_read,
		rowsWritten: r.rows_written,
		queryCount: r.query_count,
		recordedAt: r.recorded_at,
	}));
}

/**
 * Get the latest R2 stats per bucket.
 */
export async function getStorageMetrics(db: D1Database): Promise<{
	r2: Array<{
		bucketName: string;
		objectCount: number;
		totalSizeBytes: number;
		classAOps: number;
		classBOps: number;
		recordedAt: number;
	}>;
	kv: Array<{
		namespaceName: string;
		namespaceId: string;
		reads: number;
		writes: number;
		deletes: number;
		healthStatus: string;
		recordedAt: number;
	}>;
}> {
	const [r2Result, kvResult] = await Promise.allSettled([
		db
			.prepare(
				`SELECT r1.bucket_name, r1.object_count, r1.total_size_bytes,
                r1.class_a_ops, r1.class_b_ops, r1.recorded_at
         FROM observability_r2_stats r1
         WHERE r1.recorded_at = (
           SELECT MAX(r2.recorded_at) FROM observability_r2_stats r2
           WHERE r2.bucket_name = r1.bucket_name
         )
         ORDER BY r1.bucket_name`,
			)
			.all<{
				bucket_name: string;
				object_count: number;
				total_size_bytes: number;
				class_a_ops: number;
				class_b_ops: number;
				recorded_at: number;
			}>(),

		db
			.prepare(
				`SELECT k1.namespace_name, k1.namespace_id, k1.reads, k1.writes,
                k1.deletes, k1.health_status, k1.recorded_at
         FROM observability_kv_stats k1
         WHERE k1.recorded_at = (
           SELECT MAX(k2.recorded_at) FROM observability_kv_stats k2
           WHERE k2.namespace_name = k1.namespace_name
         )
         ORDER BY k1.namespace_name`,
			)
			.all<{
				namespace_name: string;
				namespace_id: string;
				reads: number;
				writes: number;
				deletes: number;
				health_status: string;
				recorded_at: number;
			}>(),
	]);

	const r2Rows = r2Result.status === "fulfilled" ? (r2Result.value.results ?? []) : [];
	const kvRows = kvResult.status === "fulfilled" ? (kvResult.value.results ?? []) : [];

	return {
		r2: r2Rows.map((r) => ({
			bucketName: r.bucket_name,
			objectCount: r.object_count,
			totalSizeBytes: r.total_size_bytes,
			classAOps: r.class_a_ops,
			classBOps: r.class_b_ops,
			recordedAt: r.recorded_at,
		})),
		kv: kvRows.map((k) => ({
			namespaceName: k.namespace_name,
			namespaceId: k.namespace_id,
			reads: k.reads,
			writes: k.writes,
			deletes: k.deletes,
			healthStatus: k.health_status,
			recordedAt: k.recorded_at,
		})),
	};
}

/**
 * Get active and recent alerts.
 */
export async function getAlerts(
	db: D1Database,
	limit = 100,
): Promise<{
	active: Array<{
		id: number;
		serviceName: string;
		severity: string;
		title: string;
		description: string | null;
		metricType: string | null;
		metricValue: number | null;
		thresholdValue: number | null;
		triggeredAt: number;
		acknowledged: boolean;
	}>;
	recent: Array<{
		id: number;
		serviceName: string;
		severity: string;
		title: string;
		triggeredAt: number;
		resolvedAt: number | null;
	}>;
}> {
	const [activeResult, recentResult] = await Promise.allSettled([
		db
			.prepare(
				`SELECT id, service_name, severity, title, description, metric_type,
                metric_value, threshold_value, triggered_at, acknowledged
         FROM observability_alerts
         WHERE resolved_at IS NULL
         ORDER BY triggered_at DESC
         LIMIT ?`,
			)
			.bind(limit)
			.all<{
				id: number;
				service_name: string;
				severity: string;
				title: string;
				description: string | null;
				metric_type: string | null;
				metric_value: number | null;
				threshold_value: number | null;
				triggered_at: number;
				acknowledged: number;
			}>(),

		db
			.prepare(
				`SELECT id, service_name, severity, title, triggered_at, resolved_at
         FROM observability_alerts
         ORDER BY triggered_at DESC
         LIMIT ?`,
			)
			.bind(limit)
			.all<{
				id: number;
				service_name: string;
				severity: string;
				title: string;
				triggered_at: number;
				resolved_at: number | null;
			}>(),
	]);

	const activeRows = activeResult.status === "fulfilled" ? (activeResult.value.results ?? []) : [];
	const recentRows = recentResult.status === "fulfilled" ? (recentResult.value.results ?? []) : [];

	return {
		active: activeRows.map((r) => ({
			id: r.id,
			serviceName: r.service_name,
			severity: r.severity,
			title: r.title,
			description: r.description,
			metricType: r.metric_type,
			metricValue: r.metric_value,
			thresholdValue: r.threshold_value,
			triggeredAt: r.triggered_at,
			acknowledged: r.acknowledged === 1,
		})),
		recent: recentRows.map((r) => ({
			id: r.id,
			serviceName: r.service_name,
			severity: r.severity,
			title: r.title,
			triggeredAt: r.triggered_at,
			resolvedAt: r.resolved_at,
		})),
	};
}

/**
 * Get the latest daily cost rows.
 */
export async function getCostMetrics(
	db: D1Database,
	days = 30,
): Promise<
	Array<{
		date: string;
		serviceName: string;
		estimatedCostUsd: number;
		workerRequests: number;
		d1Reads: number;
		d1Writes: number;
		r2ClassA: number;
		r2ClassB: number;
		pricingVersion: string;
	}>
> {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

	const result = await db
		.prepare(
			`SELECT date, service_name, estimated_cost_usd, worker_requests,
              d1_reads, d1_writes, r2_class_a, r2_class_b, pricing_version
       FROM observability_daily_costs
       WHERE date >= ?
       ORDER BY date DESC, estimated_cost_usd DESC`,
		)
		.bind(since)
		.all<{
			date: string;
			service_name: string;
			estimated_cost_usd: number;
			worker_requests: number;
			d1_reads: number;
			d1_writes: number;
			r2_class_a: number;
			r2_class_b: number;
			pricing_version: string;
		}>()
		.catch(() => ({ results: [] }));

	return (result.results ?? []).map((r) => ({
		date: r.date,
		serviceName: r.service_name,
		estimatedCostUsd: r.estimated_cost_usd,
		workerRequests: r.worker_requests,
		d1Reads: r.d1_reads,
		d1Writes: r.d1_writes,
		r2ClassA: r.r2_class_a,
		r2ClassB: r.r2_class_b,
		pricingVersion: r.pricing_version,
	}));
}

/**
 * Get alert thresholds for configuration display.
 */
export async function getAlertThresholds(db: D1Database): Promise<
	Array<{
		id: number;
		serviceName: string;
		metricType: string;
		operator: string;
		thresholdValue: number;
		severity: string;
		enabled: boolean;
		createdAt: number;
		updatedAt: number;
	}>
> {
	const result = await db
		.prepare(
			`SELECT id, service_name, metric_type, operator, threshold_value,
              severity, enabled, created_at, updated_at
       FROM observability_alert_thresholds
       ORDER BY service_name, metric_type`,
		)
		.all<{
			id: number;
			service_name: string;
			metric_type: string;
			operator: string;
			threshold_value: number;
			severity: string;
			enabled: number;
			created_at: number;
			updated_at: number;
		}>()
		.catch(() => ({ results: [] }));

	return (result.results ?? []).map((r) => ({
		id: r.id,
		serviceName: r.service_name,
		metricType: r.metric_type,
		operator: r.operator,
		thresholdValue: r.threshold_value,
		severity: r.severity,
		enabled: r.enabled === 1,
		createdAt: r.created_at,
		updatedAt: r.updated_at,
	}));
}

/**
 * Upsert an alert threshold.
 */
export async function upsertAlertThreshold(
	db: D1Database,
	params: {
		serviceName: string;
		metricType: string;
		operator: "gt" | "lt" | "gte" | "lte" | "eq";
		thresholdValue: number;
		severity: "info" | "warning" | "critical";
		enabled?: boolean;
	},
): Promise<void> {
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			`INSERT INTO observability_alert_thresholds
        (service_name, metric_type, operator, threshold_value, severity, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(service_name, metric_type) DO UPDATE SET
        operator = excluded.operator,
        threshold_value = excluded.threshold_value,
        severity = excluded.severity,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at`,
		)
		.bind(
			params.serviceName,
			params.metricType,
			params.operator,
			params.thresholdValue,
			params.severity,
			params.enabled !== false ? 1 : 0,
			now,
			now,
		)
		.run();
}
