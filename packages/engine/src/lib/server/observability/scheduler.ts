/**
 * Vista Observability — Collection Orchestrator
 *
 * createObservabilityCollector(env) returns an object with runFullCollection()
 * which coordinates all collectors and aggregators using Promise.allSettled.
 * One failure in any collector never cascades to others.
 *
 * Designed to be called from the grove-vista-collector worker (cron)
 * and from the POST /api/admin/observability/collect endpoint (manual trigger).
 *
 * @module server/observability/scheduler
 */

import type { CollectionResult, CollectorResult } from "./types.js";
import { collectWorkerMetrics } from "./collectors/cloudflare-analytics.js";
import { collectD1Metrics } from "./collectors/d1-collector.js";
import { collectR2Metrics } from "./collectors/r2-collector.js";
import { collectKVMetrics } from "./collectors/kv-collector.js";
import { runHealthChecks } from "./collectors/health-checker.js";
import { collectDOMetrics } from "./collectors/do-collector.js";
import { aggregateLumen } from "./aggregators/lumen-aggregator.js";
import { aggregatePetal } from "./aggregators/petal-aggregator.js";
import { aggregateThorn } from "./aggregators/thorn-aggregator.js";
import { aggregateSentinel } from "./aggregators/sentinel-aggregator.js";
import { aggregateClearing } from "./aggregators/clearing-aggregator.js";
import { aggregateWarden } from "./aggregators/warden-aggregator.js";
import { aggregateMeadow } from "./aggregators/meadow-aggregator.js";
import { aggregateFirefly } from "./aggregators/firefly-aggregator.js";

export interface ObservabilityEnv {
	DB: D1Database;
	CF_ACCOUNT_ID: string;
	CF_OBSERVABILITY_TOKEN?: string;
}

export interface ObservabilityCollector {
	runFullCollection(trigger?: "cron" | "manual"): Promise<CollectionResult>;
}

/**
 * Factory function: create an observability collector bound to the given env.
 * Call this once per request/scheduled invocation, then call runFullCollection().
 */
export function createObservabilityCollector(env: ObservabilityEnv): ObservabilityCollector {
	return {
		async runFullCollection(trigger: "cron" | "manual" = "cron"): Promise<CollectionResult> {
			const startedAt = Date.now();
			const startedAtEpoch = Math.floor(startedAt / 1000);
			const collectors: Record<string, CollectorResult> = {};
			const errors: string[] = [];
			let alertsTriggered = 0;
			let alertsResolved = 0;

			// Write collection log entry at start
			const logResult = await env.DB.prepare(
				`INSERT INTO observability_collection_log (started_at, trigger) VALUES (?, ?)`,
			)
				.bind(startedAtEpoch, trigger)
				.run()
				.catch(() => null);

			const logId = logResult?.meta?.last_row_id ?? null;

			console.log(`[Vista Collector] Starting full collection (trigger=${trigger})`);

			// =========================================================================
			// STEP 1: Cloudflare API collectors — run in parallel, fail safely
			// =========================================================================
			const cfResults = await Promise.allSettled([
				collectWorkerMetrics(env.CF_ACCOUNT_ID, env.CF_OBSERVABILITY_TOKEN, env.DB),
				collectD1Metrics(env.CF_ACCOUNT_ID, env.CF_OBSERVABILITY_TOKEN, env.DB),
				collectR2Metrics(env.CF_ACCOUNT_ID, env.CF_OBSERVABILITY_TOKEN, env.DB),
				collectKVMetrics(env.CF_ACCOUNT_ID, env.CF_OBSERVABILITY_TOKEN, env.DB),
			]);

			for (const result of cfResults) {
				if (result.status === "fulfilled") {
					const r = result.value;
					collectors[r.name] = {
						name: r.name,
						status: r.status,
						itemsCollected: r.itemsCollected,
						durationMs: r.durationMs,
						error: r.error,
					};
					if (r.status === "error") errors.push(`${r.name}: ${r.error}`);
				} else {
					const name = "cf-collector-unknown";
					collectors[name] = {
						name,
						status: "error",
						itemsCollected: 0,
						durationMs: 0,
						error: String(result.reason),
					};
					errors.push(String(result.reason));
				}
			}

			// =========================================================================
			// STEP 2: Health checks — all workers in parallel
			// =========================================================================
			const healthResult = await Promise.allSettled([runHealthChecks(env.DB)]);
			for (const result of healthResult) {
				if (result.status === "fulfilled") {
					const r = result.value;
					collectors[r.name] = {
						name: r.name,
						status: r.status,
						itemsCollected: r.itemsCollected,
						durationMs: r.durationMs,
						error: r.error,
					};
				}
			}

			// =========================================================================
			// STEP 3: DO metrics
			// =========================================================================
			const doResult = await Promise.allSettled([collectDOMetrics(env.DB)]);
			for (const result of doResult) {
				if (result.status === "fulfilled") {
					const r = result.value;
					collectors[r.name] = {
						name: r.name,
						status: r.status,
						itemsCollected: r.itemsCollected,
						durationMs: r.durationMs,
						error: r.error,
					};
				}
			}

			// =========================================================================
			// STEP 4: Internal aggregators — query existing D1 tables in parallel
			// =========================================================================
			const aggregatorResults = await Promise.allSettled([
				aggregateLumen(env.DB),
				aggregatePetal(env.DB),
				aggregateThorn(env.DB),
				aggregateSentinel(env.DB),
				aggregateClearing(env.DB),
				aggregateWarden(env.DB),
				aggregateMeadow(env.DB),
				aggregateFirefly(env.DB),
			]);

			for (const result of aggregatorResults) {
				if (result.status === "fulfilled") {
					const r = result.value;
					collectors[r.name] = {
						name: r.name,
						status: r.status,
						itemsCollected: r.itemsCollected,
						durationMs: r.durationMs,
						error: r.error,
					};
					if (r.status === "error") errors.push(`${r.name}: ${r.error}`);
				} else {
					errors.push(`aggregator: ${String(result.reason)}`);
				}
			}

			// =========================================================================
			// STEP 5: Alert threshold evaluation
			// =========================================================================
			try {
				const alertResult = await evaluateAlerts(env.DB, collectors);
				alertsTriggered = alertResult.triggered;
				alertsResolved = alertResult.resolved;
			} catch (err) {
				console.error("[Vista Collector] Alert evaluation failed:", err);
				errors.push(`alert-evaluation: ${err instanceof Error ? err.message : String(err)}`);
			}

			// =========================================================================
			// STEP 6: 90-day retention cleanup (run on daily cron only)
			// The worker casts both cron triggers to "cron" when calling runFullCollection
			// (the trigger type is "cron" | "manual" — "daily" is not in the union).
			// So we can't distinguish the two cron schedules from trigger alone.
			// Checking UTCHours === 0 is the practical equivalent: the daily cron fires at
			// midnight UTC ("0 0 * * *"), so hour-of-day 0 implies it's a daily invocation.
			// Edge case: the 5-min cron that fires at 00:00 also runs cleanup — acceptable
			// because cleanup is idempotent and deletes nothing when data is fresh.
			// =========================================================================
			const hourOfDay = new Date().getUTCHours();
			if (trigger === "cron" && hourOfDay === 0) {
				await runRetentionCleanup(env.DB).catch((err) => {
					console.error("[Vista Collector] Retention cleanup failed:", err);
					errors.push(`retention-cleanup: ${err instanceof Error ? err.message : String(err)}`);
				});
			}

			// =========================================================================
			// Finalize
			// =========================================================================
			const completedAt = Date.now();
			const completedAtEpoch = Math.floor(completedAt / 1000);
			const durationMs = completedAt - startedAt;

			const successCount = Object.values(collectors).filter((c) => c.status === "success").length;
			const failCount = Object.values(collectors).filter((c) => c.status === "error").length;

			console.log(
				`[Vista Collector] Collection complete in ${durationMs}ms. ` +
					`${successCount} success, ${failCount} error, ` +
					`${alertsTriggered} alerts triggered, ${alertsResolved} resolved.`,
			);

			// Update the collection log
			if (logId) {
				await env.DB.prepare(
					`UPDATE observability_collection_log
           SET completed_at = ?, duration_ms = ?, collectors_run = ?,
               collectors_failed = ?, error_summary = ?
           WHERE id = ?`,
				)
					.bind(
						completedAtEpoch,
						durationMs,
						Object.keys(collectors).length,
						failCount,
						errors.length > 0 ? JSON.stringify(errors) : null,
						logId,
					)
					.run()
					.catch(() => null);
			}

			return {
				startedAt: startedAtEpoch,
				completedAt: completedAtEpoch,
				durationMs,
				trigger,
				collectors,
				alertsTriggered,
				alertsResolved,
				errors,
			};
		},
	};
}

// =============================================================================
// Alert Threshold Evaluation
// =============================================================================

interface AlertEvalResult {
	triggered: number;
	resolved: number;
}

/**
 * Evaluate all enabled alert thresholds against the latest metric data.
 * Writes new alerts or resolves existing ones to observability_alerts.
 *
 * Query strategy: two batch reads replace the previous N+1 loop.
 *   1. One query fetches the latest metric value for EVERY (service, type) pair
 *      that has a threshold — no per-threshold round-trips.
 *   2. One query fetches all currently active (unresolved) alert keys.
 *   The per-threshold loop then works purely in-memory for evaluation,
 *   only writing to D1 when an alert actually needs to be created or resolved.
 */
async function evaluateAlerts(
	db: D1Database,
	_collectors: Record<string, CollectorResult>,
): Promise<AlertEvalResult> {
	let triggered = 0;
	let resolved = 0;
	const now = Math.floor(Date.now() / 1000);

	try {
		// Get all enabled thresholds
		const thresholds = await db
			.prepare(`SELECT * FROM observability_alert_thresholds WHERE enabled = 1`)
			.all<{
				id: number;
				service_name: string;
				metric_type: string;
				operator: string;
				threshold_value: number;
				severity: string;
			}>()
			.catch(() => ({ results: [] }));

		const thresholdRows = thresholds.results ?? [];
		if (thresholdRows.length === 0) return { triggered, resolved };

		// --- Batch read 1: latest metric value per (service_name, metric_type) ---
		// Uses a self-join on the covering index idx_obs_metrics_service_type_time
		// so each group lookup is O(log n) rather than a full scan per threshold.
		const latestMetrics = await db
			.prepare(
				`SELECT m.service_name, m.metric_type, m.value
         FROM observability_metrics m
         INNER JOIN (
           SELECT service_name, metric_type, MAX(recorded_at) AS max_at
           FROM observability_metrics
           GROUP BY service_name, metric_type
         ) g ON m.service_name = g.service_name
             AND m.metric_type = g.metric_type
             AND m.recorded_at = g.max_at`,
			)
			.all<{ service_name: string; metric_type: string; value: number }>()
			.catch(() => ({ results: [] }));

		// Index for O(1) lookup: "service_name|metric_type" -> latest value
		const metricMap = new Map<string, number>();
		for (const row of latestMetrics.results ?? []) {
			metricMap.set(`${row.service_name}|${row.metric_type}`, row.value);
		}

		// --- Batch read 2: all currently active (unresolved) alert keys ---
		const activeAlerts = await db
			.prepare(
				`SELECT service_name, metric_type FROM observability_alerts
         WHERE resolved_at IS NULL`,
			)
			.all<{ service_name: string; metric_type: string }>()
			.catch(() => ({ results: [] }));

		const activeAlertKeys = new Set<string>();
		for (const row of activeAlerts.results ?? []) {
			activeAlertKeys.add(`${row.service_name}|${row.metric_type}`);
		}

		// --- Evaluate each threshold in-memory; only write on state changes ---
		for (const threshold of thresholdRows) {
			try {
				const key = `${threshold.service_name}|${threshold.metric_type}`;
				const metricValue = metricMap.get(key);

				if (metricValue === undefined) continue; // no data yet for this metric

				const exceeded = checkThreshold(metricValue, threshold.operator, threshold.threshold_value);

				if (exceeded) {
					if (!activeAlertKeys.has(key)) {
						// Create new alert — threshold crossed and no active alert exists
						await db
							.prepare(
								`INSERT INTO observability_alerts
                  (service_name, severity, title, description, metric_type,
                   metric_value, threshold_value, triggered_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
							)
							.bind(
								threshold.service_name,
								threshold.severity,
								`${threshold.service_name}: ${threshold.metric_type} ${threshold.operator} ${threshold.threshold_value}`,
								`Metric ${threshold.metric_type} = ${metricValue.toFixed(2)} exceeds threshold ${threshold.threshold_value}`,
								threshold.metric_type,
								metricValue,
								threshold.threshold_value,
								now,
							)
							.run()
							.catch(() => null);
						triggered++;
						activeAlertKeys.add(key); // keep local state consistent
					}
				} else {
					if (activeAlertKeys.has(key)) {
						// Resolve active alerts for this threshold
						const resolveResult = await db
							.prepare(
								`UPDATE observability_alerts
               SET resolved_at = ?
               WHERE service_name = ? AND metric_type = ? AND resolved_at IS NULL`,
							)
							.bind(now, threshold.service_name, threshold.metric_type)
							.run()
							.catch(() => null);

						if (resolveResult?.meta?.changes && resolveResult.meta.changes > 0) {
							resolved++;
							activeAlertKeys.delete(key); // keep local state consistent
						}
					}
				}
			} catch {
				// Don't let one threshold failure block others
			}
		}
	} catch (err) {
		console.error("[Vista Collector] Alert evaluation error:", err);
	}

	return { triggered, resolved };
}

/**
 * Check if a metric value crosses a threshold.
 */
function checkThreshold(value: number, operator: string, threshold: number): boolean {
	switch (operator) {
		case "gt":
			return value > threshold;
		case "lt":
			return value < threshold;
		case "gte":
			return value >= threshold;
		case "lte":
			return value <= threshold;
		case "eq":
			return value === threshold;
		default:
			return false;
	}
}

// =============================================================================
// 90-day Retention Cleanup
// =============================================================================

/**
 * Delete metric rows older than 90 days from all time-series tables.
 * Runs on the daily cron invocation.
 */
async function runRetentionCleanup(db: D1Database): Promise<void> {
	const cutoff = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

	console.log(`[Vista Collector] Running 90-day retention cleanup (cutoff=${cutoff})`);

	const tables = [
		{ table: "observability_metrics", column: "recorded_at" },
		{ table: "observability_health_checks", column: "checked_at" },
		{ table: "observability_d1_stats", column: "recorded_at" },
		{ table: "observability_r2_stats", column: "recorded_at" },
		{ table: "observability_kv_stats", column: "recorded_at" },
		{ table: "observability_do_stats", column: "recorded_at" },
		{ table: "observability_collection_log", column: "started_at" },
	];

	await Promise.allSettled(
		tables.map(async ({ table, column }) => {
			const result = await db
				.prepare(`DELETE FROM ${table} WHERE ${column} < ?`)
				.bind(cutoff)
				.run()
				.catch((err) => {
					console.error(`[Vista Collector] Retention cleanup failed for ${table}:`, err);
					return null;
				});

			if (result?.meta?.changes && result.meta.changes > 0) {
				console.log(`[Vista Collector] Cleaned ${result.meta.changes} old rows from ${table}`);
			}
		}),
	);
}
