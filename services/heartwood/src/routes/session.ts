/**
 * Session Routes - SessionDO-based session management with D1/JWT fallback
 *
 * New endpoints:
 * - POST /session/validate - Validate session, return user info
 * - POST /session/revoke - Revoke current session (logout)
 * - POST /session/revoke-all - Revoke all sessions (logout everywhere)
 * - GET /session/list - List all active sessions
 * - DELETE /session/:sessionId - Revoke specific session
 * - GET /session/check - Legacy compatibility endpoint
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import {
	getSessionByTokenHash,
	getUserById,
	getClientByClientId,
	getUserClientPreference,
	getUserSubscription,
	getTenantByEmail,
	isEmailAdmin,
	revokeRefreshToken,
	revokeAllUserTokens,
	revokeSession as revokeDbSession,
	revokeAllUserSessions as revokeAllDbSessions,
} from "../db/queries.js";
import { hashSecret, timingSafeEqual } from "../utils/crypto.js";
import { verifyAccessToken } from "../services/jwt.js";
import { createDbSession } from "../db/session.js";
import {
	getSessionFromRequest,
	parseCookieHeader,
	buildClearAuthCookiesHeaders,
	parseSessionCookie,
} from "../lib/session.js";
import {
	validateSession as validateBetterAuthSession,
	invalidateSession as invalidateBetterAuthSession,
	invalidateAllUserSessions as invalidateAllBetterAuthSessions,
} from "../lib/server/session.js";
import { isBannedBetterAuthSession } from "../lib/server/ban-status.js";
import type { SessionDO } from "../durables/SessionDO.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { getClientIP } from "../middleware/security.js";
import {
	RATE_LIMIT_WINDOW,
	RATE_LIMIT_SESSION_VALIDATE,
	RATE_LIMIT_SESSION_REVOKE,
	RATE_LIMIT_SESSION_REVOKE_ALL,
	RATE_LIMIT_SESSION_REVOKE_ALL_WINDOW,
	RATE_LIMIT_SESSION_LIST,
	RATE_LIMIT_SESSION_DELETE,
	RATE_LIMIT_SESSION_CHECK,
	RATE_LIMIT_SESSION_SERVICE,
} from "../utils/constants.js";

const session = new Hono<{ Bindings: Env }>();

type SessionUser = NonNullable<Awaited<ReturnType<typeof getUserById>>>;
type Subscription = Awaited<ReturnType<typeof getUserSubscription>>;
type Tenant = Awaited<ReturnType<typeof getTenantByEmail>>;

/**
 * Build the standard /validate-style user response shape from a DB user row
 * plus subscription/tenant lookups. Single definition for the SessionDO, JWT,
 * legacy-D1, and validate-service branches, which all read from the same
 * `users` table row — the Better Auth branch adapts its own fields to this
 * same shape separately, since it never has a `users` row to read from.
 */
function buildSessionUser(user: SessionUser, subscription: Subscription, tenant: Tenant) {
	const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		avatarUrl: user.avatar_url || "",
		isAdmin,
		tier: subscription?.tier || "seedling",
		tenantId: tenant?.tenantId ?? null,
		subdomain: tenant?.subdomain ?? null,
		preferences: {
			theme: user.theme || null,
			groveMode: user.grove_mode === 1 ? true : user.grove_mode === 0 ? false : null,
			season: user.season || null,
		},
	};
}

/**
 * Rate-limit key: prefer the authenticated user's ID over their IP so that
 * users sharing a NAT/VPN/CGNAT egress (coworkers, campus networks) don't
 * share — and exhaust — the same bucket. Falls back to IP for anonymous
 * requests, where there's no other identity to key on.
 */
function rateLimitKeyFor(req: Request, userId: string | null | undefined): string {
	return userId || getClientIP(req) || "unknown";
}

/**
 * POST /session/validate
 * Validate session and return user info
 * Supports: grove_session cookie (SessionDO) -> access_token cookie (JWT) -> session cookie (D1)
 */
session.post("/validate", async (c) => {
	const db = createDbSession(c.env);

	// Try SessionDO first (new system) — parsed before rate limiting so the
	// limit can be keyed by user ID instead of falling back to IP.
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_validate",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_VALIDATE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	if (parsedSession) {
		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;

		const result = await sessionDO.validateSession(parsedSession.sessionId);

		if (result.valid) {
			const user = await getUserById(db, parsedSession.userId);

			if (user) {
				const [subscription, tenant] = await Promise.all([
					getUserSubscription(db, parsedSession.userId),
					getTenantByEmail(c.env.ENGINE_DB, user.email),
				]);

				return c.json({
					valid: true,
					user: buildSessionUser(user, subscription, tenant),
					session: {
						id: parsedSession.sessionId,
						deviceName: result.session?.deviceName,
						lastActiveAt: result.session?.lastActiveAt,
					},
				});
			}
		}
	}

	// Fallback to JWT access_token cookie
	const cookies = parseCookieHeader(c.req.header("Cookie") || null);
	const accessTokenCookie = cookies["access_token"];

	if (accessTokenCookie) {
		try {
			const payload = await verifyAccessToken(c.env, accessTokenCookie);

			if (payload?.sub) {
				const user = await getUserById(db, payload.sub);

				if (user) {
					const [subscription, tenant] = await Promise.all([
						getUserSubscription(db, payload.sub),
						getTenantByEmail(c.env.ENGINE_DB, user.email),
					]);

					return c.json({
						valid: true,
						user: buildSessionUser(user, subscription, tenant),
						session: null, // No DO session for JWT auth
					});
				}
			}
		} catch (error) {
			console.error("[Session] JWT verification failed during /validate:", error);
			// JWT invalid, fall through
		}
	}

	// Fallback to legacy D1 session cookie
	const sessionCookie = cookies["session"];
	if (sessionCookie) {
		const sessionHash = await hashSecret(sessionCookie);
		const sessionData = await getSessionByTokenHash(db, sessionHash);

		if (sessionData) {
			const user = await getUserById(db, sessionData.user_id);
			if (user) {
				const [subscription, tenant] = await Promise.all([
					getUserSubscription(db, sessionData.user_id),
					getTenantByEmail(c.env.ENGINE_DB, user.email),
				]);

				return c.json({
					valid: true,
					user: buildSessionUser(user, subscription, tenant),
					session: null, // No DO session for legacy auth
				});
			}
		}
	}

	// Fallback to Better Auth session (ba_session table)
	// This handles sessions created via OAuth through Better Auth
	const betterAuthUser = await validateBetterAuthSession(c.req.raw, c.env);
	if (betterAuthUser) {
		const [subscription, tenant] = await Promise.all([
			getUserSubscription(db, betterAuthUser.id),
			getTenantByEmail(c.env.ENGINE_DB, betterAuthUser.email),
		]);

		return c.json({
			valid: true,
			user: {
				id: betterAuthUser.id,
				email: betterAuthUser.email,
				name: betterAuthUser.name || "",
				avatarUrl: betterAuthUser.image || "",
				isAdmin: betterAuthUser.isAdmin,
				tier: subscription?.tier || "seedling",
				tenantId: tenant?.tenantId ?? null,
				subdomain: tenant?.subdomain ?? null,
				preferences: {
					theme: null,
					groveMode: null,
					season: null,
				},
			},
			session: null, // Better Auth manages its own sessions
		});
	}

	// A banned account has no valid session by design — `validateSession` answers
	// null for it, which keeps every caller safe. Login is the one caller that has
	// to say what happened instead of showing the sign-in form again, so the
	// reason is named here and only here (#1719). This adds no route, no new
	// state, and nothing an attacker can use: an invalid session still says
	// nothing about whether an address has an account.
	if (await isBannedBetterAuthSession(c.req.raw, c.env)) {
		return c.json({ valid: false, reason: "banned" });
	}

	return c.json({ valid: false });
});

/**
 * POST /session/revoke
 * Revoke current session (logout)
 *
 * Revokes across every mechanism a browser could be carrying a live cookie
 * for: SessionDO (grove_session), Better Auth (better-auth.session_token),
 * the refresh token (refresh_token, so a stolen access token can't be
 * renewed), and the legacy D1 session (session). Only revokes what's
 * actually present — a browser with just a grove_session cookie won't have
 * the others.
 *
 * Note: JWT access tokens themselves are stateless and can't be revoked
 * server-side without a blocklist (none exists yet). They're short-lived
 * (ACCESS_TOKEN_EXPIRY, currently 1 hour) — revoking the refresh token here
 * prevents getting a new one, bounding exposure to that window.
 */
session.post("/revoke", async (c) => {
	const db = createDbSession(c.env);
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_revoke",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_REVOKE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	let sessionRevoked = false;
	const cookies = parseCookieHeader(c.req.header("Cookie") || null);

	// SessionDO session (grove_session cookie)
	if (parsedSession) {
		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;
		const revoked = await sessionDO.revokeSession(parsedSession.sessionId);
		sessionRevoked = sessionRevoked || revoked;
	}

	// Better Auth session (better-auth.session_token cookie) — handles OAuth
	// logins that don't create SessionDO sessions
	const betterAuthCookie =
		cookies["better-auth.session_token"] || cookies["__Secure-better-auth.session_token"];
	if (betterAuthCookie) {
		// Extract raw token from signed cookie (format: token.signature)
		const rawToken = betterAuthCookie.split(".")[0];
		if (rawToken) {
			const revoked = await invalidateBetterAuthSession(rawToken, c.env);
			sessionRevoked = sessionRevoked || revoked;
		}
	}

	// Refresh token (refresh_token cookie) — revoke so a stolen access token
	// can't be silently renewed after logout
	const refreshTokenCookie = cookies["refresh_token"];
	if (refreshTokenCookie) {
		const tokenHash = await hashSecret(refreshTokenCookie);
		await revokeRefreshToken(db, tokenHash);
		sessionRevoked = true;
	}

	// Legacy D1 session (session cookie)
	const legacySessionCookie = cookies["session"];
	if (legacySessionCookie) {
		const sessionHash = await hashSecret(legacySessionCookie);
		const sessionData = await getSessionByTokenHash(db, sessionHash);
		if (sessionData) {
			await revokeDbSession(db, sessionData.id);
			sessionRevoked = true;
		}
	}

	if (!sessionRevoked) {
		return c.json({ success: false, error: "No session found" }, 401);
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: buildClearAuthCookiesHeaders({ "Content-Type": "application/json" }),
	});
});

/**
 * POST /session/revoke-all
 * Revoke all sessions (logout from all devices)
 *
 * Supports both SessionDO sessions (grove_session) and Better Auth sessions
 * (better-auth.session_token). Will revoke from both systems if available,
 * plus every refresh token and legacy D1 session for the resolved user —
 * "everywhere" means everywhere, not just the two newest auth mechanisms.
 */
session.post("/revoke-all", async (c) => {
	const db = createDbSession(c.env);
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_revoke_all",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_REVOKE_ALL,
		RATE_LIMIT_SESSION_REVOKE_ALL_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	let keepCurrent = false;
	try {
		const body = await c.req.json<{ keepCurrent?: boolean }>();
		keepCurrent = body.keepCurrent ?? false;
	} catch {
		// No body, revoke all
	}

	let userId: string | null = null;
	let sessionDoRevokeCount = 0;
	let betterAuthRevoked = false;

	// SessionDO session (grove_session cookie)
	if (parsedSession) {
		userId = parsedSession.userId;

		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;

		sessionDoRevokeCount = await sessionDO.revokeAllSessions(
			keepCurrent ? parsedSession.sessionId : undefined,
		);
	}

	// Better Auth session — get user ID and revoke all BA sessions
	const betterAuthUser = await validateBetterAuthSession(c.req.raw, c.env);
	// keepCurrent is ignored for BA sessions (BA has no clean way to keep the
	// current session when revoking all) — surfaced in the response below so
	// the client can tell the user honestly rather than implying it worked.
	const betterAuthKeepCurrentIgnored = keepCurrent && !!betterAuthUser;
	if (betterAuthUser) {
		userId = betterAuthUser.id;
		betterAuthRevoked = await invalidateAllBetterAuthSessions(betterAuthUser.id, c.env);
	}

	if (!userId) {
		return c.json({ success: false, error: "No session" }, 401);
	}

	// Revoke every refresh token and legacy D1 session for this user too —
	// "revoke everywhere" should close every door, not just SessionDO/BA.
	await Promise.all([revokeAllUserTokens(db, userId), revokeAllDbSessions(db, userId)]);

	return new Response(
		JSON.stringify({
			success: true,
			revokedCount: sessionDoRevokeCount,
			betterAuthRevoked,
			betterAuthKeepCurrentIgnored,
		}),
		{
			status: 200,
			headers: buildClearAuthCookiesHeaders({ "Content-Type": "application/json" }),
		},
	);
});

/**
 * GET /session/list
 * List all active sessions for current user
 */
session.get("/list", async (c) => {
	const db = createDbSession(c.env);
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_list",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_LIST,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	if (!parsedSession) {
		return c.json({ sessions: [] }, 401);
	}

	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
	) as DurableObjectStub<SessionDO>;

	// A cookie that merely decrypts isn't necessarily still active — validate
	// against the DO before handing back every session's IP/user-agent/device
	// name, and before allowing the caller to treat this as an authenticated
	// listing at all.
	const validation = await sessionDO.validateSession(parsedSession.sessionId);
	if (!validation.valid) {
		return c.json({ sessions: [] }, 401);
	}

	const sessions = await sessionDO.listSessions();

	const sessionsWithCurrent = sessions.map((s) => ({
		...s,
		isCurrent: s.id === parsedSession.sessionId,
	}));

	return c.json({ sessions: sessionsWithCurrent });
});

/**
 * DELETE /session/:sessionId
 * Revoke a specific session by ID (must be own session)
 */
session.delete("/:sessionId", async (c) => {
	const db = createDbSession(c.env);
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_delete",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_DELETE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	if (!parsedSession) {
		return c.json({ success: false, error: "No session" }, 401);
	}

	const sessionIdToRevoke = c.req.param("sessionId");

	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
	) as DurableObjectStub<SessionDO>;

	// The acting cookie must belong to a still-active session before it's
	// allowed to revoke anything — otherwise a revoked/expired cookie could
	// still be used to log the user out of every other device.
	const validation = await sessionDO.validateSession(parsedSession.sessionId);
	if (!validation.valid) {
		return c.json({ success: false, error: "No session" }, 401);
	}

	const revoked = await sessionDO.revokeSession(sessionIdToRevoke);

	if (!revoked) {
		return c.json({ success: false, error: "Session not found" }, 404);
	}

	return c.json({ success: true });
});

/**
 * GET /session/check - Legacy compatibility endpoint
 * Check if user has valid session and get redirect info
 */
session.get("/check", async (c) => {
	const db = createDbSession(c.env);
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	const rateLimit = await checkRouteRateLimit(
		db,
		"session_check",
		rateLimitKeyFor(c.req.raw, parsedSession?.userId),
		RATE_LIMIT_SESSION_CHECK,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	// Try SessionDO first (new system)
	if (parsedSession) {
		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;

		const result = await sessionDO.validateSession(parsedSession.sessionId);

		if (result.valid) {
			const user = await getUserById(db, parsedSession.userId);

			if (user) {
				const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
				const prefs = await getUserClientPreference(db, user.id);

				return c.json({
					authenticated: true,
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						is_admin: isAdmin,
					},
					client: null,
					last_used_client_id: prefs?.last_used_client_id || null,
				});
			}
		}
	}

	const cookies = parseCookieHeader(c.req.header("Cookie") || null);

	// Try access_token (cross-subdomain auth)
	const accessTokenCookie = cookies["access_token"];
	if (accessTokenCookie) {
		try {
			const payload = await verifyAccessToken(c.env, accessTokenCookie);

			if (payload && payload.sub) {
				const user = await getUserById(db, payload.sub);
				if (user) {
					const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
					const clientId = payload.client_id as string | undefined;
					const client = clientId ? await getClientByClientId(db, clientId) : null;
					const prefs = await getUserClientPreference(db, user.id);

					return c.json({
						authenticated: true,
						user: {
							id: user.id,
							email: user.email,
							name: user.name,
							is_admin: isAdmin,
						},
						client: client
							? {
									id: client.client_id,
									name: client.name,
									domain: client.domain,
								}
							: null,
						last_used_client_id: prefs?.last_used_client_id || null,
					});
				}
			}
		} catch (error) {
			console.error("[Session] JWT verification failed during /check:", error);
			// Token invalid, continue to session check
		}
	}

	// Try session token (legacy method)
	const sessionCookie = cookies["session"];

	if (!sessionCookie) {
		return c.json({ authenticated: false });
	}

	const sessionHash = await hashSecret(sessionCookie);
	const sessionData = await getSessionByTokenHash(db, sessionHash);

	if (!sessionData) {
		return c.json({ authenticated: false });
	}

	const user = await getUserById(db, sessionData.user_id);
	if (!user) {
		return c.json({ authenticated: false });
	}

	const client = await getClientByClientId(db, sessionData.client_id);
	const prefs = await getUserClientPreference(db, sessionData.user_id);
	const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);

	return c.json({
		authenticated: true,
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			is_admin: isAdmin,
		},
		client: client
			? {
					id: client.client_id,
					name: client.name,
					domain: client.domain,
				}
			: null,
		last_used_client_id: prefs?.last_used_client_id || null,
	});
});

/**
 * POST /session/validate-service
 * Validate a session token for internal Grove services (like Mycelium)
 * Unlike /validate which uses cookies, this accepts the token in the request body
 */
session.post("/validate-service", async (c) => {
	const db = createDbSession(c.env);

	// SECURITY: Verify service-to-service authentication.
	// Fails closed: a missing/empty SERVICE_SECRET rejects every request
	// rather than skipping the check. In production this endpoint should
	// only be reachable via Cloudflare Service Bindings (which bypass the
	// public internet); this check is defense-in-depth for the case where
	// it's also reachable on public HTTP routes — a misconfigured secret
	// must not silently turn that defense-in-depth into "none at all".
	const serviceAuthHeader = c.req.header("Authorization") || "";
	const expectedSecret = c.env.SERVICE_SECRET || "";
	if (!expectedSecret) {
		return c.json({ valid: false, error: "Service authentication not configured" }, 401);
	}
	if (!timingSafeEqual(serviceAuthHeader, `Bearer ${expectedSecret}`)) {
		return c.json({ valid: false, error: "Unauthorized" }, 401);
	}

	// Rate limit by IP (higher limit for internal services) — no session to
	// key on yet at this point in the handler.
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_service",
		getClientIP(c.req.raw) || "unknown",
		RATE_LIMIT_SESSION_SERVICE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				valid: false,
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	const body = await c.req.json().catch(() => null);
	if (
		!body ||
		typeof body !== "object" ||
		typeof (body as { session_token?: unknown }).session_token !== "string"
	) {
		return c.json({ valid: false, error: "Missing or invalid session_token" }, 400);
	}
	const sessionToken = (body as { session_token: string }).session_token;

	if (!sessionToken) {
		return c.json({ valid: false, error: "Missing session_token" }, 400);
	}

	// Parse and verify the session token signature
	const parsedSession = await parseSessionCookie(sessionToken, c.env.SESSION_SECRET);

	if (!parsedSession) {
		return c.json({ valid: false, error: "Invalid session token signature" }, 401);
	}

	// Validate the session in SessionDO
	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
	) as DurableObjectStub<SessionDO>;

	const result = await sessionDO.validateSession(parsedSession.sessionId);

	if (!result.valid) {
		return c.json({ valid: false, error: "Session expired or revoked" }, 401);
	}

	// Get user info
	const user = await getUserById(db, parsedSession.userId);

	if (!user) {
		return c.json({ valid: false, error: "User not found" }, 401);
	}

	const [subscription, tenant] = await Promise.all([
		getUserSubscription(db, parsedSession.userId),
		getTenantByEmail(c.env.ENGINE_DB, user.email),
	]);

	return c.json({
		valid: true,
		user: buildSessionUser(user, subscription, tenant),
		session: {
			id: parsedSession.sessionId,
			deviceName: result.session?.deviceName,
			lastActiveAt: result.session?.lastActiveAt,
		},
	});
});

export default session;
