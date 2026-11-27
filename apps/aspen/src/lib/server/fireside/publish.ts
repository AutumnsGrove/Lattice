/**
 * Making a conversation public — from both doors.
 *
 * Accept asks the question once; the post page and the editor ask it again later.
 * Both have to do the same three things, and the failure mode when they do not is
 * not a bug report but a bypass:
 *
 * 1. **Write the columns.** One statement, because `transcript_published_at` is the
 *    date the writer decided (not the date they last clicked) and `expires_at` is
 *    cleared for a published transcript and never re-armed.
 * 2. **Purge the post's cached payload.** The transcript rides in
 *    `garden:<tenant>:<slug>`, so a visibility change that skips the purge is a
 *    disclosure that stays wrong for a day of stale-while-revalidate.
 * 3. **Moderate the first publish.** A conversation written privately becomes
 *    published content the moment it is shared, and from then on it is held to the
 *    same rule as the post body.
 *
 * This file exists because the first two callers would otherwise drift, and the one
 * that drifted would be the shorter, easier path a client could reach for.
 */

import { moderatePublishedContent } from "@autumnsgrove/thorn/hooks";
import { invalidatePostCaches } from "../../../routes/api/blooms/[slug]/bloom-service";
import { listMessages, type FiresideMessageRow } from "./session";
import { transcriptTextForModeration } from "./transcript";

/** Only the bindings this decision needs, so a caller can pass `platform.env`. */
export interface PublishEnvironment {
	CACHE_KV?: KVNamespace;
	AI?: Ai;
	OPENROUTER_API_KEY?: string;
}

export interface PublishOptions {
	db: D1Database;
	tenantId: string;
	userId: string;
	sessionId: string;
	/** The post this conversation is disclosed under. */
	slug: string;
	publish: boolean;
	/**
	 * Whether it was already public before this call. The caller has the session row
	 * in hand; re-reading it here would be a second chance to get it wrong.
	 */
	wasPublic: boolean;
	/** The conversation, when the caller already has it. Loaded here otherwise. */
	messages?: readonly FiresideMessageRow[];
	env?: PublishEnvironment;
	/** `platform.context.waitUntil`, for moderation that must not block the reply. */
	waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Publish the conversation, or take it down. Idempotent in both directions.
 */
export async function setTranscriptPublic(options: PublishOptions): Promise<void> {
	const { db, tenantId, userId, sessionId, slug, publish, wasPublic } = options;
	const firstPublish = publish && !wasPublic;

	await db
		.prepare(
			`UPDATE fireside_sessions
			    SET transcript_public = ?,
			        -- The date it first went public. Re-publishing keeps the first one:
			        -- this is when the writer decided, not when they last clicked.
			        transcript_published_at = CASE
			            WHEN ? = 1 THEN COALESCE(transcript_published_at, unixepoch())
			            ELSE transcript_published_at
			        END,
			        -- A public transcript is exempt from the sweep. Coming back down
			        -- does not re-arm it: the conversation has been on the page.
			        expires_at = CASE WHEN ? = 1 THEN NULL ELSE expires_at END,
			        updated_at = unixepoch()
			  WHERE id = ? AND tenant_id = ?`,
		)
		.bind(publish ? 1 : 0, publish ? 1 : 0, publish ? 1 : 0, sessionId, tenantId)
		.run();

	// Before the moderation, so a slow model call cannot delay a purge.
	await invalidatePostCaches(options.env?.CACHE_KV, tenantId, slug);

	if (!firstPublish) return;

	const env = options.env;
	if (!env?.AI || !options.waitUntil) return;

	const messages = options.messages ?? (await listMessages(db, tenantId, sessionId));

	options.waitUntil(
		moderatePublishedContent({
			content: transcriptTextForModeration(messages),
			ai: env.AI,
			db,
			openrouterApiKey: env.OPENROUTER_API_KEY,
			tenantId,
			userId,
			contentType: "blog_post",
			hookPoint: "on_publish",
			contentRef: slug,
		}),
	);
}
