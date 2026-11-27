/**
 * POST /api/fireside/[id]/accept — record that the writer took the draft.
 *
 * Accept is the only place the feature touches a post, and it does the two things
 * the spec insists on together:
 *
 * - **`fireside_assisted` is set, and can never be cleared.** The marker is derived
 *   from the flag when the post renders, so nothing is appended to
 *   `markdown_content` and nothing needs re-appending when the post is edited.
 *   An edit may not remove the attribution, by accident or on purpose.
 * - **The post owns the transcript.** `posts.fireside_session_id` is written here,
 *   which is what makes "delete the post, delete the conversation" true.
 *
 * What this route does *not* do is write the body. The client already has the
 * proposal on screen and merging it into the editor is the editor's job (insert at
 * top / replace / cancel); this endpoint records the outcome once the post exists.
 * That ordering matters: a route that wrote markdown would be a route that could
 * overwrite a paragraph the writer had added in between.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { requireFireside } from "$lib/server/fireside/guard";
import { setTranscriptPublic } from "$lib/server/fireside/publish";
import { loadOwnedSession } from "$lib/server/fireside/session";
import { invalidatePostCaches } from "../../../blooms/[slug]/bloom-service";

export const POST: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	let body: { slug?: unknown; transcriptPublic?: unknown };
	try {
		body = (await event.request.json()) as typeof body;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "Fireside");
	}

	const slug = typeof body.slug === "string" ? body.slug.trim() : "";
	if (slug === "") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "Fireside", {
			detail: "accept needs the post's slug",
		});
	}

	// Scoped to the tenant, so a slug from another grove cannot be claimed.
	const post = await db
		.prepare(`SELECT id FROM posts WHERE tenant_id = ? AND slug = ?`)
		.bind(tenantId, slug)
		.first<{ id: string }>();

	if (!post) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	// The flag cannot be cleared: `= 1` rather than a literal, so re-accepting a post
	// that already carries it is a no-op instead of a reset.
	await db
		.prepare(
			`UPDATE posts
			    SET fireside_assisted = 1,
			        fireside_session_id = ?,
			        updated_at = unixepoch()
			  WHERE id = ? AND tenant_id = ?`,
		)
		.bind(sessionId, post.id, tenantId)
		.run();

	const transcriptPublic = body.transcriptPublic === true;

	await db
		.prepare(
			`UPDATE fireside_sessions
			    SET status = 'accepted', updated_at = unixepoch()
			  WHERE id = ? AND tenant_id = ?`,
		)
		.bind(sessionId, tenantId)
		.run();

	// The transcript columns and everything that follows from them belong to one
	// place: publishing here used to skip both the cache purge and Thorn, which made
	// this the short path to a public conversation nobody moderated.
	if (transcriptPublic) {
		await setTranscriptPublic({
			db,
			tenantId,
			userId,
			sessionId,
			slug,
			publish: true,
			wasPublic: session.transcript_public === 1,
			env: event.platform?.env,
			waitUntil: event.platform?.context?.waitUntil.bind(event.platform.context),
		});
	} else {
		// The marker lives in the cached payload too. Accepting and leaving the
		// transcript private still changes what the page says, so this purge is not
		// conditional on the transcript.
		await invalidatePostCaches(event.platform?.env?.CACHE_KV, tenantId, slug);
	}

	return json({ accepted: true, slug, assisted: true, transcriptPublic });
};
