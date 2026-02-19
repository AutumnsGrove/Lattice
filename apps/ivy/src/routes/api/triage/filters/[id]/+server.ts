/**
 * Single Filter API
 *
 * DELETE /api/triage/filters/[id] - Delete a filter rule by ID
 */

import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.isOwner) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const env = platform?.env;
	if (!env?.DB) {
		return new Response(JSON.stringify({ error: "Server configuration error" }), {
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
			return new Response(JSON.stringify({ error: "Filter not found" }), {
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
		return new Response(JSON.stringify({ error: "Failed to delete filter" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
