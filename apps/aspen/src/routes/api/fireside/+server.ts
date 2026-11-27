/**
 * POST /api/fireside — light the fire.
 *
 * Mints the session, writes Wisp's opening line, and returns both. The opening is
 * a fixed line rather than a model call (see `opening.ts`): nothing has been said
 * yet, and spending the writer's key on a greeting is a poor way to start.
 *
 * The body may carry the editor's words so the opening can ask the right question,
 * but nothing else from it is trusted — the history of a later turn is read from
 * the database, never from here.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireFireside } from "$lib/server/fireside/guard";
import { appendMessage } from "$lib/server/fireside/session";
import { openingLine } from "$lib/server/fireside/opening";

/**
 * How long an unpublished session lives. The spec's starting number: 90 days, then
 * the nightly sweep lets it go. A published transcript is exempt — the sweep
 * checks that, not this file.
 */
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;

export const POST: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);

	let draft = "";
	try {
		const body = (await event.request.json()) as { draft?: unknown };
		draft = typeof body.draft === "string" ? body.draft : "";
	} catch {
		// An empty body is a blank page, which is the common case for a new post.
	}

	const sessionId = crypto.randomUUID();
	const opening = openingLine(draft.trim().length > 0);

	await db
		.prepare(
			`INSERT INTO fireside_sessions (id, tenant_id, user_id, status, model, expires_at)
			 VALUES (?, ?, ?, 'open', NULL, unixepoch() + ?)`,
		)
		.bind(sessionId, tenantId, userId, SESSION_TTL_SECONDS)
		.run();

	await appendMessage(db, {
		id: crypto.randomUUID(),
		sessionId,
		tenantId,
		role: "wisp",
		content: opening,
	});

	return json({ sessionId, opening });
};
