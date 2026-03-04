/**
 * Lantern Search API — Find Groves
 *
 * GET — Search for groves by subdomain or display name
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";

export const GET: RequestHandler = async ({ url, platform, locals }) => {
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

	// Rate limit: 30 searches per minute
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `lantern/search:${locals.user.id}`,
			limit: 30,
			windowSeconds: 60,
			failMode: "open",
		});
		if (denied) return denied;
	}

	const query = url.searchParams.get("q")?.trim() ?? "";
	if (query.length < 2) {
		return json({ results: [] });
	}

	try {
		const pattern = `%${query}%`;
		const result = await db
			.prepare(
				`SELECT id, subdomain, name
				 FROM tenants
				 WHERE (subdomain LIKE ? OR name LIKE ?)
				   AND active = 1
				   AND id != ?
				 LIMIT 10`,
			)
			.bind(pattern, pattern, tenantId)
			.all<{ id: string; subdomain: string; name: string }>();

		const results = (result.results ?? []).map((row) => ({
			tenantId: row.id,
			name: row.name,
			subdomain: row.subdomain,
		}));

		return json({ results });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Lantern search failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
