/**
 * Friends Search API — Find Groves
 *
 * GET — Search for groves by subdomain or display name
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { searchTenants } from "$lib/server/services/friends.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Resolve the user's home grove to exclude self from search results
	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	const excludeTenantId = homeGrove?.tenantId ?? "";

	// Rate limit: 30 searches per minute
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `friends/search:${locals.user.id}`,
			limit: 30,
			windowSeconds: 60,
			failMode: "open",
		});
		if (denied) return denied;
	}

	const query = url.searchParams.get("q")?.trim()?.toLowerCase()?.slice(0, 64) ?? "";
	if (query.length < 1) {
		return json({ results: [] });
	}

	try {
		const results = await searchTenants(db, query, excludeTenantId);
		return json({ results });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Friends search failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
