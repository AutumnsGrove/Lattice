/**
 * Chat Conversations API — List & Create
 *
 * GET  — List the current user's conversations with unread counts
 * POST — Start a conversation with a mutual friend
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, logGroveError, throwGroveError } from "$lib/errors";
import { isRedirect, isHttpError } from "$lib/server/utils/type-guards.js";
import { getUserHomeGrove } from "$lib/server/services/users.js";
import { listConversations, getOrCreateConversation } from "$lib/server/services/chat.js";
import { areMutualFriends } from "$lib/server/services/friends.js";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { isInGreenhouse, isFeatureEnabled } from "$lib/feature-flags/index.js";

/**
 * Check if the chirp_enabled graft is enabled for this tenant.
 * Returns false (feature disabled) if any check fails.
 */
async function isChirpEnabled(
	db: D1Database,
	kv: KVNamespace | undefined,
	tenantId: string,
): Promise<boolean> {
	if (!kv) return false;
	const flagsEnv = { DB: db, FLAGS_KV: kv };
	const inGreenhouse = await isInGreenhouse(tenantId, flagsEnv).catch(() => false);
	if (!inGreenhouse) return false;
	return isFeatureEnabled("chirp_enabled", { tenantId, inGreenhouse: true }, flagsEnv).catch(
		() => false,
	);
}

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		return json({ conversations: [] });
	}

	// Gate: chirp_enabled graft
	if (!(await isChirpEnabled(db, platform?.env?.CACHE_KV, homeGrove.tenantId))) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
	const rawOffset = parseInt(url.searchParams.get("offset") ?? "0", 10);
	const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);
	const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

	try {
		const conversations = await listConversations(db, homeGrove.tenantId, limit, offset);
		return json({ conversations });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Chat conversation list failed",
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

	const homeGrove = await getUserHomeGrove(db, locals.user.email);
	if (!homeGrove) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Gate: chirp_enabled graft
	if (!(await isChirpEnabled(db, platform?.env?.CACHE_KV, homeGrove.tenantId))) {
		throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const friendTenantId = body.friendTenantId;
	if (!friendTenantId || typeof friendTenantId !== "string") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	// Length-limit the tenant ID to prevent abuse (tenant IDs are UUIDs, max 36 chars)
	if (friendTenantId.length > 64) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	if (friendTenantId === homeGrove.tenantId) {
		throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
	}

	// Rate limit: prevent conversation creation spam
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `chat/conversation:${locals.user.id}`,
			limit: 20,
			windowSeconds: 3600,
		});
		if (denied) return denied;
	}

	// Mutual friendship gate
	try {
		const mutual = await areMutualFriends(db, homeGrove.tenantId, friendTenantId);
		if (!mutual) {
			throwGroveError(403, API_ERRORS.FORBIDDEN, "API");
		}
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Mutual friend check failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}

	try {
		const { conversation, created } = await getOrCreateConversation(
			db,
			homeGrove.tenantId,
			friendTenantId,
		);

		return json({ success: true, conversation, created }, { status: created ? 201 : 200 });
	} catch (error) {
		if (isRedirect(error)) throw error;
		if (isHttpError(error)) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Conversation create failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
