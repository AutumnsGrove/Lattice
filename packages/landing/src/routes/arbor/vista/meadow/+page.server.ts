/**
 * Vista Meadow — server load
 */

import type { PageServerLoad } from "./$types";
import { aggregateMeadow } from "@autumnsgrove/groveengine/server/observability";
import type { MeadowAggregateResult } from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { meadow: null as MeadowAggregateResult | null, dbAvailable: false };
	}

	const result = await aggregateMeadow(db).catch(() => null);
	const meadow = result?.data ?? null;
	return { meadow, dbAvailable: true };
};
