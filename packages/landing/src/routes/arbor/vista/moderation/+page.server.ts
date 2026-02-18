/**
 * Vista Moderation — server load
 */

import type { PageServerLoad } from "./$types";
import { aggregatePetal, aggregateThorn } from "@autumnsgrove/groveengine/server/observability";
import type {
	PetalAggregateResult,
	ThornAggregateResult,
} from "@autumnsgrove/groveengine/server/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return {
			petal: null as PetalAggregateResult | null,
			thorn: null as ThornAggregateResult | null,
			dbAvailable: false,
		};
	}

	const [petalResult, thornResult] = await Promise.allSettled([
		aggregatePetal(db),
		aggregateThorn(db),
	]);

	const petal = petalResult.status === "fulfilled" ? (petalResult.value.data ?? null) : null;
	const thorn = thornResult.status === "fulfilled" ? (thornResult.value.data ?? null) : null;

	return { petal, thorn, dbAvailable: true };
};
