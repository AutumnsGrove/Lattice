/**
 * Session Validation Hook for Grove Services
 *
 * This module provides fast session validation for all Grove services
 * (Engine, Lattice, Meadow, Amber, Rings) using Better Auth's session system.
 *
 * Performance target: < 5ms for cached sessions (via KV)
 *
 * Usage in other services:
 * ```typescript
 * import { validateSession, type SessionUser } from '@groveauth/server';
 *
 * // In your request handler:
 * const user = await validateSession(request, env);
 * if (!user) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * ```
 */

import type { Env } from "../../types.js";

/**
 * Session user data returned from validation
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;

  // Grove-specific fields
  tenantId: string | null;
  isAdmin: boolean;
  loginCount: number;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
}

/**
 * Session data with user and metadata
 */
export interface SessionData {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
  user: SessionUser;
}

/**
 * Session validation result
 */
export type ValidationResult =
  | { valid: true; data: SessionData }
  | { valid: false; error: string };

// KV cache key prefix for sessions
const SESSION_CACHE_PREFIX = "ba_session:";

// Cache TTL in seconds (5 minutes)
const SESSION_CACHE_TTL = 300;

/**
 * Extract session token from request cookies
 *
 * Better Auth signs cookies in format: `token.signature`
 * We need to extract the raw token (before the dot) for DB lookup.
 */
function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  // Better Auth uses 'better-auth.session_token' cookie by default
  // but we may have configured a custom name
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...value] = c.trim().split("=");
      return [key, value.join("=")];
    }),
  );

  // Try Better Auth cookie names
  const signedToken =
    cookies["better-auth.session_token"] ||
    cookies["__Secure-better-auth.session_token"] ||
    cookies["session_token"] ||
    null;

  if (!signedToken) return null;

  // Better Auth signs cookies as `token.signature` - extract the raw token
  // The token is the part before the first dot
  const rawToken = signedToken.split(".")[0];
  return rawToken || null;
}

/**
 * Validate a session token against the database
 * Uses KV cache for fast lookups
 *
 * @param request - The incoming request with session cookie
 * @param env - Cloudflare Worker environment bindings
 * @returns Session data if valid, null if invalid/expired
 */
export async function validateSession(
  request: Request,
  env: Env,
): Promise<SessionUser | null> {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  // Try KV cache first for fast lookup
  const cacheKey = `${SESSION_CACHE_PREFIX}${token}`;
  const cached = await env.SESSION_KV.get<SessionData>(cacheKey, "json");

  if (cached) {
    // Check if session is expired
    const expiresAt = new Date(cached.session.expiresAt);
    if (expiresAt > new Date()) {
      // Check if user is banned
      if (cached.user.banned) {
        const banExpires = cached.user.banExpires
          ? new Date(cached.user.banExpires)
          : null;
        if (!banExpires || banExpires > new Date()) {
          return null; // Still banned
        }
      }
      return cached.user;
    }
    // Session expired, delete from cache
    await env.SESSION_KV.delete(cacheKey);
  }

  // Cache miss or expired - query D1
  try {
    const result = await env.DB.prepare(
      `
      SELECT
        s.id as session_id,
        s.user_id,
        s.token,
        s.expires_at,
        s.ip_address,
        s.user_agent,
        u.id,
        u.email,
        u.name,
        u.image,
        u.email_verified,
        u.tenant_id,
        u.is_admin,
        u.login_count,
        u.banned,
        u.ban_reason,
        u.ban_expires
      FROM ba_session s
      JOIN ba_user u ON s.user_id = u.id
      WHERE s.token = ?
      AND s.expires_at > ?
    `,
    )
      .bind(token, Math.floor(Date.now() / 1000))
      .first<{
        session_id: string;
        user_id: string;
        token: string;
        expires_at: number;
        ip_address: string | null;
        user_agent: string | null;
        id: string;
        email: string;
        name: string | null;
        image: string | null;
        email_verified: number;
        tenant_id: string | null;
        is_admin: number;
        login_count: number;
        banned: number;
        ban_reason: string | null;
        ban_expires: number | null;
      }>();

    if (!result) {
      return null;
    }

    // Check if user is banned
    if (result.banned) {
      const banExpires = result.ban_expires
        ? new Date(result.ban_expires * 1000)
        : null;
      if (!banExpires || banExpires > new Date()) {
        return null; // User is banned
      }
    }

    // Build session data
    const sessionData: SessionData = {
      session: {
        id: result.session_id,
        userId: result.user_id,
        token: result.token,
        expiresAt: new Date(result.expires_at * 1000),
        ipAddress: result.ip_address,
        userAgent: result.user_agent,
      },
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        image: result.image,
        emailVerified: Boolean(result.email_verified),
        tenantId: result.tenant_id,
        isAdmin: Boolean(result.is_admin),
        loginCount: result.login_count,
        banned: Boolean(result.banned),
        banReason: result.ban_reason,
        banExpires: result.ban_expires
          ? new Date(result.ban_expires * 1000)
          : null,
      },
    };

    // Cache in KV for fast subsequent lookups
    await env.SESSION_KV.put(cacheKey, JSON.stringify(sessionData), {
      expirationTtl: SESSION_CACHE_TTL,
    });

    return sessionData.user;
  } catch (error) {
    console.error("[SessionValidation] Database error:", error);
    return null;
  }
}

/**
 * Validate session and return full result with error details
 * Useful for debugging and detailed error responses
 */
export async function validateSessionFull(
  request: Request,
  env: Env,
): Promise<ValidationResult> {
  const token = getSessionToken(request);
  if (!token) {
    return { valid: false, error: "No session token provided" };
  }

  const user = await validateSession(request, env);
  if (!user) {
    return { valid: false, error: "Invalid or expired session" };
  }

  // We need to re-fetch session data for full result
  // This is slightly less efficient but only used for detailed validation
  const cacheKey = `${SESSION_CACHE_PREFIX}${token}`;
  const cached = await env.SESSION_KV.get<SessionData>(cacheKey, "json");

  if (cached) {
    return { valid: true, data: cached };
  }

  return { valid: false, error: "Session data not found" };
}

/**
 * Invalidate a session (for logout)
 */
export async function invalidateSession(
  token: string,
  env: Env,
): Promise<boolean> {
  try {
    // Delete from KV cache
    const cacheKey = `${SESSION_CACHE_PREFIX}${token}`;
    await env.SESSION_KV.delete(cacheKey);

    // Delete from D1
    await env.DB.prepare("DELETE FROM ba_session WHERE token = ?")
      .bind(token)
      .run();

    return true;
  } catch (error) {
    console.error("[SessionValidation] Error invalidating session:", error);
    return false;
  }
}

/**
 * Invalidate all sessions for a user (for forced logout)
 */
export async function invalidateAllUserSessions(
  userId: string,
  env: Env,
): Promise<boolean> {
  try {
    // Get all session tokens for user
    const sessions = await env.DB.prepare(
      "SELECT token FROM ba_session WHERE user_id = ?",
    )
      .bind(userId)
      .all<{ token: string }>();

    // Delete from KV cache
    for (const session of sessions.results) {
      const cacheKey = `${SESSION_CACHE_PREFIX}${session.token}`;
      await env.SESSION_KV.delete(cacheKey);
    }

    // Delete all from D1
    await env.DB.prepare("DELETE FROM ba_session WHERE user_id = ?")
      .bind(userId)
      .run();

    return true;
  } catch (error) {
    console.error(
      "[SessionValidation] Error invalidating user sessions:",
      error,
    );
    return false;
  }
}

/**
 * Check if a user is an admin
 * Useful for admin-only route protection
 */
export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const user = await validateSession(request, env);
  return user?.isAdmin ?? false;
}

/**
 * Require authentication middleware helper
 * Returns user if authenticated, throws 401 Response if not
 */
export async function requireAuth(
  request: Request,
  env: Env,
): Promise<SessionUser> {
  const user = await validateSession(request, env);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Require admin authentication middleware helper
 * Returns user if admin, throws 401/403 Response if not
 */
export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<SessionUser> {
  const user = await requireAuth(request, env);
  if (!user.isAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
