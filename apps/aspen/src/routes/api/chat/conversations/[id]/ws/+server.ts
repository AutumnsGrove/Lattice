/**
 * Chat WebSocket API — Upgrade to WebSocket for real-time messaging
 *
 * GET — WebSocket upgrade → forward to ChatDO
 *
 * The DO is identified by sorted tenant pair:
 *   chat:{min(tenantA, tenantB)}:{max(tenantA, tenantB)}
 *
 * The viewer's tenant ID is passed as a query param so the DO
 * can tag the connection for sender identification.
 */

import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "@autumnsgrove/lattice/errors";
import { isRedirect, isHttpError } from "@autumnsgrove/lattice/server/utils/type-guards.js";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users.js";
import { getLoomDO } from "@autumnsgrove/lattice/loom/sveltekit";

export const GET: RequestHandler = async ({ platform, locals, params, request }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!platform?.env?.CHAT) {
		throwGroveError(500, API_ERRORS.DURABLE_OBJECTS_NOT_CONFIGURED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	const conversationId = params.id;

	// Look up conversation to find both participants
	const conversation = await db
		.prepare(`SELECT participant_a, participant_b FROM chat_conversations WHERE id = ? LIMIT 1`)
		.bind(conversationId)
		.first<{ participant_a: string; participant_b: string }>();

	if (!conversation) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
	}

	// Verify the user is a participant
	const tenantId = homeGrove.tenantId;
	if (conversation.participant_a !== tenantId && conversation.participant_b !== tenantId) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	// Build DO name from sorted pair.
	// The DO name is deterministic: chat:{smaller_tenant_id}:{larger_tenant_id}.
	// Both participants always resolve to the same DO instance, which is what
	// makes WebSocket broadcast work -- both connections land in the same object.
	const [pA, pB] =
		conversation.participant_a < conversation.participant_b
			? [conversation.participant_a, conversation.participant_b]
			: [conversation.participant_b, conversation.participant_a];
	const doName = `chat:${pA}:${pB}`;

	try {
		// Forward the WebSocket upgrade to the ChatDO
		// Append tenantId as query param so the DO can tag the connection
		const doUrl = new URL(request.url);
		doUrl.pathname = "/ws";
		doUrl.searchParams.set("tenantId", tenantId);

		const stub = getLoomDO(platform, "CHAT", doName);
		return stub.fetch(doUrl.toString(), {
			headers: request.headers,
		});
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Chat WebSocket upgrade failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
