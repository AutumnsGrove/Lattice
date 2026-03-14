/**
 * Chat Unread Count API — Badge count
 *
 * GET — Total unread message count across all conversations
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "@autumnsgrove/lattice/errors";
import { isRedirect, isHttpError } from "@autumnsgrove/lattice/server/utils/type-guards.js";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users.js";
import { getTotalUnreadCount } from "@autumnsgrove/lattice/server/services/chat.js";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		return json({ unread: 0 });
	}

	try {
		const unread = await getTotalUnreadCount(db, homeGrove.tenantId);
		return json({ unread });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Unread count failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
