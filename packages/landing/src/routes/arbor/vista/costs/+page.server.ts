/**
 * Vista Costs — server load
 */

import type { PageServerLoad } from "./$types";
import {
	getCostMetrics,
	PRICING_LAST_VERIFIED,
} from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { costs: [], pricingLastVerified: PRICING_LAST_VERIFIED, dbAvailable: false };
	}

	const costs = await getCostMetrics(db, 30).catch(() => []);
	return { costs, pricingLastVerified: PRICING_LAST_VERIFIED, dbAvailable: true };
};
