/**
 * Digest Preview API
 *
 * GET /api/triage/digest/preview - Preview next digest content
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
		// Get settings for last digest time
		const settings = await env.DB.prepare("SELECT last_digest_at FROM ivy_settings LIMIT 1").first<{
			last_digest_at: string | null;
		}>();

		const since =
			settings?.last_digest_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

		// Get unread emails since last digest, grouped by category
		const { results } = await env.DB.prepare(
			`SELECT id, encrypted_envelope, category, confidence, suggested_action,
              topics, original_sender, created_at
       FROM ivy_emails
       WHERE is_read = 0 AND category != 'junk' AND created_at > ?
       ORDER BY
         CASE category
           WHEN 'important' THEN 1
           WHEN 'actionable' THEN 2
           WHEN 'fyi' THEN 3
           WHEN 'social' THEN 4
           WHEN 'transactional' THEN 5
           WHEN 'marketing' THEN 6
           ELSE 7
         END,
         created_at DESC`,
		)
			.bind(since)
			.all();

		const emails = (results || []).map((row: Record<string, unknown>) => {
			let envelope: Record<string, unknown> = {};
			try {
				envelope = JSON.parse(row.encrypted_envelope as string);
			} catch {
				// fallback
			}
			return {
				id: row.id,
				from: envelope.from || row.original_sender,
				subject: envelope.subject || "(no subject)",
				category: row.category,
				confidence: row.confidence,
				suggested_action: row.suggested_action,
				created_at: row.created_at,
			};
		});

		// Group by category
		const grouped: Record<string, typeof emails> = {};
		for (const email of emails) {
			const cat = email.category as string;
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push(email);
		}

		return new Response(
			JSON.stringify({
				since,
				emailCount: emails.length,
				grouped,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to preview digest:", error);
		return new Response(JSON.stringify({ error: "Failed to preview digest" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
