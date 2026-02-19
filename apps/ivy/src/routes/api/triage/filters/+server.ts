/**
 * Triage Filters API
 *
 * GET /api/triage/filters - List all filter rules
 * POST /api/triage/filters - Add a new filter rule
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
		const query = `
			SELECT id, type, pattern, match_type, notes, created_at
			FROM ivy_triage_filters
			ORDER BY created_at DESC
		`;

		const { results } = await env.DB.prepare(query).all();

		return new Response(
			JSON.stringify({
				filters: results || [],
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to fetch filters:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch filters" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
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
		const body = (await request.json()) as {
			type: "blocklist" | "allowlist";
			pattern: string;
			match_type: "exact" | "domain" | "contains";
			notes?: string;
		};

		// Validate required fields
		if (!body.type || !body.pattern || !body.match_type) {
			return new Response(
				JSON.stringify({
					error: "Missing required fields: type, pattern, match_type",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate enum values
		if (!["blocklist", "allowlist"].includes(body.type)) {
			return new Response(
				JSON.stringify({
					error: 'Invalid type. Must be "blocklist" or "allowlist"',
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (!["exact", "domain", "contains"].includes(body.match_type)) {
			return new Response(
				JSON.stringify({
					error: 'Invalid match_type. Must be "exact", "domain", or "contains"',
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Generate ID: timestamp + random component
		const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
		const now = new Date().toISOString();

		const insertQuery = `
			INSERT INTO ivy_triage_filters (id, type, pattern, match_type, notes, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`;

		await env.DB.prepare(insertQuery)
			.bind(id, body.type, body.pattern, body.match_type, body.notes || null, now)
			.run();

		return new Response(
			JSON.stringify({
				id,
				type: body.type,
				pattern: body.pattern,
				match_type: body.match_type,
				notes: body.notes || null,
				created_at: now,
			}),
			{
				status: 201,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Failed to create filter:", error);
		return new Response(JSON.stringify({ error: "Failed to create filter" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
