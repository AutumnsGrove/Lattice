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
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { invalidatePostCaches } from "$lib/server/post-cache";
import {
	listMessages,
	loadOwnedSession,
	type FiresideMessageRow,
	type FiresideSessionRow,
} from "./session";
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
	if (!env?.AI || !options.waitUntil) {
		// Publishing fails open only for a deployment misconfiguration. Say so: a
		// transcript going live unmoderated must be a line somebody can find.
		console.warn(
			"[Fireside] publishing a transcript without moderation: " +
				(!env?.AI ? "no AI binding" : "no waitUntil"),
		);
		return;
	}

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

/**
 * Acceptance, as a save request carries it.
 *
 * The page used to save the post and *then* call `/accept`. If that second call
 * failed, the post existed with no marker and no link — a lie of omission with no
 * error anybody would notice. So the save now carries the acceptance, and the
 * attribution lands in the same INSERT as the post: a post that exists because a
 * conversation happened says so, or it does not exist.
 *
 * The reverse order (mark the session accepted, then insert) cannot fail that way:
 * if the session update is lost, the post still carries the truth and the session
 * is merely still `drafted`, which re-accepting fixes.
 */

export interface FiresideInput {
	sessionId: string;
	transcriptPublic: boolean;
}

/**
 * Read the optional `fireside` block out of a save payload.
 *
 * `null` when absent — most posts have nothing to do with Fireside. A block that is
 * present must be exact: `transcriptPublic` is a yes or a no, never "on".
 */
export function readFiresideInput(value: unknown): FiresideInput | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== "object") {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
			detail: "fireside must be an object with a sessionId",
		});
	}

	const { sessionId, transcriptPublic } = value as {
		sessionId?: unknown;
		transcriptPublic?: unknown;
	};

	if (typeof sessionId !== "string" || sessionId.trim() === "") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API", {
			detail: "fireside needs the session it came from",
		});
	}

	return {
		sessionId: sessionId.trim(),
		transcriptPublic: transcriptPublic === true,
	};
}

/**
 * The session behind an acceptance, or `404`.
 *
 * Verified *before* the post is written, so a save carrying someone else's session
 * creates nothing at all. Scoped on tenant and writer, like every other lookup:
 * the conversation belongs to a person, not to an editor shared within a grove.
 */
export async function requireOwnedFiresideSession(
	db: D1Database,
	tenantId: string,
	userId: string,
	sessionId: string,
): Promise<FiresideSessionRow> {
	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}
	return session;
}

/**
 * A conversation becomes one post. This refuses the second.
 *
 * Both halves of the link are unique in intent but not in the database: a post may
 * only have one conversation (that is enforced in the callers), and a conversation
 * may only have one post. Without the second rule a writer who accepts the same
 * session into a second post ends up with two posts pointing at one row — and then
 * deleting either post deletes the conversation, nulls the other post's link, and
 * takes a transcript off a page nobody touched.
 *
 * Scoped by tenant, and compared against the post being saved so a re-save of the
 * same post is not a conflict with itself.
 */
export async function assertConversationUnclaimed(
	db: D1Database,
	tenantId: string,
	sessionId: string,
	currentSlug?: string,
): Promise<void> {
	const claimed = await db
		.prepare(
			`SELECT slug FROM posts
			  WHERE fireside_session_id = ? AND tenant_id = ? AND slug != ?
			  LIMIT 1`,
		)
		.bind(sessionId, tenantId, currentSlug ?? "")
		.first<{ slug: string }>();

	if (claimed) {
		throwGroveError(409, API_ERRORS.VALIDATION_FAILED, "Fireside", {
			detail: `that conversation already became "${claimed.slug}"; a conversation belongs to one post`,
		});
	}
}

/**
 * After the post exists: accept the session, and publish the transcript if asked.
 *
 * Called by both save routes (create and update) so an accepted draft behaves the
 * same whether the post was new or already on the page.
 */
export async function recordAcceptance(options: {
	db: D1Database;
	tenantId: string;
	userId: string;
	sessionId: string;
	slug: string;
	transcriptPublic: boolean;
	session: FiresideSessionRow;
	/**
	 * Whether the post ended up pointing at this session. The link keeps the first
	 * conversation, so a later accept is recorded but published nowhere — and a public
	 * transcript with no post to take it down is the one state nobody can fix.
	 */
	linked: boolean;
	env?: PublishEnvironment;
	waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<void> {
	await options.db
		.prepare(
			`UPDATE fireside_sessions
			    SET status = 'accepted', updated_at = unixepoch()
			  WHERE id = ? AND tenant_id = ?`,
		)
		.bind(options.sessionId, options.tenantId)
		.run();

	if (options.transcriptPublic && options.linked) {
		await setTranscriptPublic({
			db: options.db,
			tenantId: options.tenantId,
			userId: options.userId,
			sessionId: options.sessionId,
			slug: options.slug,
			publish: true,
			wasPublic: options.session.transcript_public === 1,
			env: options.env,
			waitUntil: options.waitUntil,
		});
	} else if (options.transcriptPublic) {
		console.warn(
			`[Fireside] transcript not published: session ${options.sessionId} is not the post's ` +
				`conversation (${options.slug} keeps its first)`,
		);
	}
}
