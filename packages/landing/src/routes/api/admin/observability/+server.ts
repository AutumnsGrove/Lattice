/**
 * GET /api/admin/observability — Overview summary for Vista dashboard
 *
 * Returns last collection timestamp, active alert count, health summary
 * per endpoint, and whether the CF observability token is configured.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getObservabilityOverview } from "@autumnsgrove/groveengine/server/observability";
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
		const overview = await getObservabilityOverview(db);
		return json({
			...overview,
			collectionTokenConfigured: !!platform?.env?.CF_OBSERVABILITY_TOKEN,
		});
	} catch (err) {
		console.error("[Vista/Overview] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
