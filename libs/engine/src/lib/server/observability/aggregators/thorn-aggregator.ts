/**
 * Vista Observability — Thorn Text Moderation Aggregator
 *
 * Queries thorn_moderation_log and thorn_flagged_content for action counts,
 * queue depths, and category breakdowns.
 *
 * @module server/observability/aggregators/thorn-aggregator
 */

import type { CollectorResult } from "../types.js";

export interface ThornAggregateResult {
	actionCounts24h: {
		allowed: number;
		warned: number;
		flagged: number;
		blocked: number;
	};
	flaggedQueueDepth: number;
	byCategory: Array<{ category: string; count: number }>;
	collectedAt: number;
}

/**
 * Aggregate Thorn text moderation data from existing D1 tables.
 */
export async function aggregateThorn(
	db: D1Database,
): Promise<CollectorResult & { data?: ThornAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [actionCountResult, flaggedDepthResult, byCategoryResult] = await Promise.allSettled([
			// 24h action breakdown
			db
				.prepare(
					`SELECT
              SUM(CASE WHEN action = 'allow' THEN 1 ELSE 0 END) as allowed,
              SUM(CASE WHEN action = 'warn' THEN 1 ELSE 0 END) as warned,
              SUM(CASE WHEN action = 'flag' THEN 1 ELSE 0 END) as flagged,
              SUM(CASE WHEN action = 'block' THEN 1 ELSE 0 END) as blocked
             FROM thorn_moderation_log
             WHERE created_at >= datetime('now', '-1 day')`,
				)
				.first<{
					allowed: number;
					warned: number;
					flagged: number;
					blocked: number;
				}>()
				.catch(() => null),

			// Flagged content queue depth (pending review)
			db
				.prepare(
					`SELECT COUNT(*) as depth
             FROM thorn_flagged_content
             WHERE status = 'pending'`,
				)
				.first<{ depth: number }>()
				.catch(() => null),

			// By category (24h)
			db
				.prepare(
					`SELECT
              category,
              COUNT(*) as count
             FROM thorn_moderation_log
             WHERE created_at >= datetime('now', '-1 day')
             AND category IS NOT NULL
             GROUP BY category
             ORDER BY count DESC
             LIMIT 10`,
				)
				.all<{ category: string; count: number }>()
				.catch(() => ({ results: [] as Array<{ category: string; count: number }> })),
		]);

		const actions = actionCountResult.status === "fulfilled" ? actionCountResult.value : null;
		const flaggedDepth =
			flaggedDepthResult.status === "fulfilled" ? flaggedDepthResult.value : null;
		const byCategory =
			byCategoryResult.status === "fulfilled" ? (byCategoryResult.value.results ?? []) : [];

		const data: ThornAggregateResult = {
			actionCounts24h: {
				allowed: actions?.allowed ?? 0,
				warned: actions?.warned ?? 0,
				flagged: actions?.flagged ?? 0,
				blocked: actions?.blocked ?? 0,
			},
			flaggedQueueDepth: flaggedDepth?.depth ?? 0,
			byCategory,
			collectedAt,
		};

		return {
			name: "thorn-aggregator",
			status: "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "thorn-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Thorn aggregation failed: ${message}`,
		};
	}
}
