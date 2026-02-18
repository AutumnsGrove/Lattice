/**
 * Vista Observability — Queen Firefly Aggregator
 *
 * Queries Queen Firefly's jobs and runners tables for pool status,
 * job queue depth, and session costs. Returns empty data gracefully
 * if Queen Firefly is not yet deployed.
 *
 * R2 state sync sizes (amber.grove.place): deferred — requires R2 listing
 * which is not available from D1 queries. TODO: implement via CF R2 API.
 *
 * @module server/observability/aggregators/firefly-aggregator
 */

import type { FireflyAggregateResult, CollectorResult } from "../types.js";

/**
 * Aggregate Queen Firefly pool status and job queue data.
 * Returns gracefully empty if Firefly tables don't exist.
 */
export async function aggregateFirefly(
	db: D1Database,
): Promise<CollectorResult & { data?: FireflyAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [activeRunnersResult, queuedJobsResult, completedJobsResult, avgDurationResult] =
			await Promise.allSettled([
				// Active (running) server count
				db
					.prepare(
						`SELECT COUNT(*) as count
           FROM runners
           WHERE status = 'active'`,
					)
					.first<{ count: number }>()
					.catch(() => null),

				// Queued jobs waiting for a runner
				db
					.prepare(
						`SELECT COUNT(*) as count
           FROM jobs
           WHERE status = 'queued'`,
					)
					.first<{ count: number }>()
					.catch(() => null),

				// Jobs completed in the last 24h
				db
					.prepare(
						`SELECT COUNT(*) as count
           FROM jobs
           WHERE status = 'completed'
           AND completed_at >= strftime('%s', 'now') - 86400`,
					)
					.first<{ count: number }>()
					.catch(() => null),

				// Average session duration for completed sessions
				db
					.prepare(
						`SELECT AVG(duration_seconds) as avg_duration
           FROM jobs
           WHERE status = 'completed'
           AND duration_seconds IS NOT NULL
           AND completed_at >= strftime('%s', 'now') - 86400`,
					)
					.first<{ avg_duration: number | null }>()
					.catch(() => null),
			]);

		const activeRunners =
			activeRunnersResult.status === "fulfilled" ? activeRunnersResult.value : null;
		const queuedJobs = queuedJobsResult.status === "fulfilled" ? queuedJobsResult.value : null;
		const completedJobs =
			completedJobsResult.status === "fulfilled" ? completedJobsResult.value : null;
		const avgDuration = avgDurationResult.status === "fulfilled" ? avgDurationResult.value : null;

		// If all queries returned null, Firefly is not yet deployed
		const available = activeRunners !== null || queuedJobs !== null || completedJobs !== null;

		const data: FireflyAggregateResult = {
			available,
			activeRunners: activeRunners?.count ?? 0,
			queuedJobs: queuedJobs?.count ?? 0,
			completedJobs24h: completedJobs?.count ?? 0,
			avgSessionDurationSec: avgDuration?.avg_duration ?? null,
			collectedAt,
		};

		return {
			name: "firefly-aggregator",
			status: available ? "success" : "unavailable",
			itemsCollected: available ? 1 : 0,
			durationMs: Date.now() - startedAt,
			data,
			error: available ? undefined : "Queen Firefly tables not found — Firefly not yet deployed",
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "firefly-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Firefly aggregation failed: ${message}`,
		};
	}
}
