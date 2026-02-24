/**
 * Blazes API — Read-only blaze definitions for the Meadow composer
 *
 * GET /api/blazes — Returns global defaults + tenant custom blazes (if authenticated).
 */

import { json } from "@sveltejs/kit";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import type { RequestHandler } from "./$types";

interface BlazeRow {
	slug: string;
	label: string;
	icon: string;
	color: string;
	tenant_id: string | null;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	try {
		// Fire global query — needed for all users
		const globalQuery = db
			.prepare(
				"SELECT slug, label, icon, color FROM blaze_definitions WHERE tenant_id IS NULL ORDER BY sort_order",
			)
			.all<BlazeRow>();

		// If authenticated with a tenant, run both in parallel
		const tenantId = locals.user?.tenantId;
		if (tenantId) {
			const [globalResult, tenantResult] = await Promise.all([
				globalQuery,
				db
					.prepare(
						"SELECT slug, label, icon, color FROM blaze_definitions WHERE tenant_id = ? ORDER BY sort_order",
					)
					.bind(tenantId)
					.all<BlazeRow>(),
			]);

			const blazes = [
				...(globalResult.results ?? []).map((r) => ({ ...r, scope: "global" as const })),
				...(tenantResult.results ?? []).map((r) => ({ ...r, scope: "tenant" as const })),
			];

			return json({ blazes }, { headers: { "Cache-Control": "private, max-age=60" } });
		}

		// Unauthenticated — globals only
		const globalResult = await globalQuery;
		const blazes = (globalResult.results ?? []).map((r) => ({
			...r,
			scope: "global" as const,
		}));

		return json({ blazes }, { headers: { "Cache-Control": "public, max-age=300" } });
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
