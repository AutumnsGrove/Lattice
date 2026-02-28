/**
 * Username Availability Check API (Engine)
 *
 * Checks if a username is available for an existing tenant to change to.
 * Requires authentication — only logged-in users can check.
 *
 * GET /api/username/check?username=newname
 *
 * Rate limited via Threshold (30 req/min).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, buildErrorJson, logGroveError } from "$lib/errors";
import { validateUsernameAvailability } from "$lib/server/services/username.js";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	// Auth required
	if (!locals.user || !locals.tenantId) {
		return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json(buildErrorJson(API_ERRORS.DB_NOT_CONFIGURED), { status: 503 });
	}

	const username = url.searchParams.get("username")?.toLowerCase().trim();
	if (!username) {
		return json({ available: false, error: "Username is required" });
	}

	try {
		const result = await validateUsernameAvailability(
			db,
			username,
			locals.tenantId,
		);

		return json(result, {
			headers: { "Cache-Control": "private, no-cache" },
		});
	} catch (error) {
		logGroveError("API", API_ERRORS.INTERNAL_ERROR, {
			path: "/api/username/check",
			cause: error,
		});
		return json(
			{ available: false, error: "Unable to check availability" },
			{ status: 500 },
		);
	}
};
