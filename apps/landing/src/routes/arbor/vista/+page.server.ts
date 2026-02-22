/**
 * Vista Overview — server load
 *
 * Loads overview data (health summary, active alerts, last collection time).
 * Collector "connected" status is derived from whether collection data exists
 * in the observability_collection_log table (no env var check needed).
 */

import type { PageServerLoad } from "./$types";
import {
	getObservabilityOverview,
	getAlerts,
	getCollectionStatus,
} from "@autumnsgrove/lattice/server/observability";
import type { CollectionStatus } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent(); // ensures Wayfinder gate has run

	const db = platform?.env?.OBS_DB;

	if (!db) {
		return {
			overview: null,
			activeAlerts: [],
			collectionStatus: null as CollectionStatus | null,
			dbAvailable: false,
		};
	}

	const [overviewResult, alertsResult, statusResult] = await Promise.allSettled([
		getObservabilityOverview(db),
		getAlerts(db, 5),
		getCollectionStatus(db),
	]);

	const overview = overviewResult.status === "fulfilled" ? overviewResult.value : null;
	const activeAlerts = alertsResult.status === "fulfilled" ? alertsResult.value.active : [];
	const collectionStatus = statusResult.status === "fulfilled" ? statusResult.value : null;

	return {
		overview,
		activeAlerts,
		collectionStatus,
		dbAvailable: true,
	};
};
