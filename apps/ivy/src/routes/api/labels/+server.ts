/**
 * Labels API
 *
 * GET /api/labels - List user's labels
 * POST /api/labels - Create new label
 */

import type { RequestHandler } from "./$types";
import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { IVY_ERRORS } from "$lib/errors";

export const GET: RequestHandler = async ({ locals, platform }) => {
	// TODO: Auth check
	// TODO: Fetch labels (stored in encrypted user settings or separate table)

	return new Response(JSON.stringify({ labels: [] }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// TODO: Auth check
	// TODO: Create label

	return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.NOT_IMPLEMENTED)), {
		status: 501,
		headers: { "Content-Type": "application/json" },
	});
};
