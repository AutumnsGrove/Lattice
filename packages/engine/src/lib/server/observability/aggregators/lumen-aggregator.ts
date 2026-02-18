/**
 * Vista Observability — Lumen AI Gateway Aggregator
 *
 * Queries the lumen_usage table for AI cost, token usage, provider breakdown,
 * and quota status. This data already exists — we're just surfacing it in
 * the Vista dashboard with wider time windows.
 *
 * @module server/observability/aggregators/lumen-aggregator
 */

import type { LumenAggregateResult, CollectorResult } from "../types.js";

interface LumenRow {
	provider: string;
	model: string;
	count: number;
	input_tokens: number;
	output_tokens: number;
	total_cost: number;
	avg_latency: number;
}

/**
 * Aggregate Lumen AI gateway usage from the lumen_usage table.
 * Returns 24h and 30d summaries, provider breakdown, and model breakdown.
 */
export async function aggregateLumen(
	db: D1Database,
): Promise<CollectorResult & { data?: LumenAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		// All queries run in parallel — one failure doesn't block others
		const [stats24h, stats30d, byProvider30d, byModel30d] = await Promise.allSettled([
			// 24h summary
			db
				.prepare(
					`SELECT
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
           FROM lumen_usage
           WHERE created_at >= datetime('now', '-1 day')`,
				)
				.first<{
					count: number;
					input_tokens: number;
					output_tokens: number;
					total_cost: number;
					avg_latency: number;
				}>(),

			// 30d summary
			db
				.prepare(
					`SELECT
            COUNT(*) as count,
            SUM(cost) as total_cost
           FROM lumen_usage
           WHERE created_at >= datetime('now', '-30 days')`,
				)
				.first<{ count: number; total_cost: number }>(),

			// By provider (30d)
			db
				.prepare(
					`SELECT
            provider,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
           FROM lumen_usage
           WHERE created_at >= datetime('now', '-30 days')
           GROUP BY provider
           ORDER BY total_cost DESC`,
				)
				.all<LumenRow>(),

			// By model (30d)
			db
				.prepare(
					`SELECT
            model,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
           FROM lumen_usage
           WHERE created_at >= datetime('now', '-30 days')
           GROUP BY model
           ORDER BY total_cost DESC
           LIMIT 20`,
				)
				.all<LumenRow>(),
		]);

		const row24h = stats24h.status === "fulfilled" ? stats24h.value : null;
		const row30d = stats30d.status === "fulfilled" ? stats30d.value : null;
		const providerRows =
			byProvider30d.status === "fulfilled" ? (byProvider30d.value.results ?? []) : [];
		const modelRows = byModel30d.status === "fulfilled" ? (byModel30d.value.results ?? []) : [];

		const data: LumenAggregateResult = {
			cost24h: row24h?.total_cost ?? 0,
			cost30d: row30d?.total_cost ?? 0,
			tokens24h: {
				input: row24h?.input_tokens ?? 0,
				output: row24h?.output_tokens ?? 0,
			},
			byProvider: providerRows.map((r) => ({
				provider: r.provider,
				count: r.count,
				totalCost: r.total_cost,
			})),
			byModel: modelRows.map((r) => ({
				model: r.model,
				count: r.count,
				totalCost: r.total_cost,
			})),
			requests24h: row24h?.count ?? 0,
			avgLatencyMs24h: row24h?.avg_latency ?? 0,
			collectedAt,
		};

		return {
			name: "lumen-aggregator",
			status: "success",
			itemsCollected: 1,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "lumen-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Lumen aggregation failed: ${message}`,
		};
	}
}
