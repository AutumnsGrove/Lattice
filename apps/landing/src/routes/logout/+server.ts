/**
 * Logout — Revoke SessionDO session and clear all auth cookies
 *
 * Mirrors the engine's logout pattern:
 * 1. Calls GroveAuth /session/revoke to invalidate the SessionDO session
 * 2. Clears all auth-related cookies (grove_session, access_token, etc.)
 * 3. Redirects to /
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

  // Cookie deletion options — must match domain where cookies were set
  const cookieOptions = {
    path: "/",
    ...(isProduction ? { domain: ".grove.place" } : {}),
  };

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
      // Log but don't fail — we still want to clear cookies
      console.error("[Logout] Failed to revoke SessionDO session:", err);
    }
  }

  // Clear all auth cookies
  cookies.delete("grove_session", cookieOptions);
  cookies.delete("access_token", cookieOptions);
  cookies.delete("refresh_token", cookieOptions);
  cookies.delete("session", cookieOptions);

  // Clear Better Auth session cookies (both prefixed and unprefixed variants)
  cookies.delete("__Secure-better-auth.session_token", cookieOptions);
  cookies.delete("better-auth.session_token", cookieOptions);
  cookies.delete("session_token", { path: "/" });

  redirect(302, "/");
};
