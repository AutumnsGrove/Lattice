/**
 * Chat Read Cursor API — Mark messages as read
 *
 * POST — Update read cursor for the authenticated user
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";
import { isRedirect, isHttpError } from "$lib/server/utils/type-guards.js";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { updateReadCursor, isParticipant } from "$lib/server/services/chat.js";

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

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const messageId = body.messageId;
	if (!messageId || typeof messageId !== "string") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// If client sends "latest", resolve to the actual most recent message ID.
	// Storing a literal "latest" string as a cursor would break unread counts:
	// the unread subquery compares created_at of the cursor message, and a
	// non-existent message ID returns NULL, which makes every message appear
	// unread. Resolving server-side keeps the client API simple while
	// maintaining data integrity.
	let resolvedMessageId = messageId;
	if (messageId === "latest") {
		const latest = await db
			.prepare(
				`SELECT id FROM chat_messages
				 WHERE conversation_id = ?
				 ORDER BY created_at DESC LIMIT 1`,
			)
			.bind(conversationId)
			.first<{ id: string }>();

		if (!latest) {
			// No messages in conversation yet — nothing to mark as read
			return json({ success: true });
		}
		resolvedMessageId = latest.id;
	}

	// Length-limit to prevent abuse (message IDs are UUIDs, max 36 chars)
	if (resolvedMessageId.length > 64) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	try {
		await updateReadCursor(db, conversationId, homeGrove.tenantId, resolvedMessageId);
		return json({ success: true });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Read cursor update failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
