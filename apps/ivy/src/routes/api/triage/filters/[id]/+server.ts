/**
 * Single Filter API
 *
 * DELETE /api/triage/filters/[id] - Delete a filter rule by ID
 */

import type { RequestHandler } from "./$types";
import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { IVY_ERRORS } from "$lib/errors";

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.isOwner) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.UNAUTHORIZED)), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = platform?.env;
	if (!env?.DB) {
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.CONFIG_ERROR)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const { id } = params;

		// Verify filter exists
		const existing = await env.DB.prepare("SELECT id FROM ivy_triage_filters WHERE id = ?")
			.bind(id)
			.first();

		if (!existing) {
			return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.FILTER_NOT_FOUND)), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Delete the filter
		await env.DB.prepare("DELETE FROM ivy_triage_filters WHERE id = ?").bind(id).run();

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to delete filter:", error);
		return new Response(JSON.stringify(buildErrorJson(IVY_ERRORS.DELETE_FAILED)), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
