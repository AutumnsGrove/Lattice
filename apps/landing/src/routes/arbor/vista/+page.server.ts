/**
 * Vista Overview — server load
 *
 * Loads overview data (health summary, active alerts, last collection time).
 * Collector "connected" status is derived from whether collection data exists
 * in the observability_collection_log table (no env var check needed).
 */

import type { PageServerLoad } from "./$types";
import { getObservabilityOverview, getAlerts } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent(); // ensures Wayfinder gate has run

	const db = platform?.env?.DB;

	if (!db) {
		return {
			overview: null,
			activeAlerts: [],
			collectorConnected: false,
			dbAvailable: false,
		};
	}

	const [overviewResult, alertsResult] = await Promise.allSettled([
		getObservabilityOverview(db),
		getAlerts(db, 5),
	]);

	const overview = overviewResult.status === "fulfilled" ? overviewResult.value : null;
	const activeAlerts = alertsResult.status === "fulfilled" ? alertsResult.value.active : [];

	return {
		overview,
		activeAlerts,
		collectorConnected: overview?.collectorConnected ?? false,
		dbAvailable: true,
	};
};
