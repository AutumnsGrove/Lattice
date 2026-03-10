/**
 * Digest Send API
 *
 * POST /api/triage/digest/send - Manually trigger digest
 */

import type { RequestHandler } from "./$types";
import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { IVY_ERRORS } from "$lib/errors";

export const POST: RequestHandler = async ({ locals, platform }) => {
	if (!locals.isOwner) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.UNAUTHORIZED)), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = platform?.env;
	if (!env?.TRIAGE) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.CONFIG_ERROR)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const triageDO = env.TRIAGE;
		const doId = triageDO.idFromName("triage:owner");
		const stub = triageDO.get(doId);

		const response = await stub.fetch(
			new Request("http://localhost/digest", {
				method: "POST",
				body: JSON.stringify({ manual: true }),
			}),
		);

		const result = await response.json();

		return new Response(JSON.stringify(result), {
			status: response.status,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to trigger digest:", error);
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.DIGEST_TRIGGER_FAILED)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
