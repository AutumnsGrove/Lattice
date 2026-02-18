/**
 * Vista Observability — Meadow Community Feed Aggregator
 *
 * Queries meadow_posts, meadow_votes, meadow_reactions, meadow_reports
 * for feed health, engagement stats, and report queue depth.
 *
 * @module server/observability/aggregators/meadow-aggregator
 */

import type { MeadowAggregateResult, CollectorResult } from "../types.js";

/**
 * Aggregate Meadow community feed data.
 * Returns empty data gracefully if Meadow tables don't exist yet.
 */
export async function aggregateMeadow(
	db: D1Database,
): Promise<CollectorResult & { data?: MeadowAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [postStatsResult, totalPostsResult, engagementResult, reportsResult] =
			await Promise.allSettled([
				// Post creation rate (24h)
				db
					.prepare(
						`SELECT COUNT(*) as count
           FROM meadow_posts
           WHERE created_at >= strftime('%s', 'now') - 86400`,
					)
					.first<{ count: number }>()
					.catch(() => null),

				// Total post count
				db
					.prepare(`SELECT COUNT(*) as count FROM meadow_posts`)
					.first<{ count: number }>()
					.catch(() => null),

				// Engagement (24h): votes + reactions
				db
					.prepare(
						`SELECT
            (SELECT COUNT(*) FROM meadow_votes WHERE created_at >= strftime('%s', 'now') - 86400) as votes,
            (SELECT COUNT(*) FROM meadow_reactions WHERE created_at >= strftime('%s', 'now') - 86400) as reactions`,
					)
					.first<{ votes: number; reactions: number }>()
					.catch(() => null),

				// Report queue depth
				db
					.prepare(
						`SELECT COUNT(*) as depth
           FROM meadow_reports
           WHERE status = 'pending'`,
					)
					.first<{ depth: number }>()
					.catch(() => null),
			]);

		const postStats = postStatsResult.status === "fulfilled" ? postStatsResult.value : null;
		const totalPosts = totalPostsResult.status === "fulfilled" ? totalPostsResult.value : null;
		const engagement = engagementResult.status === "fulfilled" ? engagementResult.value : null;
		const reports = reportsResult.status === "fulfilled" ? reportsResult.value : null;

		// If all queries returned null, Meadow is likely not deployed
		const available = postStats !== null || totalPosts !== null || engagement !== null;

		const data: MeadowAggregateResult = {
			available,
			postCreationRate24h: postStats?.count ?? 0,
			totalPosts: totalPosts?.count ?? 0,
			engagement24h: {
				votes: engagement?.votes ?? 0,
				reactions: engagement?.reactions ?? 0,
			},
			reportQueueDepth: reports?.depth ?? 0,
			// Rate limit hits: not directly tracked in meadow tables currently
			// Would need to query a separate rate_limit_log table if it exists
			rateLimitHits24h: 0,
			collectedAt,
		};

		return {
			name: "meadow-aggregator",
			status: available ? "success" : "unavailable",
			itemsCollected: available ? 1 : 0,
			durationMs: Date.now() - startedAt,
			data,
			error: available ? undefined : "Meadow tables not found — Meadow may not yet be deployed",
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "meadow-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Meadow aggregation failed: ${message}`,
		};
	}
}
