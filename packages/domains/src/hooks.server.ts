/**
 * Domains App (Forage) Server Hooks
 *
 * Authentication via Heartwood SessionDO with D1 session fallback for legacy users.
 */

import type { Handle } from "@sveltejs/kit";
import { getUserById, getSession, updateSessionTokens } from "$lib/server/db";

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Environment variables required for core functionality.
 * Validated on first request to fail fast if misconfigured.
 */
const REQUIRED_ENV_VARS = ["DB"] as const;
const GROVEAUTH_ENV_VARS = [
  "GROVEAUTH_CLIENT_ID",
  "GROVEAUTH_CLIENT_SECRET",
] as const;

/** Refresh tokens this many milliseconds before they expire */
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

let envValidated = false;

function validateEnvironment(env: Record<string, unknown>): void {
  if (envValidated) return;

  const missing: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!env[varName]) {
      missing.push(varName);
    }
  }

  // GroveAuth vars are only required if we're using GroveAuth
  // (they're optional for magic code auth fallback)
  const hasGroveAuth = GROVEAUTH_ENV_VARS.every((v) => !!env[v]);
  if (!hasGroveAuth) {
    console.warn(
      "[Env Check] GroveAuth environment variables not fully configured. " +
        "GroveAuth login will not work. Missing: " +
        GROVEAUTH_ENV_VARS.filter((v) => !env[v]).join(", "),
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  envValidated = true;
}

/**
 * Check if token is expired or about to expire within the buffer period
 */
function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiresTime = new Date(expiresAt).getTime();
  return Date.now() >= expiresTime - TOKEN_REFRESH_BUFFER_MS;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Validate environment on first request
  if (event.platform?.env) {
    try {
      validateEnvironment(event.platform.env as Record<string, unknown>);
    } catch (error) {
      console.error("[Env Validation Error]", error);
    }
  }

  // Initialize user as null
  event.locals.user = null;

  // Create a D1 session for consistent reads within this request
  if (event.platform?.env?.DB) {
    event.locals.dbSession = event.platform.env.DB.withSession();
  }

  const cookieHeader = event.request.headers.get("cookie");

  // =========================================================================
  // AUTHENTICATION (Heartwood SessionDO)
  // =========================================================================
  // Try grove_session cookie first, also check Better Auth session cookies (OAuth flow)
  const groveSession = getCookie(cookieHeader, "grove_session");
  const betterAuthSession =
    getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
    getCookie(cookieHeader, "better-auth.session_token");
  const sessionCookie = groveSession || betterAuthSession;

  if (sessionCookie && event.platform?.env?.AUTH) {
    try {
      // Pass full cookie header so GroveAuth can find whichever session cookie exists
      const response = await event.platform.env.AUTH.fetch(
        "https://auth-api.grove.place/session/validate",
        {
          method: "POST",
          headers: { Cookie: cookieHeader || "" },
        },
      );

      if (response.ok) {
        const data = (await response.json()) as {
          valid: boolean;
          user?: {
            id: string;
            email: string;
            name: string;
            avatarUrl: string;
            isAdmin: boolean;
          };
        };

        if (data.valid && data.user) {
          event.locals.user = {
            id: data.user.id,
            email: data.user.email,
            is_admin: data.user.isAdmin,
          };
          const response = await resolve(event);
          return addSecurityHeaders(response);
        }
      }
    } catch (err) {
      console.error("[Auth] SessionDO validation error:", err);
    }
  }

  // =========================================================================
  // FALLBACK: Legacy D1 Session (for backwards compatibility)
  // =========================================================================
  const sessionId = event.cookies.get("session");
  if (!sessionId || !event.locals.dbSession) {
    const response = await resolve(event);
    return addSecurityHeaders(response);
  }

  try {
    const dbSession = event.locals.dbSession;

    // Get session with token information using the D1 session
    const session = await getSession(dbSession, sessionId);

    if (!session) {
      // Clear invalid session cookie
      event.cookies.delete("session", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      const response = await resolve(event);
      return addSecurityHeaders(response);
    }

    // Check if access token needs refresh
    if (
      session.access_token &&
      session.refresh_token &&
      isTokenExpiringSoon(session.token_expires_at) &&
      event.platform?.env
    ) {
      // Token is expiring soon, try to refresh it
      try {
        const authBaseUrl =
          event.platform.env.GROVEAUTH_URL || "https://auth-api.grove.place";
        const clientId = event.platform.env.GROVEAUTH_CLIENT_ID;
        const clientSecret = event.platform.env.GROVEAUTH_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const response = await fetch(`${authBaseUrl}/token/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: session.refresh_token,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          if (response.ok) {
            const tokens = (await response.json()) as {
              access_token: string;
              refresh_token?: string;
              expires_in?: number;
            };
            await updateSessionTokens(dbSession, sessionId, {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresIn: tokens.expires_in,
            });
            console.log("[Auth Hook] Token refreshed successfully");
          } else {
            console.warn(
              "[Auth Hook] Token refresh failed, user may need to re-login",
            );
          }
        }
      } catch (refreshError) {
        console.error("[Auth Hook] Token refresh error:", refreshError);
      }
    }

    // Get user using the same D1 session for consistency
    const user = await getUserById(dbSession, session.user_id);

    if (user) {
      event.locals.user = {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      };
    }
  } catch (error) {
    console.error("[Auth Hook Error]", error);
  }

  const response = await resolve(event);
  return addSecurityHeaders(response);
};

/**
 * Apply security headers to all responses
 */
function addSecurityHeaders(response: Response): Response {
  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // CSP for domains app
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.grove.place data: blob:",
    "connect-src 'self' https://*.grove.place",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}
