/**
 * GET    /api/fireside/[id] — resume: the conversation, whether there is enough to
 *                             organize, and what happened to any accepted draft.
 * DELETE /api/fireside/[id] — let it go. Messages cascade.
 *
 * A session that is not this tenant's and this writer's is `404`, not `403`: a
 * `403` would confirm it exists.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { requireFireside } from "$lib/server/fireside/guard";
import { canDraft } from "$lib/server/fireside/opening";
import { listMessages, loadOwnedSession } from "$lib/server/fireside/session";

export const GET: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	const messages = await listMessages(db, tenantId, sessionId);

	// The post's end of the link, so the panel can say "already used" rather than
	// offering a draft the writer has already accepted.
	const post = await db
		.prepare(
			`SELECT slug, title, fireside_assisted FROM posts WHERE fireside_session_id = ? LIMIT 1`,
		)
		.bind(sessionId)
		.first<{ slug: string; title: string; fireside_assisted: number }>();

	return json({
		session: {
			id: session.id,
			status: session.status,
			turns: session.turns,
			startedAt: session.started_at,
			updatedAt: session.updated_at,
			transcriptPublic: session.transcript_public === 1,
			transcriptPublishedAt: session.transcript_published_at,
		},
		messages: messages.map((message) => ({
			id: message.id,
			role: message.role,
			kind: message.kind,
			content: message.content,
			at: message.created_at,
		})),
		canDraft: canDraft(messages),
		acceptance: post
			? {
					accepted: true,
					slug: post.slug,
					title: post.title,
					assisted: post.fireside_assisted === 1,
				}
			: { accepted: false },
	});
};

export const DELETE: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	// Messages cascade. The post keeps its attribution: `posts.fireside_session_id`
	// is `ON DELETE SET NULL`, so deleting the conversation does not erase the
	// fact that the post was written with help.
	await db
		.prepare(`DELETE FROM fireside_sessions WHERE id = ? AND tenant_id = ?`)
		.bind(sessionId, tenantId)
		.run();

	return json({ deleted: true });
};
