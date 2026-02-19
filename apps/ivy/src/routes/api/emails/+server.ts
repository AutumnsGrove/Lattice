/**
 * Emails API
 *
 * GET /api/emails - List emails with pagination, category/read filters
 */

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals, platform }) => {
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

	// Parse query params
	const category = url.searchParams.get("category");
	const isRead = url.searchParams.get("is_read");
	const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
	const offset = parseInt(url.searchParams.get("offset") || "0");

	// Build query dynamically
	const conditions: string[] = [];
	const bindings: (string | number)[] = [];

	if (category && category !== "all") {
		conditions.push("category = ?");
		bindings.push(category);
	}

	if (isRead !== null && isRead !== undefined && isRead !== "") {
		conditions.push("is_read = ?");
		bindings.push(parseInt(isRead));
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	const query = `
    SELECT id, encrypted_envelope, category, confidence, suggested_action,
           topics, is_read, original_sender, created_at, classified_at
    FROM ivy_emails
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

	bindings.push(limit, offset);

	try {
		const { results } = await env.DB.prepare(query)
			.bind(...bindings)
			.all();

		// Get total count for pagination
		const countQuery = `SELECT COUNT(*) as total FROM ivy_emails ${whereClause}`;
		const countBindings = bindings.slice(0, -2); // Remove limit/offset
		const countResult =
			countBindings.length > 0
				? await env.DB.prepare(countQuery)
						.bind(...countBindings)
						.first<{ total: number }>()
				: await env.DB.prepare(countQuery).first<{ total: number }>();

		// Parse envelopes for client
		const emails = (results || []).map((row: Record<string, unknown>) => {
			let envelope = {};
			try {
				envelope = JSON.parse(row.encrypted_envelope as string);
			} catch {
				// fallback
			}
			return {
				id: row.id,
				...envelope,
				category: row.category,
				confidence: row.confidence,
				suggested_action: row.suggested_action,
				topics: JSON.parse((row.topics as string) || "[]"),
				is_read: row.is_read,
				original_sender: row.original_sender,
				created_at: row.created_at,
				classified_at: row.classified_at,
			};
		});

		return new Response(
			JSON.stringify({
				emails,
				total: countResult?.total || 0,
				limit,
				offset,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to fetch emails:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch emails" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
