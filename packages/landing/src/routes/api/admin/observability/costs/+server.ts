/**
 * GET /api/admin/observability/costs — Daily cost estimates (last 30 days)
 *
 * Returns per-service cost rows and the current pricing constants.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
	getCostMetrics,
	CLOUDFLARE_PRICING,
	PRICING_LAST_VERIFIED,
} from "@autumnsgrove/groveengine/server/observability";
import { isWayfinder } from "@autumnsgrove/groveengine/config";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db)
		return json(
			{ error: "GROVE-OBS-503", error_description: "Database unavailable" },
			{ status: 503 },
		);
	if (!isWayfinder(locals.user?.email ?? ""))
		return json(
			{ error: "GROVE-OBS-403", error_description: "Wayfinder access required" },
			{ status: 403 },
		);

	try {
		const costs = await getCostMetrics(db, 30);
		return json({
			costs,
			pricing: CLOUDFLARE_PRICING,
			pricingLastVerified: PRICING_LAST_VERIFIED,
		});
	} catch (err) {
		console.error("[Vista/Costs] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
