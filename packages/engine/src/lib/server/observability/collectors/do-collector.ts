/**
 * Vista Observability — Durable Object Metrics Collector
 *
 * Queries the durable-objects worker's /do-metrics endpoint for aggregate stats.
 * If the endpoint doesn't exist yet (DOs not yet instrumented), returns
 * 'awaiting_instrumentation' for each DO class — never shows zeros as if healthy.
 *
 * @module server/observability/collectors/do-collector
 */

import type { DurableObjectMetrics, CollectorResult } from "../types.js";
import { SERVICE_REGISTRY } from "../types.js";

const DO_METRICS_ENDPOINT = "https://do.grove.place/do-metrics";
const DO_METRICS_TIMEOUT_MS = 10_000;

interface DOMetricsResponse {
	classes: Array<{
		className: string;
		activeInstances: number;
		hibernatingInstances: number;
		totalAlarms: number;
		storageBytes: number;
	}>;
	collectedAt: number;
}

/**
 * Collect Durable Object metrics from the DO worker's /do-metrics endpoint.
 *
 * Returns 'awaiting_instrumentation' for all DO classes if:
 * - The endpoint returns 404 (not yet implemented)
 * - The endpoint is unreachable
 * - The endpoint returns unexpected data
 *
 * This distinction is critical: never show zeros as if DOs have zero activity.
 */
export async function collectDOMetrics(
	db: D1Database,
): Promise<CollectorResult & { metrics?: DurableObjectMetrics[] }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		// Attempt to fetch from the DO metrics endpoint
		const response = await fetch(DO_METRICS_ENDPOINT, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"User-Agent": "Grove-Vista-Collector/1.0",
			},
			signal: AbortSignal.timeout(DO_METRICS_TIMEOUT_MS),
		});

		if (response.status === 404) {
			// Endpoint not yet implemented — DOs awaiting instrumentation
			return buildAwaitingInstrumentationResult(
				startedAt,
				collectedAt,
				db,
				"DO /do-metrics endpoint not yet implemented (404)",
			);
		}

		if (!response.ok) {
			return buildAwaitingInstrumentationResult(
				startedAt,
				collectedAt,
				db,
				`DO metrics endpoint returned ${response.status}`,
			);
		}

		let data: DOMetricsResponse;
		try {
			data = (await response.json()) as DOMetricsResponse;
		} catch {
			return buildAwaitingInstrumentationResult(
				startedAt,
				collectedAt,
				db,
				"DO metrics endpoint returned non-JSON response",
			);
		}

		if (!data.classes || !Array.isArray(data.classes)) {
			return buildAwaitingInstrumentationResult(
				startedAt,
				collectedAt,
				db,
				"DO metrics response missing classes array",
			);
		}

		// Build a map of reported classes for quick lookup
		const reportedClasses = new Map(data.classes.map((c) => [c.className, c]));

		const metrics: DurableObjectMetrics[] = [];

		for (const doEntry of SERVICE_REGISTRY.durableObjects) {
			const reported = reportedClasses.get(doEntry.className);

			if (reported) {
				// This DO is actively reporting
				const metric: DurableObjectMetrics = {
					className: doEntry.className,
					activeInstances: reported.activeInstances,
					hibernatingInstances: reported.hibernatingInstances,
					totalAlarms: reported.totalAlarms,
					storageBytes: reported.storageBytes,
					instrumentationStatus: "reporting",
					collectedAt,
				};
				metrics.push(metric);

				await writeDoStats(db, metric, collectedAt);
			} else {
				// DO exists in registry but not in the metrics response
				const metric: DurableObjectMetrics = {
					className: doEntry.className,
					activeInstances: 0,
					hibernatingInstances: 0,
					totalAlarms: 0,
					storageBytes: 0,
					instrumentationStatus: "awaiting_instrumentation",
					collectedAt,
				};
				metrics.push(metric);

				await writeDoStats(db, metric, collectedAt);
			}
		}

		return {
			name: "do-collector",
			status: "success",
			itemsCollected: metrics.length,
			durationMs: Date.now() - startedAt,
			metrics,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const isTimeout = message.includes("timeout") || message.includes("AbortError");

		return buildAwaitingInstrumentationResult(
			startedAt,
			collectedAt,
			db,
			isTimeout
				? `DO metrics endpoint timed out after ${DO_METRICS_TIMEOUT_MS}ms`
				: `DO metrics collection failed: ${message}`,
		);
	}
}

/**
 * Build an 'awaiting_instrumentation' result for all known DO classes.
 * Used when the /do-metrics endpoint is unavailable or not yet implemented.
 */
async function buildAwaitingInstrumentationResult(
	startedAt: number,
	collectedAt: number,
	db: D1Database,
	reason: string,
): Promise<CollectorResult & { metrics?: DurableObjectMetrics[] }> {
	const metrics: DurableObjectMetrics[] = SERVICE_REGISTRY.durableObjects.map((doEntry) => ({
		className: doEntry.className,
		activeInstances: 0,
		hibernatingInstances: 0,
		totalAlarms: 0,
		storageBytes: 0,
		instrumentationStatus: "awaiting_instrumentation" as const,
		collectedAt,
	}));

	// Write awaiting_instrumentation rows to D1 so the dashboard has something to show
	await Promise.allSettled(metrics.map((metric) => writeDoStats(db, metric, collectedAt)));

	return {
		name: "do-collector",
		status: "unavailable",
		itemsCollected: metrics.length,
		durationMs: Date.now() - startedAt,
		metrics,
		error: reason,
	};
}

/**
 * Write a single DO stat row to D1.
 */
async function writeDoStats(
	db: D1Database,
	metric: DurableObjectMetrics,
	collectedAt: number,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO observability_do_stats
        (class_name, active_count, hibernating_count, storage_bytes, alarm_count,
         instrumentation_status, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			metric.className,
			metric.activeInstances,
			metric.hibernatingInstances,
			metric.storageBytes,
			metric.totalAlarms,
			metric.instrumentationStatus,
			collectedAt,
		)
		.run()
		.catch((err) => {
			console.error(`[DO Collector] Failed to write stats for ${metric.className}:`, err);
		});
}

/**
 * Get the latest DO stats from D1 for each known class.
 * Used by the API endpoints.
 */
export async function getLatestDOMetrics(db: D1Database): Promise<
	Array<{
		className: string;
		activeCount: number;
		hibernatingCount: number;
		storageBytes: number;
		alarmCount: number;
		instrumentationStatus: string;
		recordedAt: number;
	}>
> {
	try {
		const result = await db
			.prepare(
				`SELECT
          d1.class_name,
          d1.active_count,
          d1.hibernating_count,
          d1.storage_bytes,
          d1.alarm_count,
          d1.instrumentation_status,
          d1.recorded_at
         FROM observability_do_stats d1
         WHERE d1.recorded_at = (
           SELECT MAX(d2.recorded_at)
           FROM observability_do_stats d2
           WHERE d2.class_name = d1.class_name
         )
         ORDER BY d1.class_name`,
			)
			.all<{
				class_name: string;
				active_count: number;
				hibernating_count: number;
				storage_bytes: number;
				alarm_count: number;
				instrumentation_status: string;
				recorded_at: number;
			}>();

		return (result.results ?? []).map((row) => ({
			className: row.class_name,
			activeCount: row.active_count,
			hibernatingCount: row.hibernating_count,
			storageBytes: row.storage_bytes,
			alarmCount: row.alarm_count,
			instrumentationStatus: row.instrumentation_status,
			recordedAt: row.recorded_at,
		}));
	} catch (err) {
		console.error("[DO Collector] Failed to fetch latest DO metrics:", err);
		return [];
	}
}
