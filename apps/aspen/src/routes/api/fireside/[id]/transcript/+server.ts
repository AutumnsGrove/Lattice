/**
 * POST /api/fireside/[id]/transcript — publish the conversation under its post, or
 * take it back down.
 *
 * The accept route asks once, at the moment of accepting; this is the same choice
 * made later, from the post itself or from the fire in the editor. Two things have
 * to happen together, and both are easy to forget:
 *
 * 1. **The post's cached payload is the reader-facing surface.** The transcript
 *    rides in `garden:<tenant>:<slug>` (the spec's instruction), so a visibility
 *    change that does not purge that key is a disclosure that stays wrong for up
 *    to a day of stale-while-revalidate.
 * 2. **The first time it becomes public, it is published content.** It goes
 *    through Thorn exactly as the post body does — the transcript was written in a
 *    private conversation, and publishing is what subjects it to the same rule
 *    every other published word follows.
 *
 * Turning it off does not re-moderate, and does not restore the expiry clock. The
 * conversation was public; the writer changing their mind afterwards is not a
 * reason to make the record forget that the disclosure was made in good faith.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { requireFireside } from "$lib/server/fireside/guard";
import { setTranscriptPublic } from "$lib/server/fireside/publish";
import { listMessages, loadOwnedSession } from "$lib/server/fireside/session";
import { buildTranscript } from "$lib/server/fireside/transcript";

export const POST: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;
	const env = event.platform?.env;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	// The post's end of the link. No post means nothing was accepted, and a
	// conversation with no page has nothing to disclose — `404`, not a toggle.
	const post = await db
		.prepare(
			`SELECT slug FROM posts
			  WHERE fireside_session_id = ? AND tenant_id = ?
			  LIMIT 1`,
		)
		.bind(sessionId, tenantId)
		.first<{ slug: string }>();

	if (!post) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	let body: { public?: unknown };
	try {
		body = (await event.request.json()) as typeof body;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "Fireside");
	}

	if (typeof body.public !== "boolean") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "Fireside", {
			detail: "the body says `public: true` or `public: false`",
		});
	}

	const publish = body.public;

	// The conversation comes back with the answer, so the footer can show it without
	// reloading the page it is already on. Loaded before the write so the shared
	// helper can moderate it without a second read.
	const messages = publish ? await listMessages(db, tenantId, sessionId) : [];

	await setTranscriptPublic({
		db,
		tenantId,
		userId,
		sessionId,
		slug: post.slug,
		publish,
		wasPublic: session.transcript_public === 1,
		messages,
		env,
		waitUntil: event.platform?.context?.waitUntil.bind(event.platform.context),
	});

	const transcript =
		publish && messages.length > 0
			? {
					// The date it first went public, which re-publishing does not move.
					publishedAt: session.transcript_published_at ?? Math.floor(Date.now() / 1000),
					entries: buildTranscript(messages, { accepted: session.status === "accepted" }),
				}
			: null;

	return json({ transcriptPublic: publish, slug: post.slug, transcript });
};
