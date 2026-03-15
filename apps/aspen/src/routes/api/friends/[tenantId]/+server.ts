/**
 * Friends API — Single Friend
 *
 * DELETE — Remove a friend connection
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users";
import { removeFriend } from "@autumnsgrove/lattice/server/services/friends";

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Resolve the user's home grove — friends are always scoped to your own tenant
	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const friendTenantId = params.tenantId;
	if (!friendTenantId) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	try {
		const removed = await removeFriend(db, homeGrove.tenantId, friendTenantId);
		if (!removed) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		return json({ success: true });
	} catch (error) {
		if (error && typeof error === "object" && "status" in error) {
			throw error;
		}
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Friend delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
