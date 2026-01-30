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
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  checkRateLimit,
  buildRateLimitKey,
  getClientIP,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits";
import { AUTH_COOKIE_NAMES } from "$lib/grafts/login";

// =============================================================================
// Error Messages
// =============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  auth_failed: "Authentication failed, please try again",
  no_session: "Session was not created, please try again",
};

function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

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
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const clientIp = getClientIP(request);
    const limitConfig = getEndpointLimitByKey("auth/callback");
    const rateLimitKey = buildRateLimitKey("auth/callback", clientIp);

    const { response: rateLimitResponse } = await checkRateLimit({
      kv,
      key: rateLimitKey,
      limit: limitConfig.limit,
      windowSeconds: limitConfig.windowSeconds,
      namespace: "auth-ratelimit",
    });

    if (rateLimitResponse) {
      console.warn("[Auth Callback] Rate limited:", { ip: clientIp });
      return rateLimitResponse;
    }
  }

  // Check for error from OAuth provider
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    console.error("[Auth Callback] Error from provider:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(
      errorParam === "access_denied" ? "access_denied" : "auth_failed",
    );
    redirect(302, `/auth/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Get return URL from query params (set by LoginGraft) or default to /admin
  const returnTo = url.searchParams.get("returnTo") || "/admin";

  // Verify Better Auth session cookie was set
  // Better Auth sets this cookie during the OAuth callback at GroveAuth
  const sessionToken = cookies.get(AUTH_COOKIE_NAMES.betterAuthSession);

  if (!sessionToken) {
    // No session cookie - check for legacy cookies during migration
    const legacySession = cookies.get("access_token") || cookies.get("session");
    if (!legacySession) {
      console.warn("[Auth Callback] No session cookie found");
      redirect(
        302,
        `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("no_session"))}`,
      );
    }
    // Legacy session exists - allow through during migration
    console.log(
      "[Auth Callback] Using legacy session, redirecting to:",
      returnTo,
    );
  } else {
    console.log(
      "[Auth Callback] Better Auth session found, redirecting to:",
      returnTo,
    );
  }

  // Success! Redirect to the requested destination
  redirect(302, returnTo);
};
