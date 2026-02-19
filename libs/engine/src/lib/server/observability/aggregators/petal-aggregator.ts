/**
 * Vista Observability — Petal Image Moderation Aggregator
 *
 * Queries petal_security_log, petal_account_flags, petal_ncmec_queue
 * for moderation activity, block rates, and queue depths.
 *
 * @module server/observability/aggregators/petal-aggregator
 */

import type { CollectorResult } from "../types.js";

export interface PetalAggregateResult {
	blockRate24h: number;
	totalChecks24h: number;
	totalBlocked24h: number;
	ncmecQueueDepth: number;
	pendingFlagReviews: number;
	recentBlocks: Array<{ category: string; count: number }>;
	collectedAt: number;
}

/**
 * Aggregate Petal image moderation data.
 */
export async function aggregatePetal(
	db: D1Database,
): Promise<CollectorResult & { data?: PetalAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [activityResult, ncmecResult, flagsResult, blocksResult] = await Promise.allSettled([
			// 24h activity: total checks and blocks
			db
				.prepare(
					`SELECT
            COUNT(*) as total,
            SUM(CASE WHEN result = 'block' THEN 1 ELSE 0 END) as blocked
           FROM petal_security_log
           WHERE timestamp > datetime('now', '-1 day')`,
				)
				.first<{ total: number; blocked: number }>(),

			// NCMEC queue depth
			db
				.prepare(
					`SELECT COUNT(*) as depth
           FROM petal_ncmec_queue
           WHERE submitted_at IS NULL`,
				)
				.first<{ depth: number }>()
				.catch(() => null), // Table may not exist in all envs

			// Pending account flag reviews
			db
				.prepare(
					`SELECT COUNT(*) as pending
           FROM petal_account_flags
           WHERE review_status = 'pending'`,
				)
				.first<{ pending: number }>()
				.catch(() => null),

			// Blocks by category (24h)
			db
				.prepare(
					`SELECT
            category,
            COUNT(*) as count
           FROM petal_security_log
           WHERE result = 'block'
           AND category IS NOT NULL
           AND timestamp > datetime('now', '-1 day')
           GROUP BY category
           ORDER BY count DESC
           LIMIT 10`,
				)
				.all<{ category: string; count: number }>(),
		]);

		const activity = activityResult.status === "fulfilled" ? activityResult.value : null;
		const ncmec = ncmecResult.status === "fulfilled" ? ncmecResult.value : null;
		const flags = flagsResult.status === "fulfilled" ? flagsResult.value : null;
		const blocks = blocksResult.status === "fulfilled" ? (blocksResult.value.results ?? []) : [];

		const totalChecks = activity?.total ?? 0;
		const totalBlocked = activity?.blocked ?? 0;
		const blockRate = totalChecks > 0 ? (totalBlocked / totalChecks) * 100 : 0;

		const data: PetalAggregateResult = {
			blockRate24h: blockRate,
			totalChecks24h: totalChecks,
			totalBlocked24h: totalBlocked,
			ncmecQueueDepth: ncmec?.depth ?? 0,
			pendingFlagReviews: flags?.pending ?? 0,
			recentBlocks: blocks,
			collectedAt,
		};

		return {
			name: "petal-aggregator",
			status: "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "petal-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Petal aggregation failed: ${message}`,
		};
	}
}
