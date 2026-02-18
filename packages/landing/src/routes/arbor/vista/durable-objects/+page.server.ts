/**
 * Vista Durable Objects — server load
 *
 * Fetches DO class metrics from the API endpoint (which merges with SERVICE_REGISTRY).
 */

import type { PageServerLoad } from "./$types";
import { SERVICE_REGISTRY } from "@autumnsgrove/groveengine/server/observability";

interface DOStatsRow {
	class_name: string;
	active_count: number;
	hibernating_count: number;
	alarm_count: number;
	storage_bytes: number;
	instrumentation_status: string;
	recorded_at: number;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return {
			durableObjects: SERVICE_REGISTRY.durableObjects.map((e) => ({
				...e,
				activeInstances: 0,
				hibernatingInstances: 0,
				totalAlarms: 0,
				storageBytes: 0,
				recordedAt: null,
				awaitingInstrumentation: true,
			})),
			dbAvailable: false,
		};
	}

	const result = await db
		.prepare(
			`SELECT s1.class_name, s1.active_count, s1.hibernating_count,
              s1.alarm_count, s1.storage_bytes, s1.instrumentation_status, s1.recorded_at
       FROM observability_do_stats s1
       WHERE s1.recorded_at = (
         SELECT MAX(s2.recorded_at) FROM observability_do_stats s2
         WHERE s2.class_name = s1.class_name
       )
       ORDER BY s1.class_name`,
		)
		.all<DOStatsRow>()
		.catch(() => ({ results: [] as DOStatsRow[] }));

	const rowsByClass = new Map((result.results ?? []).map((r) => [r.class_name, r]));

	const durableObjects = SERVICE_REGISTRY.durableObjects.map((entry) => {
		const row = rowsByClass.get(entry.className);
		if (row) {
			return {
				className: entry.className,
				workerScriptName: entry.workerScriptName,
				description: entry.description,
				activeInstances: row.active_count,
				hibernatingInstances: row.hibernating_count,
				totalAlarms: row.alarm_count,
				storageBytes: row.storage_bytes,
				recordedAt: row.recorded_at,
				awaitingInstrumentation: row.instrumentation_status !== "reporting",
			};
		}
		return {
			className: entry.className,
			workerScriptName: entry.workerScriptName,
			description: entry.description,
			activeInstances: 0,
			hibernatingInstances: 0,
			totalAlarms: 0,
			storageBytes: 0,
			recordedAt: null,
			awaitingInstrumentation: true,
		};
	});

	return { durableObjects, dbAvailable: true };
};
