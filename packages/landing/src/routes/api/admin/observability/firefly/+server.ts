/**
 * GET /api/admin/observability/firefly — Queen Firefly aggregated metrics (stub)
 *
 * Calls aggregateFirefly which returns empty/stub data since Firefly is not deployed.
 * The dashboard page handles the empty state with a warm notice.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { aggregateFirefly } from "@autumnsgrove/groveengine/server/observability";
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
		const result = await aggregateFirefly(db);
		return json({ status: result.status, data: result.data ?? null, error: result.error });
	} catch (err) {
		console.error("[Vista/Firefly] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
