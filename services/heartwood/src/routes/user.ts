/**
 * User Routes - Profile management (avatar, preferences)
 *
 * Endpoints:
 * - POST /user/avatar - Update user's avatar URL
 * - DELETE /user/avatar - Remove user's avatar URL
 * - PUT /user/preferences - Update theme/grove mode/season
 */

import { Hono, type Context } from "hono";
import type { Env, D1DatabaseOrSession } from "../types.js";
import {
	updateUserAvatar,
	updateBetterAuthUserAvatar,
	updateUserPreferences,
	createAuditLog,
	isUserBanned,
} from "../db/queries.js";
import { getSessionFromRequest } from "../lib/session.js";
import { createDbSession } from "../db/session.js";
import type { SessionDO } from "../durables/SessionDO.js";
import { validateSession as validateBetterAuthSession } from "../lib/server/session.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { isRequestFromTrustedOrigin } from "../middleware/csrf.js";
import { RATE_LIMIT_WINDOW, RATE_LIMIT_USER_PROFILE } from "../utils/constants.js";

const user = new Hono<{ Bindings: Env }>();

const MAX_AVATAR_URL_LENGTH = 512;
// Path segment after the origin: letters, digits, and a small punctuation
// set used by CDN keys (see cdn.ts's filename sanitizer) — no query
// strings, fragments, or control/whitespace characters.
const AVATAR_PATH_PATTERN = /^\/[A-Za-z0-9._/-]+$/;

type AuthSource = "sessiondo" | "betterauth";

interface ResolvedUser {
	userId: string;
	authSource: AuthSource;
}

/**
 * Resolve the authenticated user ID from the request, tagged with which
 * auth system it came from. The two systems back profile fields with
 * different tables (legacy `users` vs `ba_user`), so callers need to know
 * which one to write to — writing avatar/preference changes to the wrong
 * table for a given user previously affected 0 rows and returned a false
 * "success" (see updateUserAvatar's doc comment).
 */
async function resolveUserId(req: Request, env: Env): Promise<ResolvedUser | null> {
	// Try SessionDO
	const parsedSession = await getSessionFromRequest(req, env.SESSION_SECRET);
	if (parsedSession) {
		const sessionDO = env.SESSIONS.get(
			env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;
		const result = await sessionDO.validateSession(parsedSession.sessionId);
		if (result.valid) return { userId: parsedSession.userId, authSource: "sessiondo" };
	}

	// Try Better Auth
	const betterAuthUser = await validateBetterAuthSession(req, env);
	if (betterAuthUser) return { userId: betterAuthUser.id, authSource: "betterauth" };

	return null;
}

/**
 * Shared guard for all three mutation routes below: resolves identity,
 * enforces the ban check, validates Origin/Referer (grove_session is
 * Domain=.grove.place, so SameSite=Lax alone doesn't stop a same-site,
 * cross-origin request from a tenant blog — see middleware/csrf.ts), and
 * applies a per-user rate limit. Returns null (having already written the
 * appropriate error response) if any check fails.
 */
async function authorizeMutation(
	c: Context<{ Bindings: Env }>,
	db: D1DatabaseOrSession,
): Promise<ResolvedUser | null> {
	const resolved = await resolveUserId(c.req.raw, c.env);
	if (!resolved) {
		c.res = c.json({ error: "Unauthorized" }, 401);
		return null;
	}

	if (await isUserBanned(db, resolved.userId)) {
		c.res = c.json({ error: "Unauthorized" }, 401);
		return null;
	}

	if (!isRequestFromTrustedOrigin(c.req.raw, new URL(c.env.AUTH_BASE_URL).origin)) {
		c.res = c.json({ error: "Invalid origin" }, 403);
		return null;
	}

	const rateLimit = await checkRouteRateLimit(
		db,
		"user_profile",
		resolved.userId,
		RATE_LIMIT_USER_PROFILE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		c.res = c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
		return null;
	}

	return resolved;
}

/**
 * Write an avatar URL (or null to clear) to whichever table actually holds
 * a row for this user, and report whether anything was actually changed —
 * see updateUserAvatar's doc comment for why a write can silently affect 0
 * rows if this dispatch didn't exist.
 */
async function writeAvatar(
	db: D1DatabaseOrSession,
	resolved: ResolvedUser,
	avatarUrl: string | null,
): Promise<number> {
	return resolved.authSource === "betterauth"
		? updateBetterAuthUserAvatar(db, resolved.userId, avatarUrl)
		: updateUserAvatar(db, resolved.userId, avatarUrl);
}

/**
 * POST /user/avatar
 * Update the authenticated user's avatar URL.
 * Called by Aspen after uploading to R2.
 */
user.post("/avatar", async (c) => {
	const db = createDbSession(c.env);
	const resolved = await authorizeMutation(c, db);
	if (!resolved) return c.res;

	let avatarUrl: string;
	try {
		const body = await c.req.json<{ avatarUrl: string }>();
		avatarUrl = body.avatarUrl;
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (!avatarUrl || typeof avatarUrl !== "string") {
		return c.json({ error: "avatarUrl is required" }, 400);
	}

	if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
		return c.json({ error: "avatarUrl is too long" }, 400);
	}

	// Only allow cdn.grove.place URLs (prevent arbitrary URL injection), and
	// require the path to look like an actual CDN key rather than an
	// arbitrary query/fragment/control-character payload embedded in a
	// string that merely starts with the right prefix.
	let parsed: URL;
	try {
		parsed = new URL(avatarUrl);
	} catch {
		return c.json({ error: "Invalid avatar URL" }, 400);
	}
	if (
		parsed.origin !== "https://cdn.grove.place" ||
		parsed.search !== "" ||
		parsed.hash !== "" ||
		!AVATAR_PATH_PATTERN.test(parsed.pathname)
	) {
		return c.json({ error: "Invalid avatar URL" }, 400);
	}

	const changed = await writeAvatar(db, resolved, avatarUrl);
	if (!changed) {
		return c.json({ error: "user_not_found" }, 404);
	}

	await createAuditLog(db, {
		event_type: "user_avatar_updated",
		user_id: resolved.userId,
		ip_address: getClientIP(c.req.raw) || undefined,
		user_agent: getUserAgent(c.req.raw) || undefined,
	});

	return c.json({ success: true });
});

/**
 * DELETE /user/avatar
 * Remove the authenticated user's avatar URL.
 * Called by Aspen after deleting from R2.
 */
user.delete("/avatar", async (c) => {
	const db = createDbSession(c.env);
	const resolved = await authorizeMutation(c, db);
	if (!resolved) return c.res;

	const changed = await writeAvatar(db, resolved, null);
	if (!changed) {
		return c.json({ error: "user_not_found" }, 404);
	}

	await createAuditLog(db, {
		event_type: "user_avatar_removed",
		user_id: resolved.userId,
		ip_address: getClientIP(c.req.raw) || undefined,
		user_agent: getUserAgent(c.req.raw) || undefined,
	});

	return c.json({ success: true });
});

/**
 * PUT /user/preferences
 * Update the authenticated user's preferences (theme, grove mode, season).
 *
 * Only supported for accounts backed by the legacy `users` table today —
 * `ba_user` (Better Auth) has no theme/grove_mode/season columns, so a
 * Better-Auth-only account has nowhere to persist these. Returning an
 * honest 501 here is a deliberate, narrower fix than the false
 * `{success: true}` this previously returned for such accounts (see
 * updateUserPreferences's doc comment) — fully supporting preferences for
 * Better-Auth-only accounts needs a schema change (new columns on
 * `ba_user`, or a separate preferences table keyed by user id), which is
 * out of scope for this pass.
 */
user.put("/preferences", async (c) => {
	const db = createDbSession(c.env);
	const resolved = await authorizeMutation(c, db);
	if (!resolved) return c.res;

	if (resolved.authSource === "betterauth") {
		return c.json(
			{
				error: "not_supported",
				error_description: "Preferences aren't available yet for this account.",
			},
			501,
		);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return c.json({ error: "Invalid request body" }, 400);
	}
	const bodyObj = body as Record<string, unknown>;

	// Validate values
	const validThemes = ["light", "dark", "system"];
	const validSeasons = ["spring", "summer", "autumn", "winter", "midnight"];

	const preferences: {
		theme?: string | null;
		grove_mode?: boolean | null;
		season?: string | null;
	} = {};

	if (Object.hasOwn(bodyObj, "theme")) {
		if (bodyObj.theme !== null && !validThemes.includes(bodyObj.theme as string)) {
			return c.json({ error: "Invalid theme value" }, 400);
		}
		preferences.theme = bodyObj.theme as string | null;
	}

	if (Object.hasOwn(bodyObj, "groveMode")) {
		if (bodyObj.groveMode !== null && typeof bodyObj.groveMode !== "boolean") {
			return c.json({ error: "Invalid groveMode value" }, 400);
		}
		preferences.grove_mode = bodyObj.groveMode as boolean | null;
	}

	if (Object.hasOwn(bodyObj, "season")) {
		if (bodyObj.season !== null && !validSeasons.includes(bodyObj.season as string)) {
			return c.json({ error: "Invalid season value" }, 400);
		}
		preferences.season = bodyObj.season as string | null;
	}

	if (Object.keys(preferences).length === 0) {
		return c.json({ error: "No valid preferences provided" }, 400);
	}

	const changed = await updateUserPreferences(db, resolved.userId, preferences);
	if (!changed) {
		return c.json({ error: "user_not_found" }, 404);
	}

	await createAuditLog(db, {
		event_type: "user_preferences_updated",
		user_id: resolved.userId,
		ip_address: getClientIP(c.req.raw) || undefined,
		user_agent: getUserAgent(c.req.raw) || undefined,
	});

	return c.json({ success: true });
});

export default user;
