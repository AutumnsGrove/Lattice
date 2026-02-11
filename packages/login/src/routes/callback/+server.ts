/**
 * Post-Auth Callback — login.grove.place/callback
 *
 * This endpoint is where better-auth redirects after OAuth completion.
 * It verifies a session cookie exists, then redirects the user to their
 * intended destination (passed via ?redirect= query param).
 *
 * Security: Only redirects to *.grove.place domains to prevent open redirects.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateRedirectUrl } from "$lib/redirect";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const redirectTo = validateRedirectUrl(url.searchParams.get("redirect"));

  // Verify that a BA session cookie exists (presence check only).
  // We don't validate the token here — Heartwood handles session validation
  // on every authenticated API call. This check catches the common failure
  // case (OAuth completed but cookie wasn't set) so we can redirect to
  // sign-in with a helpful error rather than silently sending the user
  // to a destination where they'd be unauthenticated.
  // Heartwood sets cookies with domain=.grove.place, so they're visible here.
  // Domain spoofing is not a concern: SvelteKit's cookies.get() only returns
  // cookies that the browser sent for the current origin — browsers enforce
  // cookie domain scoping before the request even reaches the server.
  const hasSession =
    cookies.get("better-auth.session_token") ||
    cookies.get("__Secure-better-auth.session_token");

  if (!hasSession) {
    // No session — something went wrong during auth
    // Redirect back to sign-in with an error hint
    throw redirect(
      302,
      `/?error=no_session&redirect=${encodeURIComponent(redirectTo)}`,
    );
  }

  // Session exists — send them on their way
  throw redirect(302, redirectTo);
};
