/**
 * GET /api/admin/observability/warden — Warden API gateway aggregated metrics
 *
 * Returns request volume, auth failure rate, per-service latency, and security
 * signals. Returns available=false gracefully if Warden is not deployed.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { aggregateWarden } from "@autumnsgrove/lattice/server/observability";
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
		const result = await aggregateWarden(db);
		return json({ status: result.status, data: result.data ?? null, error: result.error });
	} catch (err) {
		console.error("[Vista/Warden] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
