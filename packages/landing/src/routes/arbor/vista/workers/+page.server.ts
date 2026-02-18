/**
 * Vista Workers — server load
 *
 * Loads worker metrics from the last 24 hours.
 */

import type { PageServerLoad } from "./$types";
import { getWorkerMetrics } from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;
	const collectionTokenConfigured = !!platform?.env?.CF_OBSERVABILITY_TOKEN;

	if (!db) {
		return { metrics: [], collectionTokenConfigured, dbAvailable: false };
	}

	const result = await getWorkerMetrics(db, 24).catch(() => []);

	// Group metrics by service name — each service will have multiple metric types
	const byService = new Map<
		string,
		{
			serviceName: string;
			lastSeen: number;
			requests: number;
			errors: number;
			p50: number | null;
			p95: number | null;
		}
	>();

	for (const row of result) {
		if (!byService.has(row.serviceName)) {
			byService.set(row.serviceName, {
				serviceName: row.serviceName,
				lastSeen: row.recordedAt,
				requests: 0,
				errors: 0,
				p50: null,
				p95: null,
			});
		}
		const entry = byService.get(row.serviceName)!;
		if (row.recordedAt > entry.lastSeen) entry.lastSeen = row.recordedAt;

		if (row.metricType === "requests") entry.requests = row.value;
		else if (row.metricType === "errors") entry.errors = row.value;
		else if (row.metricType === "latency_p50") entry.p50 = row.value;
		else if (row.metricType === "latency_p95") entry.p95 = row.value;
	}

	const workers = Array.from(byService.values()).sort((a, b) =>
		a.serviceName.localeCompare(b.serviceName),
	);

	return { workers, collectionTokenConfigured, dbAvailable: true };
};
