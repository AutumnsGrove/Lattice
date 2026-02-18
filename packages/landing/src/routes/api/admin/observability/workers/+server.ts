/**
 * GET /api/admin/observability/workers — Worker metrics (last 24h)
 *
 * Returns raw metric rows from observability_metrics, grouped by service name.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getWorkerMetrics } from "@autumnsgrove/groveengine/server/observability";
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
		const metrics = await getWorkerMetrics(db, 24);
		return json({ metrics });
	} catch (err) {
		console.error("[Vista/Workers] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
