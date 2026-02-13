/**
 * Arbor Login — Redirect to Login Hub
 *
 * The landing app does not host its own login UI. All authentication flows
 * go through login.grove.place, which is the centralized auth hub.
 *
 * Flow:
 * 1. User hits /arbor/login on grove.place (unauthenticated)
 * 2. Server redirects to login.grove.place?redirect={callback_url}
 * 3. User authenticates on login.grove.place (same-origin, no CORS)
 * 4. Login hub redirects back to grove.place/auth/callback
 * 5. Callback verifies session cookie (.grove.place) and redirects to /arbor
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { sanitizeReturnTo } from "@autumnsgrove/groveengine/utils";
import { buildLoginUrl } from "@autumnsgrove/groveengine/grafts/login";

export const load: PageServerLoad = async ({ url }) => {
  // Where the user wants to go after auth (e.g., /arbor)
  const returnTo = sanitizeReturnTo(url.searchParams.get("redirect"), "/arbor");

  // Build the callback URL that login.grove.place will redirect back to
  const callbackUrl = `${url.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

  // Redirect to the login hub with the callback URL
  throw redirect(302, buildLoginUrl(callbackUrl));
};
