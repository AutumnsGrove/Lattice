/**
 * Magic Link Callback - Handle Better Auth magic link verification
 *
 * When a user clicks a magic link in their email, Better Auth verifies the
 * token and sets the session cookie, then redirects here. This callback
 * confirms the session exists and sends the user to their destination.
 *
 * Flow:
 * 1. User enters email → EmailButton sends magic link via GroveAuth
 * 2. User clicks link in email → Better Auth verifies token
 * 3. Better Auth sets session cookie and redirects here
 * 4. We verify cookie exists and redirect to returnTo (or /arbor)
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { getClientIP } from "$lib/threshold/adapters/worker.js";
import { getEndpointLimitByKey } from "$lib/threshold/config.js";
import { AUTH_COOKIE_NAMES } from "$lib/grafts/login";
import {
  AUTH_ERRORS,
  getAuthError,
  logAuthError,
  buildErrorParams,
} from "$lib/heartwood/errors";
import { sanitizeReturnTo } from "$lib/utils/grove-url.js";

export const GET: RequestHandler = async ({
  url,
  cookies,
  platform,
  request,
}) => {
  // Rate limiting
  const threshold = createThreshold(platform?.env);
  if (threshold) {
    const clientIp = getClientIP(request);
    const limitConfig = getEndpointLimitByKey("auth/callback");
    const denied = await thresholdCheck(threshold, {
      key: `magic-link/callback:${clientIp}`,
      ...limitConfig,
      failMode: "closed",
    });
    if (denied) {
      console.warn("[Magic Link Callback] Rate limited:", { ip: clientIp });
      return denied;
    }
  }

  // Check for error from Better Auth
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    const authError = getAuthError(errorParam);
    logAuthError(authError, {
      oauthError: errorParam,
      ip: getClientIP(request),
      path: url.pathname,
    });
    throw redirect(302, `/auth/login?${buildErrorParams(authError)}`);
  }

  // Get return URL from query params, sanitized to prevent open redirects
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"), "/arbor");

  // Verify Better Auth session cookie was set
  const sessionToken =
    cookies.get(AUTH_COOKIE_NAMES.betterAuthSessionSecure) ||
    cookies.get(AUTH_COOKIE_NAMES.betterAuthSession);

  if (!sessionToken) {
    logAuthError(AUTH_ERRORS.NO_SESSION, {
      ip: getClientIP(request),
      path: url.pathname,
    });

    throw redirect(
      302,
      `/auth/login?${buildErrorParams(AUTH_ERRORS.NO_SESSION)}`,
    );
  }

  console.log("[Magic Link Callback] Session found, redirecting to:", returnTo);

  // Success! Redirect to the requested destination
  throw redirect(302, returnTo);
};
