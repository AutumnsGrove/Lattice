/**
 * Single Email API
 *
 * GET /api/emails/[id] - Get email details (envelope from D1 + body from R2)
 * PUT /api/emails/[id] - Update email (read status, category)
 * DELETE /api/emails/[id] - Move to trash / permanent delete
 */

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals, platform }) => {
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
		const row = await env.DB.prepare(
			`SELECT id, encrypted_envelope, r2_content_key, category, confidence,
              suggested_action, topics, is_read, original_sender, created_at, classified_at
       FROM ivy_emails WHERE id = ?`,
		)
			.bind(params.id)
			.first();

		if (!row) {
			return new Response(JSON.stringify({ error: "Email not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		let envelope: Record<string, unknown> = {};
		try {
			envelope = JSON.parse(row.encrypted_envelope as string);
		} catch {
			// fallback
		}

		// Try to fetch body from R2
		let body = null;
		if (env.R2 && row.r2_content_key) {
			try {
				const object = await env.R2.get(row.r2_content_key as string);
				if (object) {
					body = await object.text();
				}
			} catch (err) {
				console.error("Failed to fetch R2 body:", err);
			}
		}

		// Mark as read
		if (row.is_read === 0) {
			await env.DB.prepare("UPDATE ivy_emails SET is_read = 1 WHERE id = ?").bind(params.id).run();
		}

		return new Response(
			JSON.stringify({
				id: row.id,
				...envelope,
				body,
				category: row.category,
				confidence: row.confidence,
				suggested_action: row.suggested_action,
				topics: JSON.parse((row.topics as string) || "[]"),
				is_read: 1,
				original_sender: row.original_sender,
				created_at: row.created_at,
				classified_at: row.classified_at,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Failed to fetch email:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch email" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
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
		const body = await request.json();
		const updates: string[] = [];
		const bindings: (string | number)[] = [];

		if (body.is_read !== undefined) {
			updates.push("is_read = ?");
			bindings.push(body.is_read ? 1 : 0);
		}

		if (body.category !== undefined) {
			updates.push("category = ?");
			bindings.push(body.category);
		}

		if (updates.length === 0) {
			return new Response(JSON.stringify({ error: "No fields to update" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		bindings.push(params.id);

		const result = await env.DB.prepare(`UPDATE ivy_emails SET ${updates.join(", ")} WHERE id = ?`)
			.bind(...bindings)
			.run();

		if (result.meta.changes === 0) {
			return new Response(JSON.stringify({ error: "Email not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to update email:", error);
		return new Response(JSON.stringify({ error: "Failed to update email" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

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
		// Get R2 key before deleting
		const email = await env.DB.prepare("SELECT r2_content_key FROM ivy_emails WHERE id = ?")
			.bind(params.id)
			.first<{ r2_content_key: string | null }>();

		if (!email) {
			return new Response(JSON.stringify({ error: "Email not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Delete from D1
		await env.DB.prepare("DELETE FROM ivy_emails WHERE id = ?").bind(params.id).run();

		// Delete from R2 if exists
		if (env.R2 && email.r2_content_key) {
			try {
				await env.R2.delete(email.r2_content_key);
			} catch (err) {
				console.error("Failed to delete R2 object:", err);
			}
		}

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to delete email:", error);
		return new Response(JSON.stringify({ error: "Failed to delete email" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
