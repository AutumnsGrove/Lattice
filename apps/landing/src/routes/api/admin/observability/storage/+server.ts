/**
 * GET /api/admin/observability/storage — R2 and KV storage metrics
 *
 * Returns { r2: [...], kv: [...] } with latest stats per bucket/namespace.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStorageMetrics } from "@autumnsgrove/lattice/server/observability";
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
		const storage = await getStorageMetrics(db);
		return json(storage);
	} catch (err) {
		console.error("[Vista/Storage] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
