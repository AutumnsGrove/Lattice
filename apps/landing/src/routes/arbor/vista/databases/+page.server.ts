/**
 * Vista Databases — server load
 */

import type { PageServerLoad } from "./$types";
import {
	getDatabaseMetrics,
	getCollectionStatus,
} from "@autumnsgrove/lattice/server/observability";
import type { CollectionStatus } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.OBS_DB;

	if (!db) {
		return { databases: [], collectionStatus: null as CollectionStatus | null, dbAvailable: false };
	}

	const [databases, collectionStatus] = await Promise.all([
		getDatabaseMetrics(db).catch(() => []),
		getCollectionStatus(db),
	]);
	return { databases, collectionStatus, dbAvailable: true };
};
