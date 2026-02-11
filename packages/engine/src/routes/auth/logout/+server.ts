/**
 * Logout - Revoke SessionDO session and clear all auth cookies
 *
 * This endpoint:
 * 1. Calls GroveAuth /session/revoke to invalidate the SessionDO session
 * 2. Clears all auth-related cookies (grove_session, access_token, etc.)
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

/**
 * POST is the primary logout handler (CSRF-safe).
 * GET is kept as a fallback for existing links during migration,
 * but new code should always use POST.
 */
export const POST: RequestHandler = async ({
  url,
  cookies,
  platform,
  request,
}) => {
  // Determine if we're in production
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

  // Cookie deletion options - must match domain where cookies were set
  const cookieOptions = {
    path: "/",
    ...(isProduction ? { domain: ".grove.place" } : {}),
  };

  // Revoke SessionDO session via service binding (if available)
  const groveSession = cookies.get("grove_session");
  if (groveSession && platform?.env?.AUTH) {
    try {
      await platform.env.AUTH.fetch(`${AUTH_HUB_URL}/session/revoke`, {
        method: "POST",
        headers: { Cookie: `grove_session=${groveSession}` },
      });
    } catch (err) {
      // Log but don't fail - we still want to clear cookies
      console.error("[Logout] Failed to revoke SessionDO session:", err);
    }
  }

  // Clear all auth cookies
  cookies.delete("grove_session", cookieOptions); // SessionDO session
  cookies.delete("access_token", cookieOptions); // Legacy JWT
  cookies.delete("refresh_token", cookieOptions); // Legacy refresh
  cookies.delete("session", cookieOptions); // Legacy session ID

  // Clear Better Auth session cookies (both prefixed and unprefixed variants)
  // Production uses __Secure- prefix, development uses unprefixed
  cookies.delete("__Secure-better-auth.session_token", cookieOptions);
  cookies.delete("better-auth.session_token", cookieOptions);

  // Also clear the old session cookie if it exists (from magic code auth)
  cookies.delete("session_token", { path: "/" });

  redirect(302, "/");
};

/**
 * GET fallback — kept for backwards compatibility with existing <a> links.
 * Delegates to the same logic as POST. Safe because:
 * - Session revocation is idempotent (revoking a revoked session is a no-op)
 * - SvelteKit's built-in CSRF protection (checkOrigin) only applies to
 *   POST/PUT/DELETE/PATCH, so GET logout doesn't trigger CSRF rejection
 * - SameSite=Lax cookies prevent cross-origin GET-with-cookies in most contexts
 *
 * TODO: Remove once all logout links are migrated to POST forms
 */
export const GET: RequestHandler = POST;
