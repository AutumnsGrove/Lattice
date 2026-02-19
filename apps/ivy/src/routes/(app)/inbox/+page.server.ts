/**
 * Inbox Page Server Load
 *
 * Fetches emails from D1 for the owner, with category and read status filters.
 * Non-owners get empty data (demo mode handled client-side).
 */

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals, platform }) => {
	if (!locals.isOwner) {
		return { emails: [], total: 0, stats: null };
	}

	const env = platform?.env;
	if (!env?.DB) {
		return { emails: [], total: 0, stats: null };
	}

	const category = url.searchParams.get("category") || "all";
	const limit = 50;
	const offset = parseInt(url.searchParams.get("offset") || "0");

	// Build query
	const conditions: string[] = [];
	const bindings: (string | number)[] = [];

	if (category && category !== "all") {
		conditions.push("category = ?");
		bindings.push(category);
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	try {
		// Fetch emails
		const emailQuery = `
      SELECT id, encrypted_envelope, category, confidence, suggested_action,
             topics, is_read, original_sender, created_at, classified_at
      FROM ivy_emails
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

		const emailBindings = [...bindings, limit, offset];
		const { results } = await env.DB.prepare(emailQuery)
			.bind(...emailBindings)
			.all();

		// Parse emails
		const emails = (results || []).map((row: Record<string, unknown>) => {
			let envelope: Record<string, unknown> = {};
			try {
				envelope = JSON.parse(row.encrypted_envelope as string);
			} catch {
				// fallback
			}
			return {
				id: row.id as string,
				from: (envelope.from as string) || (row.original_sender as string) || "Unknown",
				subject: (envelope.subject as string) || "(no subject)",
				snippet: (envelope.snippet as string) || "",
				category: row.category as string,
				confidence: row.confidence as number,
				suggested_action: row.suggested_action as string,
				topics: JSON.parse((row.topics as string) || "[]"),
				is_read: row.is_read as number,
				created_at: row.created_at as string,
			};
		});

		// Get total count
		const countQuery = `SELECT COUNT(*) as total FROM ivy_emails ${whereClause}`;
		const countBindings = bindings.slice();
		const countResult =
			countBindings.length > 0
				? await env.DB.prepare(countQuery)
						.bind(...countBindings)
						.first<{ total: number }>()
				: await env.DB.prepare(countQuery).first<{ total: number }>();

		// Get category stats
		const { results: statsResults } = await env.DB.prepare(
			`SELECT category, COUNT(*) as count, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
       FROM ivy_emails GROUP BY category`,
		).all();

		const stats: Record<string, { count: number; unread: number }> = {};
		for (const row of statsResults || []) {
			stats[row.category as string] = {
				count: row.count as number,
				unread: row.unread as number,
			};
		}

		return {
			emails,
			total: countResult?.total || 0,
			stats,
		};
	} catch (error) {
		console.error("Failed to load inbox:", error);
		return { emails: [], total: 0, stats: null };
	}
};
