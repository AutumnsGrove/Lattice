/**
 * GET /api/admin/observability/moderation — Petal + Thorn moderation aggregates
 *
 * Returns { petal: {...}, thorn: {...} } with block rates, queue depths, and
 * category breakdowns. Both aggregators run in parallel. Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { aggregatePetal, aggregateThorn } from "@autumnsgrove/lattice/server/observability";
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
		const [petalResult, thornResult] = await Promise.allSettled([
			aggregatePetal(db),
			aggregateThorn(db),
		]);

		const petal = petalResult.status === "fulfilled" ? petalResult.value : null;
		const thorn = thornResult.status === "fulfilled" ? thornResult.value : null;

		return json({
			petal: petal ? { status: petal.status, data: petal.data ?? null, error: petal.error } : null,
			thorn: thorn ? { status: thorn.status, data: thorn.data ?? null, error: thorn.error } : null,
		});
	} catch (err) {
		console.error("[Vista/Moderation] Error:", err);
		return json(
			{ error: "GROVE-OBS-500", error_description: "An internal error occurred." },
			{ status: 500 },
		);
	}
};
