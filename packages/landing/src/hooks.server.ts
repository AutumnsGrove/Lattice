/**
 * Landing App Server Hooks
 *
 * Authentication via Heartwood SessionDO with D1 session fallback for legacy users.
 */

import type { Handle } from "@sveltejs/kit";

/**
 * Parse a specific cookie by name from the cookie header
 */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
}

interface UserRow {
  id: string;
  email: string;
  is_admin: number;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize user as null
  event.locals.user = null;

  // Skip DB access for prerendered knowledge base routes
  // (adapter-cloudflare throws when accessing platform.env during prerendering)
  const routeId = event.route.id;
  const isPrerenderedRoute =
    routeId === "/knowledge" || routeId?.startsWith("/knowledge/");
  if (isPrerenderedRoute) {
    return resolve(event);
  }

  // Create a D1 session for consistent reads within this request
  if (event.platform?.env?.DB) {
    event.locals.dbSession = event.platform.env.DB.withSession();
  }

  const cookieHeader = event.request.headers.get("cookie");

  // =========================================================================
  // AUTHENTICATION (Heartwood SessionDO)
  // =========================================================================
  // Try grove_session cookie first (SessionDO - fast path via service binding)
  const groveSession = getCookie(cookieHeader, "grove_session");
  if (groveSession && event.platform?.env?.AUTH) {
    try {
      const response = await event.platform.env.AUTH.fetch(
        "https://auth-api.grove.place/session/validate",
        {
          method: "POST",
          headers: { Cookie: `grove_session=${groveSession}` },
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
            name: data.user.name || null,
            is_admin: data.user.isAdmin,
          };
          return resolve(event);
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
    return resolve(event);
  }

  try {
    const dbSession = event.locals.dbSession;

    // Get session and check if it's valid using the D1 session
    const session = await dbSession
      .prepare(
        'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")',
      )
      .bind(sessionId)
      .first<SessionRow>();

    if (!session) {
      // Clear invalid session cookie with proper attributes
      event.cookies.delete("session", {
        path: "/",
        httpOnly: true,
        secure: true,
      });
      return resolve(event);
    }

    // Get user using the same D1 session for consistency
    const user = await dbSession
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(session.user_id)
      .first<UserRow>();

    if (user) {
      event.locals.user = {
        id: user.id,
        email: user.email,
        name: null, // Legacy D1 sessions don't store name
        is_admin: user.is_admin === 1,
      };
    }
  } catch (error) {
    console.error("[Auth Hook Error]", error);
  }

  const response = await resolve(event);

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

  // CSP for landing page
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.grove.place data:",
    "font-src 'self' https://cdn.grove.place",
    "connect-src 'self' https://*.grove.place https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
