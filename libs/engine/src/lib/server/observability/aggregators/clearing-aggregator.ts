/**
 * Vista Observability — Clearing Status Page Aggregator
 *
 * Queries status_components, status_incidents, status_daily_history
 * for current component health and open incidents.
 *
 * @module server/observability/aggregators/clearing-aggregator
 */

import type { ClearingAggregateResult, CollectorResult } from "../types.js";

interface ComponentRow {
	id: string;
	name: string;
	slug: string;
	current_status: string;
}

/**
 * Aggregate Clearing status page data.
 */
export async function aggregateClearing(
	db: D1Database,
): Promise<CollectorResult & { data?: ClearingAggregateResult }> {
	const startedAt = Date.now();
	const collectedAt = Math.floor(startedAt / 1000);

	try {
		const [componentsResult, incidentsResult] = await Promise.allSettled([
			// All components with current status
			db
				.prepare(
					`SELECT id, name, slug, current_status
           FROM status_components
           ORDER BY display_order`,
				)
				.all<ComponentRow>()
				.catch(() => ({ results: [] as ComponentRow[] })),

			// Open incidents count
			db
				.prepare(
					`SELECT COUNT(*) as count
           FROM status_incidents
           WHERE resolved_at IS NULL`,
				)
				.first<{ count: number }>()
				.catch(() => null),
		]);

		const components =
			componentsResult.status === "fulfilled" ? (componentsResult.value.results ?? []) : [];
		const incidentCount =
			incidentsResult.status === "fulfilled" ? (incidentsResult.value?.count ?? 0) : 0;

		const allOperational =
			components.length > 0 && components.every((c) => c.current_status === "operational");

		const data: ClearingAggregateResult = {
			components: components.map((c) => ({
				id: c.id,
				name: c.name,
				slug: c.slug,
				currentStatus: c.current_status,
			})),
			openIncidents: incidentCount,
			allOperational,
			collectedAt,
		};

		return {
			name: "clearing-aggregator",
			status: "success",
			itemsCollected: components.length,
			durationMs: Date.now() - startedAt,
			data,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			name: "clearing-aggregator",
			status: "error",
			itemsCollected: 0,
			durationMs: Date.now() - startedAt,
			error: `Clearing aggregation failed: ${message}`,
		};
	}
}
