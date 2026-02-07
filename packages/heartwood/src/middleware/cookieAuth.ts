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
import { isUserAdmin, getUserById, isEmailAdmin } from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { extractBearerToken } from "./bearerAuth.js";
import { getSessionFromRequest } from "../lib/session.js";
import type { SessionDO } from "../durables/SessionDO.js";

/**
 * Admin auth middleware that supports:
 * 1. Authorization: Bearer <token> (existing JWT path)
 * 2. Cookie-based auth via grove_session (SessionDO) or access_token (JWT cookie)
 *
 * Both paths verify admin access before proceeding.
 */
export function adminCookieAuth() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
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
      const isAdmin = await isUserAdmin(db, payload.sub);
      if (!isAdmin) {
        return c.json(
          { error: "forbidden", error_description: "Admin access required" },
          403,
        );
      }

      // Store token for proxying (minecraft uses this)
      c.set("accessToken", token);
      return next();
    }

    // Path 2: Cookie-based auth (grove_session → SessionDO)
    const parsedSession = await getSessionFromRequest(
      c.req.raw,
      c.env.SESSION_SECRET,
    );

    if (parsedSession) {
      const sessionDO = c.env.SESSIONS.get(
        c.env.SESSIONS.idFromName(`session:${parsedSession.userId}`),
      ) as DurableObjectStub<SessionDO>;

      const result = await sessionDO.validateSession(parsedSession.sessionId);

      if (result.valid) {
        const db = createDbSession(c.env);
        const user = await getUserById(db, parsedSession.userId);

        if (user && (user.is_admin === 1 || isEmailAdmin(user.email))) {
          return next();
        }

        return c.json(
          { error: "forbidden", error_description: "Admin access required" },
          403,
        );
      }
    }

    // Path 3: Fallback to access_token cookie (JWT)
    const cookieHeader = c.req.header("Cookie") || "";
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);

    if (accessTokenMatch) {
      const payload = await verifyAccessToken(c.env, accessTokenMatch[1]);

      if (payload?.sub) {
        const db = createDbSession(c.env);
        const isAdmin = await isUserAdmin(db, payload.sub);
        if (isAdmin) {
          return next();
        }

        return c.json(
          { error: "forbidden", error_description: "Admin access required" },
          403,
        );
      }
    }

    return c.json(
      {
        error: "unauthorized",
        error_description: "Missing or invalid credentials",
      },
      401,
    );
  };
}
