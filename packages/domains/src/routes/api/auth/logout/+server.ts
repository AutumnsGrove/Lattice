/**
 * Logout - Revoke sessions and clear all auth cookies
 *
 * POST /api/auth/logout
 *
 * This endpoint:
 * 1. Deletes the local D1 session
 * 2. Calls GroveAuth /session/revoke to invalidate the SessionDO session
 * 3. Clears all auth-related cookies (including Better Auth cookies)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteSession } from "$lib/server/db";

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

  // Delete local D1 session
  const sessionId = cookies.get("session");
  if (sessionId && platform?.env?.DB) {
    try {
      await deleteSession(platform.env.DB, sessionId);
    } catch (err) {
      console.error("[Logout] Failed to delete D1 session:", err);
    }
  }

  // Revoke SessionDO session via service binding (if available)
  const groveSession = cookies.get("grove_session");
  if (groveSession && platform?.env?.AUTH) {
    try {
      await platform.env.AUTH.fetch(
        "https://login.grove.place/session/revoke",
        {
          method: "POST",
          headers: { Cookie: `grove_session=${groveSession}` },
        },
      );
    } catch (err) {
      // Log but don't fail - we still want to clear cookies
      console.error("[Logout] Failed to revoke SessionDO session:", err);
    }
  }

  // Clear all auth cookies
  cookies.delete("session", cookieOptions); // Local D1 session
  cookies.delete("grove_session", cookieOptions); // SessionDO session
  cookies.delete("access_token", cookieOptions); // Legacy JWT
  cookies.delete("refresh_token", cookieOptions); // Legacy refresh

  // Clear Better Auth session cookies (both prefixed and unprefixed variants)
  // Production uses __Secure- prefix, development uses unprefixed
  cookies.delete("__Secure-better-auth.session_token", cookieOptions);
  cookies.delete("better-auth.session_token", cookieOptions);

  return json({ success: true });
};
