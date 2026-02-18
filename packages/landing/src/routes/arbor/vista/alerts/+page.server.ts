/**
 * Vista Alerts — server load
 */

import type { PageServerLoad } from "./$types";
import { getAlerts, getAlertThresholds } from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return {
			active: [],
			recent: [],
			thresholds: [],
			dbAvailable: false,
		};
	}

	const [alertsResult, thresholdsResult] = await Promise.allSettled([
		getAlerts(db),
		getAlertThresholds(db),
	]);

	const alerts =
		alertsResult.status === "fulfilled" ? alertsResult.value : { active: [], recent: [] };
	const thresholds = thresholdsResult.status === "fulfilled" ? thresholdsResult.value : [];

	return {
		active: alerts.active,
		recent: alerts.recent,
		thresholds,
		dbAvailable: true,
	};
};
