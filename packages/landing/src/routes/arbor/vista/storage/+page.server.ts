/**
 * Vista Storage — server load
 */

import type { PageServerLoad } from "./$types";
import { getStorageMetrics } from "@autumnsgrove/lattice/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;
	const collectionTokenConfigured = !!platform?.env?.CF_OBSERVABILITY_TOKEN;

	if (!db) {
		return { r2: [], kv: [], collectionTokenConfigured, dbAvailable: false };
	}

	const storage = await getStorageMetrics(db).catch(() => ({ r2: [], kv: [] }));
	return { ...storage, collectionTokenConfigured, dbAvailable: true };
};
