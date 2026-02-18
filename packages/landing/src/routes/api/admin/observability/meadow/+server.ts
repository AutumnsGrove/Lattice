/**
 * GET /api/admin/observability/meadow — Meadow community feed aggregated metrics
 *
 * Returns post creation rate, engagement counts, report queue depth.
 * Returns available=false gracefully if Meadow tables are not present.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { aggregateMeadow } from "@autumnsgrove/groveengine/server/observability";
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
		const result = await aggregateMeadow(db);
		return json({ status: result.status, data: result.data ?? null, error: result.error });
	} catch (err) {
		console.error("[Vista/Meadow] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
