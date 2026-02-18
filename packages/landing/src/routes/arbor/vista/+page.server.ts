/**
 * Vista Overview — server load
 *
 * Loads overview data (health summary, active alerts, last collection time)
 * and checks whether the CF observability token is configured.
 */

import type { PageServerLoad } from "./$types";
import {
	getObservabilityOverview,
	getAlerts,
} from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent(); // ensures Wayfinder gate has run

	const db = platform?.env?.DB;
	const collectionTokenConfigured = !!platform?.env?.CF_OBSERVABILITY_TOKEN;

	if (!db) {
		return {
			overview: null,
			activeAlerts: [],
			collectionTokenConfigured,
			dbAvailable: false,
		};
	}

	const [overviewResult, alertsResult] = await Promise.allSettled([
		getObservabilityOverview(db),
		getAlerts(db, 5),
	]);

	const overview =
		overviewResult.status === "fulfilled"
			? { ...overviewResult.value, collectionTokenConfigured }
			: null;

	const activeAlerts = alertsResult.status === "fulfilled" ? alertsResult.value.active : [];

	return {
		overview,
		activeAlerts,
		collectionTokenConfigured,
		dbAvailable: true,
	};
};
