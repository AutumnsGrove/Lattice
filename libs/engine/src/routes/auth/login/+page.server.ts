/**
 * Engine Login — Redirect to Login Hub
 *
 * The engine no longer hosts its own login UI. All authentication flows
 * go through login.grove.place, which is the centralized auth hub.
 *
 * Flow:
 * 1. User hits /auth/login on any tenant (e.g., autumn.grove.place)
 * 2. Server redirects to login.grove.place?redirect={callback_url}
 * 3. User authenticates on login.grove.place (same-origin, no CORS)
 * 4. Login hub redirects back to the engine's /auth/callback
 * 5. Engine callback verifies session cookie (.grove.place) and redirects to destination
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { sanitizeReturnTo } from "$lib/utils/grove-url.js";
import { buildLoginUrl } from "$lib/grafts/login/config.js";
import { getRealOrigin } from "$lib/server/origin.js";

export const load: PageServerLoad = async ({ url, request }) => {
  // Where the user wants to go after auth (e.g., /arbor)
  const returnTo = sanitizeReturnTo(url.searchParams.get("redirect"), "/");

  // Build the engine's callback URL that login.grove.place will redirect back to.
  // Must use getRealOrigin() to get the tenant's public hostname (e.g., autumn.grove.place)
  // instead of url.origin which resolves to the internal Pages hostname (grove-lattice.pages.dev)
  // when behind the grove-router proxy.
  const origin = getRealOrigin(request, url);
  const callbackUrl = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

  // Redirect to the login hub with the callback URL
  throw redirect(302, buildLoginUrl(callbackUrl));
};
