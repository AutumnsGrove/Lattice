/**
 * GET /api/admin/observability/databases — D1 database metrics
 *
 * Returns the latest size/rows stats per registered database.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDatabaseMetrics } from "@autumnsgrove/groveengine/server/observability";
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
		const databases = await getDatabaseMetrics(db);
		return json({ databases });
	} catch (err) {
		console.error("[Vista/Databases] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
