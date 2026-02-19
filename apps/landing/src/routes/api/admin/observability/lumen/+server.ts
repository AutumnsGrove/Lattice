/**
 * GET /api/admin/observability/lumen — Lumen AI gateway aggregated metrics
 *
 * Returns 24h/30d cost, token usage, provider and model breakdowns.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { aggregateLumen } from "@autumnsgrove/lattice/server/observability";
import { isWayfinder } from "@autumnsgrove/lattice/config";

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
		const result = await aggregateLumen(db);
		return json({ status: result.status, data: result.data ?? null, error: result.error });
	} catch (err) {
		console.error("[Vista/Lumen] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
