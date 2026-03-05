/**
 * Lantern Friends API — List & Add
 *
 * GET  — List the current tenant's friends
 * POST — Add a friend by subdomain
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";

/** Max friends per tenant */
const MAX_FRIENDS_PER_TENANT = 50;

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
		const result = await db
			.prepare(
				`SELECT friend_tenant_id, friend_name, friend_subdomain, source
				 FROM lantern_friends
				 WHERE tenant_id = ?
				 ORDER BY added_at DESC`,
			)
			.bind(homeGrove.tenantId)
			.all<{
				friend_tenant_id: string;
				friend_name: string;
				friend_subdomain: string;
				source: string;
			}>();

		const friends = (result.results ?? []).map((row) => ({
			tenantId: row.friend_tenant_id,
			name: row.friend_name,
			subdomain: row.friend_subdomain,
			source: row.source,
		}));

		return json({ friends });
	} catch (error) {
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Lantern friends list failed",
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
	const homeTenantId = homeGrove.tenantId;

	// Rate limit: 30 friend additions per hour
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `lantern/add-friend:${locals.user.id}`,
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
		// Look up the friend's tenant by subdomain
		const friendTenant = await db
			.prepare(`SELECT id, subdomain, name FROM tenants WHERE subdomain = ? AND active = 1`)
			.bind(friendSubdomain)
			.first<{ id: string; subdomain: string; name: string }>();

		if (!friendTenant) {
			throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
		}

		// Prevent self-add
		if (friendTenant.id === homeTenantId) {
			throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
		}

		// Check friend limit
		const countResult = await db
			.prepare(`SELECT COUNT(*) as count FROM lantern_friends WHERE tenant_id = ?`)
			.bind(homeTenantId)
			.first<{ count: number }>();

		if ((countResult?.count ?? 0) >= MAX_FRIENDS_PER_TENANT) {
			throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
		}

		// Insert with INSERT OR IGNORE to handle duplicate gracefully
		await db
			.prepare(
				`INSERT OR IGNORE INTO lantern_friends (tenant_id, friend_tenant_id, friend_name, friend_subdomain, source)
				 VALUES (?, ?, ?, ?, 'manual')`,
			)
			.bind(homeTenantId, friendTenant.id, friendTenant.name, friendTenant.subdomain)
			.run();

		return json(
			{
				success: true,
				friend: {
					tenantId: friendTenant.id,
					name: friendTenant.name,
					subdomain: friendTenant.subdomain,
					source: "manual",
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		// Re-throw GroveErrors (they have a status property)
		if (error && typeof error === "object" && "status" in error) {
			throw error;
		}
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Lantern friend add failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
