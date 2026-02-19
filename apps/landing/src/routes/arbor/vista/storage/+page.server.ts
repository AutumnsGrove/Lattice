/**
 * Vista Storage — server load
 */

import type { PageServerLoad } from "./$types";
import { getStorageMetrics, hasCollectionData } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { r2: [], kv: [], collectorConnected: false, dbAvailable: false };
	}

	const [storage, collectorConnected] = await Promise.all([
		getStorageMetrics(db).catch(() => ({ r2: [], kv: [] })),
		hasCollectionData(db),
	]);
	return { ...storage, collectorConnected, dbAvailable: true };
};
