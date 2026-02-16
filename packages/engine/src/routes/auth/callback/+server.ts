/**
 * OAuth Callback - Handle Better Auth authentication response
 *
 * With Better Auth, the OAuth flow is handled entirely by GroveAuth.
 * This callback just verifies the session cookie was set and redirects
 * to the requested destination.
 *
 * Flow:
 * 1. User clicks "Sign in with Google" → redirects to Better Auth
 * 2. Better Auth handles OAuth with Google
 * 3. Better Auth sets session cookie and redirects here
 * 4. We verify cookie exists and redirect to /admin (or returnTo)
 *
 * USER PERSISTENCE NOTE:
 * This engine callback does NOT manage user records—it only verifies the
 * session cookie exists. User persistence is handled differently per package:
 * - GroveAuth (Better Auth): Creates/manages users in its own database
 * - Domains package: Fetches user from GroveAuth and syncs to local D1
 * - Landing/Engine: No local user storage, session is validated via cookie
 *
 * If a tenant app needs local user records, it should implement its own
 * callback (like domains does) that fetches from GroveAuth's session endpoint.
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

/**
 * Migration deadline for legacy session cookies.
 * After this date, legacy cookies will no longer grant access.
 * This prevents old/expired cookies from being used indefinitely.
 */
const LEGACY_SESSION_DEADLINE = new Date("2026-03-01T00:00:00Z");

// =============================================================================
// Handler
// =============================================================================

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
      key: `auth/callback:${clientIp}`,
      ...limitConfig,
      failMode: "closed",
    });
    if (denied) {
      console.warn("[Auth Callback] Rate limited:", { ip: clientIp });
      return denied;
    }
  }

  // Check for error from OAuth provider
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

  // Get return URL from query params (set by LoginGraft), sanitized to prevent open redirects
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"), "/arbor");

  // Verify Better Auth session cookie was set
  // Better Auth uses __Secure- prefix in production (HTTPS)
  // Check both prefixed and unprefixed names for compatibility
  const sessionToken =
    cookies.get(AUTH_COOKIE_NAMES.betterAuthSessionSecure) ||
    cookies.get(AUTH_COOKIE_NAMES.betterAuthSession);

  if (!sessionToken) {
    // No session cookie - check for legacy cookies during migration
    const legacySession = cookies.get("access_token") || cookies.get("session");

    // Check if migration period has expired
    const migrationExpired = new Date() > LEGACY_SESSION_DEADLINE;

    if (!legacySession || migrationExpired) {
      const authError =
        migrationExpired && legacySession
          ? AUTH_ERRORS.LEGACY_SESSION_EXPIRED
          : AUTH_ERRORS.NO_SESSION;

      logAuthError(authError, {
        ip: getClientIP(request),
        path: url.pathname,
      });

      throw redirect(302, `/auth/login?${buildErrorParams(authError)}`);
    }
    // Legacy session exists and within migration window - allow through
    console.log(
      "[Auth Callback] Using legacy session (migration period), redirecting to:",
      returnTo,
    );
  } else {
    console.log(
      "[Auth Callback] Better Auth session found, redirecting to:",
      returnTo,
    );
  }

  // Success! Redirect to the requested destination
  throw redirect(302, returnTo);
};
