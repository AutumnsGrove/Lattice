/**
 * Vista Firefly — server load (stub)
 *
 * aggregateFirefly returns empty data since Queen Firefly is not deployed.
 * The page shows a warm "still in the workshop" notice.
 */

import type { PageServerLoad } from "./$types";
import { aggregateFirefly } from "@autumnsgrove/groveengine/server/observability";
import type { FireflyAggregateResult } from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { firefly: null as FireflyAggregateResult | null, dbAvailable: false };
	}

	const result = await aggregateFirefly(db).catch(() => null);
	const firefly = result?.data ?? null;
	return { firefly, dbAvailable: true };
};
