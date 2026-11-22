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
 * Run a query without letting one failure take down the whole aggregator —
 * but never swallow the error silently. A broken query used to report a
 * confident `0` on the dashboard (issue #1608); now it is logged, collected
 * in `errors`, and reported as `partial`.
 */
function tolerateFailure<T>(query: Promise<T>, label: string, errors: string[]): Promise<T | null> {
	return query.catch((err: unknown) => {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[Petal Aggregator] ${label} query failed: ${message}`);
		errors.push(`${label}: ${message}`);
		return null;
	});
}

/**
 * Aggregate Petal image moderation data.
 */
export async function aggregatePetal(
	db: D1Database,
): Promise<CollectorResult & { data?: PetalAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);
	const errors: string[] = [];

	try {
		// Petal tables only exist once migration 030_petal.sql has run, so each
		// query tolerates failure — but reports it via `errors`.
		const [activity, ncmec, flags, blocksResult] = await Promise.all([
			// 24h activity: total checks and blocks
			tolerateFailure(
				db
					.prepare(
						`SELECT
            COUNT(*) as total,
            SUM(CASE WHEN result = 'block' THEN 1 ELSE 0 END) as blocked
           FROM petal_security_log
           WHERE timestamp > datetime('now', '-1 day')`,
					)
					.first<{ total: number; blocked: number }>(),
				"activity-24h",
				errors,
			),

			// NCMEC queue depth — unreported rows. `petal_ncmec_queue` has no
			// `submitted_at` column; reporting state is `reported` (0 = pending),
			// completed reports are stamped in `reported_at`.
			tolerateFailure(
				db
					.prepare(
						`SELECT COUNT(*) as depth
           FROM petal_ncmec_queue
           WHERE reported = 0`,
					)
					.first<{ depth: number }>(),
				"ncmec-queue-depth",
				errors,
			),

			// Pending account flag reviews
			tolerateFailure(
				db
					.prepare(
						`SELECT COUNT(*) as pending
           FROM petal_account_flags
           WHERE review_status = 'pending'`,
					)
					.first<{ pending: number }>(),
				"pending-flag-reviews",
				errors,
			),

			// Blocks by category (24h)
			tolerateFailure(
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
				"recent-blocks",
				errors,
			),
		]);

		const blocks = blocksResult?.results ?? [];

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
			status: errors.length > 0 ? "partial" : "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			error: errors.length > 0 ? errors.join("; ") : undefined,
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
