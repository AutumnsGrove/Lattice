/**
 * POST /api/admin/observability/collect — Manual collection trigger
 *
 * Returns instructions for triggering a manual collection run.
 * The collector runs as a separate worker (grove-vista-collector) — a service
 * binding is needed to trigger it from here, which is not yet wired.
 * Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isWayfinder } from "@autumnsgrove/lattice/config";

export const POST: RequestHandler = async ({ platform, locals }) => {
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

	return json(
		{
			success: false,
			message:
				"Manual collection is not yet available from this endpoint. The collector worker service binding is not configured.",
		},
		{ status: 501 },
	);
};
