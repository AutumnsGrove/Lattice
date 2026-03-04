/**
 * Lantern Friends API — Single Friend
 *
 * DELETE — Remove a friend connection
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session.js";

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	const db = platform?.env?.DB;
	const tenantId = locals.tenantId;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Verify the authenticated user owns this tenant
	const verifiedTenantId = await getVerifiedTenantId(db, tenantId, locals.user);

	const friendTenantId = params.tenantId;
	if (!friendTenantId) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	try {
		const existing = await db
			.prepare(`SELECT id FROM lantern_friends WHERE tenant_id = ? AND friend_tenant_id = ?`)
			.bind(verifiedTenantId, friendTenantId)
			.first<{ id: string }>();

		if (!existing) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		await db
			.prepare(`DELETE FROM lantern_friends WHERE tenant_id = ? AND friend_tenant_id = ?`)
			.bind(verifiedTenantId, friendTenantId)
			.run();

		return json({ success: true });
	} catch (error) {
		if (error && typeof error === "object" && "status" in error) {
			throw error;
		}
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Lantern friend delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
