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
	isEmailAdmin,
} from "../db/queries.js";
import { hashSecret, timingSafeEqual } from "../utils/crypto.js";
import { verifyAccessToken } from "../services/jwt.js";
import { createDbSession } from "../db/session.js";
import {
	getSessionFromRequest,
	clearSessionCookieHeader,
	parseSessionCookie,
} from "../lib/session.js";
import {
	validateSession as validateBetterAuthSession,
	invalidateSession as invalidateBetterAuthSession,
	invalidateAllUserSessions as invalidateAllBetterAuthSessions,
} from "../lib/server/session.js";
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

/**
 * POST /session/validate
 * Validate session and return user info
 * Supports: grove_session cookie (SessionDO) -> access_token cookie (JWT) -> session cookie (D1)
 */
session.post("/validate", async (c) => {
	const db = createDbSession(c.env);

	// Rate limit by IP
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_validate",
		getClientIP(c.req.raw),
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

	// Try SessionDO first (new system)
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	if (parsedSession) {
		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;

		const result = await sessionDO.validateSession(parsedSession.sessionId);

		if (result.valid) {
			const user = await getUserById(db, parsedSession.userId);

			if (user) {
				const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
				const subscription = await getUserSubscription(db, parsedSession.userId);

				return c.json({
					valid: true,
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						avatarUrl: user.avatar_url,
						isAdmin,
						tier: subscription?.tier || "seedling",
					},
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
	const cookieHeader = c.req.header("Cookie") || "";
	const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);

	if (accessTokenMatch) {
		try {
			const payload = await verifyAccessToken(c.env, accessTokenMatch[1]);

			if (payload?.sub) {
				const user = await getUserById(db, payload.sub);

				if (user) {
					const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
					const subscription = await getUserSubscription(db, payload.sub);

					return c.json({
						valid: true,
						user: {
							id: user.id,
							email: user.email,
							name: user.name,
							avatarUrl: user.avatar_url,
							isAdmin,
							tier: subscription?.tier || "seedling",
						},
						session: null, // No DO session for JWT auth
					});
				}
			}
		} catch {
			// JWT invalid, fall through
		}
	}

	// Fallback to legacy D1 session cookie
	const sessionMatch = cookieHeader.match(/session=([^;]+)/);
	if (sessionMatch) {
		const sessionToken = sessionMatch[1];
		const sessionHash = await hashSecret(sessionToken);
		const sessionData = await getSessionByTokenHash(db, sessionHash);

		if (sessionData) {
			const user = await getUserById(db, sessionData.user_id);
			if (user) {
				const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
				const subscription = await getUserSubscription(db, sessionData.user_id);

				return c.json({
					valid: true,
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						avatarUrl: user.avatar_url,
						isAdmin,
						tier: subscription?.tier || "seedling",
					},
					session: null, // No DO session for legacy auth
				});
			}
		}
	}

	// Fallback to Better Auth session (ba_session table)
	// This handles sessions created via OAuth through Better Auth
	const betterAuthUser = await validateBetterAuthSession(c.req.raw, c.env);
	if (betterAuthUser) {
		const subscription = await getUserSubscription(db, betterAuthUser.id);

		return c.json({
			valid: true,
			user: {
				id: betterAuthUser.id,
				email: betterAuthUser.email,
				name: betterAuthUser.name || "",
				avatarUrl: betterAuthUser.image || "",
				isAdmin: betterAuthUser.isAdmin,
				tier: subscription?.tier || "seedling",
			},
			session: null, // Better Auth manages its own sessions
		});
	}

	return c.json({ valid: false });
});

/**
 * POST /session/revoke
 * Revoke current session (logout)
 *
 * Supports both SessionDO sessions (grove_session) and Better Auth sessions
 * (better-auth.session_token). Will attempt to revoke whichever is present.
 */
session.post("/revoke", async (c) => {
	const db = createDbSession(c.env);

	// Rate limit by IP
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_revoke",
		getClientIP(c.req.raw),
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

	// Try SessionDO session first (grove_session cookie)
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);
	if (parsedSession) {
		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;
		await sessionDO.revokeSession(parsedSession.sessionId);
		sessionRevoked = true;
	}

	// Also try Better Auth session (better-auth.session_token cookie)
	// This handles OAuth logins that don't create SessionDO sessions
	const cookieHeader = c.req.header("Cookie") || "";
	const betterAuthCookieMatch = cookieHeader.match(
		/(?:__Secure-)?better-auth\.session_token=([^;]+)/,
	);
	if (betterAuthCookieMatch) {
		// Extract raw token from signed cookie (format: token.signature)
		const signedToken = betterAuthCookieMatch[1];
		const rawToken = signedToken.split(".")[0];
		if (rawToken) {
			await invalidateBetterAuthSession(rawToken, c.env);
			sessionRevoked = true;
		}
	}

	if (!sessionRevoked) {
		return c.json({ success: false, error: "No session found" }, 401);
	}

	// Clear all session-related cookies
	const clearCookies = [
		clearSessionCookieHeader(),
		"access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0",
		"refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0",
		// Clear Better Auth cookies (both prefixed and unprefixed)
		"better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=0",
		"__Secure-better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=0",
	];

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": clearCookies.join(", "),
		},
	});
});

/**
 * POST /session/revoke-all
 * Revoke all sessions (logout from all devices)
 *
 * Supports both SessionDO sessions (grove_session) and Better Auth sessions
 * (better-auth.session_token). Will revoke from both systems if available.
 */
session.post("/revoke-all", async (c) => {
	const db = createDbSession(c.env);

	// Rate limit by IP (stricter limit: 3 per hour)
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_revoke_all",
		getClientIP(c.req.raw),
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

	// Try SessionDO session first (grove_session cookie)
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);
	if (parsedSession) {
		userId = parsedSession.userId;

		const sessionDO = c.env.SESSIONS.get(
			c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
		) as DurableObjectStub<SessionDO>;

		sessionDoRevokeCount = await sessionDO.revokeAllSessions(
			keepCurrent ? parsedSession.sessionId : undefined,
		);
	}

	// Also try Better Auth session to get user ID and revoke BA sessions
	const betterAuthUser = await validateBetterAuthSession(c.req.raw, c.env);
	if (betterAuthUser) {
		userId = betterAuthUser.id;

		// Revoke all Better Auth sessions for this user
		// Note: keepCurrent is ignored for BA sessions - we revoke all
		// (BA doesn't have a clean way to keep current session when revoking all)
		betterAuthRevoked = await invalidateAllBetterAuthSessions(betterAuthUser.id, c.env);
	}

	if (!userId) {
		return c.json({ success: false, error: "No session" }, 401);
	}

	// Clear all session-related cookies
	const clearCookies = [
		clearSessionCookieHeader(),
		"access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0",
		"refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0",
		// Clear Better Auth cookies (both prefixed and unprefixed)
		"better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=0",
		"__Secure-better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=0",
	];

	return new Response(
		JSON.stringify({
			success: true,
			revokedCount: sessionDoRevokeCount,
			betterAuthRevoked,
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Set-Cookie": clearCookies.join(", "),
			},
		},
	);
});

/**
 * GET /session/list
 * List all active sessions for current user
 */
session.get("/list", async (c) => {
	const db = createDbSession(c.env);

	// Rate limit by IP
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_list",
		getClientIP(c.req.raw),
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

	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	if (!parsedSession) {
		return c.json({ sessions: [] }, 401);
	}

	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
	) as DurableObjectStub<SessionDO>;

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

	// Rate limit by IP
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_delete",
		getClientIP(c.req.raw),
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

	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

	if (!parsedSession) {
		return c.json({ success: false, error: "No session" }, 401);
	}

	const sessionIdToRevoke = c.req.param("sessionId");

	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
	) as DurableObjectStub<SessionDO>;

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

	// Rate limit by IP
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_check",
		getClientIP(c.req.raw),
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
	const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

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

	const cookieHeader = c.req.header("Cookie") || "";

	// Try access_token (cross-subdomain auth)
	const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
	if (accessTokenMatch) {
		try {
			const accessToken = accessTokenMatch[1];
			const payload = await verifyAccessToken(c.env, accessToken);

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
		} catch {
			// Token invalid, continue to session check
		}
	}

	// Try session token (legacy method)
	const sessionMatch = cookieHeader.match(/session=([^;]+)/);

	if (!sessionMatch) {
		return c.json({ authenticated: false });
	}

	const sessionToken = sessionMatch[1];
	const sessionHash = await hashSecret(sessionToken);
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

	// SECURITY: Verify service-to-service authentication
	// In production, this endpoint should only be called via Cloudflare Service Bindings
	// (which bypass the public internet). The SERVICE_SECRET check provides defense-in-depth
	// for cases where the endpoint is accessible on the public HTTP routes.
	// Always extract the header to avoid timing differences that could reveal
	// whether SERVICE_SECRET is configured.
	const serviceAuthHeader = c.req.header("Authorization");
	if (c.env.SERVICE_SECRET) {
		if (
			!serviceAuthHeader ||
			!timingSafeEqual(serviceAuthHeader, `Bearer ${c.env.SERVICE_SECRET}`)
		) {
			return c.json({ valid: false, error: "Unauthorized" }, 401);
		}
	}

	// Rate limit by IP (higher limit for internal services)
	const rateLimit = await checkRouteRateLimit(
		db,
		"session_service",
		getClientIP(c.req.raw),
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

	let sessionToken: string;
	try {
		const body = await c.req.json<{ session_token: string }>();
		sessionToken = body.session_token;
	} catch {
		return c.json({ valid: false, error: "Invalid request body" }, 400);
	}

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

	const isAdmin = user.is_admin === 1 || isEmailAdmin(user.email);
	const subscription = await getUserSubscription(db, parsedSession.userId);

	return c.json({
		valid: true,
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			avatarUrl: user.avatar_url,
			isAdmin,
			tier: subscription?.tier || "seedling",
		},
		session: {
			id: parsedSession.sessionId,
			deviceName: result.session?.deviceName,
			lastActiveAt: result.session?.lastActiveAt,
		},
	});
});

export default session;
