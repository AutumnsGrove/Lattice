/**
 * Vista Databases — server load
 */

import type { PageServerLoad } from "./$types";
import { getDatabaseMetrics, hasCollectionData } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { databases: [], collectorConnected: false, dbAvailable: false };
	}

	const [databases, collectorConnected] = await Promise.all([
		getDatabaseMetrics(db).catch(() => []),
		hasCollectionData(db),
	]);
	return { databases, collectorConnected, dbAvailable: true };
};
