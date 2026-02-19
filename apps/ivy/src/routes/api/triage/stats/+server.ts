/**
 * Triage Stats API
 *
 * GET /api/triage/stats - Category counts for dashboard
 */

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, platform }) => {
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
		const { results } = await env.DB.prepare(
			`SELECT category, COUNT(*) as count, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
       FROM ivy_emails
       GROUP BY category
       ORDER BY count DESC`,
		).all();

		const totalResult = await env.DB.prepare(
			"SELECT COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread FROM ivy_emails",
		).first<{ total: number; unread: number }>();

		return new Response(
			JSON.stringify({
				categories: results || [],
				total: totalResult?.total || 0,
				totalUnread: totalResult?.unread || 0,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to fetch stats:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch stats" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
