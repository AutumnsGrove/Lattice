/**
 * Vista Databases — server load
 */

import type { PageServerLoad } from "./$types";
import { getDatabaseMetrics } from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;
	const collectionTokenConfigured = !!platform?.env?.CF_OBSERVABILITY_TOKEN;

	if (!db) {
		return { databases: [], collectionTokenConfigured, dbAvailable: false };
	}

	const databases = await getDatabaseMetrics(db).catch(() => []);
	return { databases, collectionTokenConfigured, dbAvailable: true };
};
