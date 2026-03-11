/**
 * Chat Messages API — History & Send
 *
 * GET  — Paginated message history (cursor-based)
 * POST — Send a message (REST path, rate-limited)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";
import { isRedirect, isHttpError } from "$lib/server/utils/type-guards.js";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { getMessages, createMessage, isParticipant } from "$lib/server/services/chat.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getLoomDO } from "@autumnsgrove/lattice/loom/sveltekit";

export const GET: RequestHandler = async ({ platform, locals, params, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	const conversationId = params.id;

	// Verify participant membership
	const participant = await isParticipant(db, conversationId, homeGrove.tenantId);
	if (!participant) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	const before = url.searchParams.get("before") ?? undefined;
	const rawLimit = url.searchParams.get("limit");
	const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : undefined;
	// Guard against NaN from malformed input
	const limit = parsedLimit !== undefined && Number.isNaN(parsedLimit) ? undefined : parsedLimit;

	try {
		const messages = await getMessages(db, conversationId, { before, limit });
		return json({ messages });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Chat message history failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

/**
 * POST — Send a message via REST (rate-limited).
 *
 * This is the moderated send path. Messages sent here are persisted
 * to D1 and then broadcast to connected WebSocket clients via the
 * ChatDO's /send REST fallback.
 *
 * Thorn moderation will run here once #1457 is resolved.
 */
export const POST: RequestHandler = async ({ request, platform, locals, params }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	const conversationId = params.id;

	// Verify participant membership
	const participant = await isParticipant(db, conversationId, homeGrove.tenantId);
	if (!participant) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	// Rate limit: prevent message spam
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `chat/message:${locals.user.id}:${conversationId}`,
			limit: 60,
			windowSeconds: 60,
		});
		if (denied) return denied;
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const content = body.content;
	if (!content || typeof content !== "string") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	if (content.length > 4000) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	const contentType = (body.contentType as string) ?? "text";
	if (contentType !== "text" && contentType !== "image") {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	try {
		// Persist to D1 via service layer
		const message = await createMessage(
			db,
			conversationId,
			homeGrove.tenantId,
			content,
			contentType as "text" | "image",
			body.metadata as { url: string; width: number; height: number; alt?: string } | undefined,
		);

		// Broadcast to connected WebSocket clients via ChatDO
		// Look up the conversation to build the DO name
		const conv = await db
			.prepare(`SELECT participant_a, participant_b FROM chat_conversations WHERE id = ? LIMIT 1`)
			.bind(conversationId)
			.first<{ participant_a: string; participant_b: string }>();

		if (conv && platform?.env?.CHAT) {
			const [pA, pB] =
				conv.participant_a < conv.participant_b
					? [conv.participant_a, conv.participant_b]
					: [conv.participant_b, conv.participant_a];
			const doName = `chat:${pA}:${pB}`;

			// Fire-and-forget: notify connected WS clients
			const stub = getLoomDO(platform, "CHAT", doName);
			platform.context?.waitUntil(
				stub
					.fetch(new URL("https://internal/send").toString(), {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							conversationId,
							senderId: homeGrove.tenantId,
							content: message.content,
							contentType: message.content_type,
							metadata: message.metadata,
							alreadyPersisted: true,
							messageId: message.id,
							createdAt: message.created_at,
						}),
					})
					.catch(() => {
						// Non-critical: WS broadcast failure doesn't affect message persistence
					}),
			);
		}

		// TODO (#1457): Thorn moderation via waitUntil once DO-safe subpath exists
		// if (platform?.env?.AI && platform.context) {
		//   platform.context.waitUntil(moderatePublishedContent({
		//     content, db, ai: platform.env.AI,
		//     tenantId: homeGrove.tenantId, userId: locals.user.id,
		//     contentType: "dm_message", hookPoint: "on_dm_send",
		//   }));
		// }

		return json({ success: true, message }, { status: 201 });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Chat message send failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
