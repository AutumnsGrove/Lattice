/**
 * Friends API — List & Add
 *
 * GET  — List the current user's friends
 * POST — Add a friend by subdomain
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";
import { getUserHomeGrove } from "@autumnsgrove/lattice/server/services/users.js";
import { listFriends, addFriend } from "@autumnsgrove/lattice/server/services/friends.js";
import { createThreshold } from "@autumnsgrove/lattice/threshold/factory.js";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/adapters/sveltekit.js";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Resolve the user's own grove — friends are always scoped to your home tenant,
	// not whichever grove you happen to be visiting
	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		// User hasn't created a grove yet — no friends to show
		return json({ friends: [] });
	}

	try {
		const friends = await listFriends(db, homeGrove.tenantId);
		return json({ friends });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Friends list failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// Resolve the user's home grove — friends are always added to your own tenant,
	// even when the request comes from a different grove's subdomain
	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Rate limit: 30 friend additions per hour
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `friends/add:${locals.user.id}`,
			limit: 30,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const friendSubdomain = (body.friendSubdomain as string)?.trim()?.toLowerCase();
	if (
		!friendSubdomain ||
		friendSubdomain.length < 2 ||
		friendSubdomain.length > 63 ||
		!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(friendSubdomain)
	) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	try {
		const result = await addFriend(db, homeGrove.tenantId, friendSubdomain);

		if ("error" in result) {
			if (result.error === "not_found") {
				throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
			}
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		return json({ success: true, friend: result.friend }, { status: 201 });
	} catch (error) {
		// Re-throw GroveErrors (they have a status property)
		if (error && typeof error === "object" && "status" in error) {
			throw error;
		}
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Friend add failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
