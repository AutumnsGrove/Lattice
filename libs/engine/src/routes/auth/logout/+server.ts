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
 * POST logout handler (CSRF-safe).
 * All logout forms must use POST — GET logout was removed to prevent CSRF logout attacks.
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
