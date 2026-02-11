/**
 * Passkey Registration — Server Guard
 *
 * Ensures the user has an active session before showing the passkey page.
 * Without a session, passkey creation would fail at the API level anyway —
 * this gives a clean redirect instead of a cryptic error.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  // Check for a better-auth session cookie
  const hasSession =
    cookies.get("better-auth.session_token") ||
    cookies.get("__Secure-better-auth.session_token");

  if (!hasSession) {
    // No session — redirect to sign-in, preserving the original redirect param
    const redirectParam = url.searchParams.get("redirect");
    const loginUrl = redirectParam
      ? `/?redirect=${encodeURIComponent(redirectParam)}`
      : "/";
    throw redirect(302, loginUrl);
  }

  return {};
};
