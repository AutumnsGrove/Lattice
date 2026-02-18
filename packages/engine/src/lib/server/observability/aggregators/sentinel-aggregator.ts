/**
 * Vista Observability — Sentinel Load Testing Aggregator
 *
 * Queries sentinel_runs, sentinel_metrics, sentinel_baselines for
 * recent test results and baseline comparisons.
 *
 * @module server/observability/aggregators/sentinel-aggregator
 */

import type { SentinelAggregateResult, CollectorResult } from "../types.js";

interface SentinelRunRow {
	id: string;
	name: string;
	status: string;
	started_at: number;
	completed_at: number | null;
	duration_ms: number | null;
}

interface SentinelMetricsRow {
	throughput_rps: number | null;
	p50_latency_ms: number | null;
	p95_latency_ms: number | null;
	error_rate: number | null;
}

/**
 * Aggregate Sentinel load test data.
 */
export async function aggregateSentinel(
	db: D1Database,
): Promise<CollectorResult & { data?: SentinelAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [latestRunResult, recentRunsResult, latestMetricsResult] = await Promise.allSettled([
			// Latest run
			db
				.prepare(
					`SELECT id, name, status, started_at, completed_at,
              (completed_at - started_at) as duration_ms
             FROM sentinel_runs
             ORDER BY started_at DESC
             LIMIT 1`,
				)
				.first<SentinelRunRow>()
				.catch(() => null),

			// Recent 10 runs
			db
				.prepare(
					`SELECT id, name, status, started_at, completed_at,
              (completed_at - started_at) as duration_ms
             FROM sentinel_runs
             ORDER BY started_at DESC
             LIMIT 10`,
				)
				.all<SentinelRunRow>()
				.catch(() => ({ results: [] as SentinelRunRow[] })),

			// Latest metrics from the most recent run
			db
				.prepare(
					`SELECT
              throughput_rps,
              p50_latency_ms,
              p95_latency_ms,
              error_rate
             FROM sentinel_metrics
             ORDER BY recorded_at DESC
             LIMIT 1`,
				)
				.first<SentinelMetricsRow>()
				.catch(() => null),
		]);

		const latestRun = latestRunResult.status === "fulfilled" ? latestRunResult.value : null;
		const recentRuns =
			recentRunsResult.status === "fulfilled" ? (recentRunsResult.value.results ?? []) : [];
		const latestMetrics =
			latestMetricsResult.status === "fulfilled" ? latestMetricsResult.value : null;

		const data: SentinelAggregateResult = {
			latestRun: latestRun
				? {
						id: latestRun.id,
						name: latestRun.name,
						status: latestRun.status,
						startedAt: latestRun.started_at,
						completedAt: latestRun.completed_at,
						durationMs: latestRun.duration_ms,
					}
				: null,
			recentRuns: recentRuns.map((r) => ({
				id: r.id,
				name: r.name,
				status: r.status,
				startedAt: r.started_at,
				durationMs: r.duration_ms,
			})),
			latestMetrics: {
				throughputRps: latestMetrics?.throughput_rps ?? null,
				p50LatencyMs: latestMetrics?.p50_latency_ms ?? null,
				p95LatencyMs: latestMetrics?.p95_latency_ms ?? null,
				errorRate: latestMetrics?.error_rate ?? null,
			},
			collectedAt,
		};

		return {
			name: "sentinel-aggregator",
			status: "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "sentinel-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Sentinel aggregation failed: ${message}`,
		};
	}
}
