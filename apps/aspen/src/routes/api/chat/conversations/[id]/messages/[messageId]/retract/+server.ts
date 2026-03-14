/**
 * Chat Message Retract API — Unsend a message
 *
 * POST — Soft-delete a message (sender only)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "@autumnsgrove/lattice/errors";
import { isRedirect, isHttpError } from "@autumnsgrove/lattice/server/utils/type-guards.js";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users.js";
import { retractMessage, isParticipant } from "@autumnsgrove/lattice/server/services/chat.js";

export const POST: RequestHandler = async ({ platform, locals, params }) => {
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
	const messageId = params.messageId;

	// Verify participant membership
	const participant = await isParticipant(db, conversationId, homeGrove.tenantId);
	if (!participant) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	try {
		// retractMessage() enforces sender-only: WHERE sender_id = ? ensures
		// user A cannot retract user B's messages (IDOR protection)
		const retracted = await retractMessage(db, messageId, homeGrove.tenantId);
		if (!retracted) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}
		return json({ success: true });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Message retract failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
