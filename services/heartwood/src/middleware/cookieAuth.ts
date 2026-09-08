/**
 * Cookie Auth Middleware - Dual auth support for admin routes
 *
 * Enables both Bearer token auth (existing) and cookie-based auth
 * (for arbor service binding calls). When landing calls Heartwood via
 * platform.env.AUTH.fetch(), it forwards the user's cookies — this
 * middleware validates them via SessionDO, just like /session/validate does.
 */

import type { Context, Next } from "hono";
import type { Env } from "../types.js";
import { verifyAccessToken } from "../services/jwt.js";
import { isUserAdmin, isUserBanned } from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { extractBearerToken } from "./bearerAuth.js";
import { getSessionFromRequest, parseCookieHeader } from "../lib/session.js";
import type { SessionDO } from "../durables/SessionDO.js";

const UNAUTHORIZED = {
	error: "unauthorized",
	error_description: "Missing or invalid credentials",
} as const;

/**
 * Admin auth middleware that supports:
 * 1. Authorization: Bearer <token> (existing JWT path)
 * 2. Cookie-based auth via grove_session (SessionDO) or access_token (JWT cookie)
 *
 * Both paths verify admin access before proceeding.
 */
export function adminCookieAuth() {
	return async (c: Context<{ Bindings: Env; Variables: Record<string, unknown> }>, next: Next) => {
		// Path 1: Bearer token (existing behavior)
		const token = extractBearerToken(c.req.header("Authorization"));
		if (token) {
			const payload = await verifyAccessToken(c.env, token);

			if (!payload) {
				return c.json(
					{
						error: "invalid_token",
						error_description: "Token is invalid or expired",
					},
					401,
				);
			}

			const db = createDbSession(c.env);
			if (await isUserBanned(db, payload.sub)) {
				return c.json(UNAUTHORIZED, 401);
			}

			const isAdmin = await isUserAdmin(db, payload.sub);
			if (!isAdmin) {
				return c.json({ error: "forbidden", error_description: "Admin access required" }, 403);
			}

			// Store token for downstream proxying
			c.set("accessToken", token);
			return next();
		}

		// Path 2: Cookie-based auth (grove_session → SessionDO)
		const parsedSession = await getSessionFromRequest(c.req.raw, c.env.SESSION_SECRET);

		if (parsedSession) {
			const sessionDO = c.env.SESSIONS.get(
				c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
			) as DurableObjectStub<SessionDO>;

			const result = await sessionDO.validateSession(parsedSession.sessionId);

			if (result.valid) {
				const db = createDbSession(c.env);
				if (await isUserBanned(db, parsedSession.userId)) {
					return c.json(UNAUTHORIZED, 401);
				}

				// Single definition of "who is an admin" (isUserAdmin) — this
				// path previously re-implemented the check inline, which is
				// exactly the kind of duplication that can silently drift from
				// the other two auth paths below.
				const isAdmin = await isUserAdmin(db, parsedSession.userId);

				if (isAdmin) {
					return next();
				}

				return c.json({ error: "forbidden", error_description: "Admin access required" }, 403);
			}
		}

		// Path 3: Fallback to access_token cookie (JWT). Exact key lookup via
		// parseCookieHeader, not a substring regex — an unanchored regex would
		// match inside any cookie name that merely ends in "access_token=",
		// which any *.grove.place subdomain can set (see parseCookieHeader's
		// doc comment in lib/session.ts).
		const cookies = parseCookieHeader(c.req.header("Cookie") ?? null);
		const accessTokenCookie = cookies["access_token"];

		if (accessTokenCookie) {
			const payload = await verifyAccessToken(c.env, accessTokenCookie);

			if (payload?.sub) {
				const db = createDbSession(c.env);
				if (await isUserBanned(db, payload.sub)) {
					return c.json(UNAUTHORIZED, 401);
				}

				const isAdmin = await isUserAdmin(db, payload.sub);
				if (isAdmin) {
					return next();
				}

				return c.json({ error: "forbidden", error_description: "Admin access required" }, 403);
			}
		}

		return c.json(UNAUTHORIZED, 401);
	};
}
