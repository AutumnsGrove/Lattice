/**
 * Cancel Queued Email (Unsend)
 *
 * POST /api/queue/cancel
 *
 * Cancels a queued email before it sends.
 * Uses optimistic locking to handle race conditions.
 */

import type { RequestHandler } from "./$types";
import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { IVY_ERRORS } from "$lib/errors";

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// TODO: Auth check
	// TODO: Get email ID from request body
	// TODO: Attempt to cancel (optimistic locking)
	// TODO: Return success/failure

	return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.NOT_IMPLEMENTED)), {
		status: 501,
		headers: { "Content-Type": "application/json" },
	});
};
