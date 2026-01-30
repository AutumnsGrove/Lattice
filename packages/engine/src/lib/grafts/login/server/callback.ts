/**
 * Callback Handler Factory for Better Auth
 *
 * Creates a SvelteKit request handler for OAuth callback processing.
 *
 * With Better Auth migration, this handler is MUCH simpler:
 * - Better Auth handles the full OAuth flow and sets the session cookie
 * - This callback just verifies the session cookie exists and redirects
 * - No more PKCE token exchange needed on the tenant side
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler, RequestEvent } from "@sveltejs/kit";
import type { CallbackHandlerConfig } from "../types.js";
import { AUTH_COOKIE_NAMES } from "../config.js";

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * User-friendly error messages for common OAuth errors.
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  auth_failed: "Authentication failed, please try again",
  no_session: "Session was not created, please try again",
  rate_limited: "Too many login attempts. Please wait before trying again.",
};

/**
 * Get a user-friendly error message for an error code.
 */
function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Get client IP from request headers.
 * Cloudflare provides CF-Connecting-IP for the real client IP.
 */
function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Simple KV-based rate limiting for auth endpoints.
 * Returns true if rate limited, false if allowed.
 */
async function isRateLimited(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  try {
    const current = await kv.get(windowKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      return true; // Rate limited
    }

    // Increment counter with TTL
    await kv.put(windowKey, String(count + 1), {
      expirationTtl: windowSeconds,
    });

    return false;
  } catch (err) {
    // Fail open for auth availability, but log for monitoring
    console.warn("[Auth Callback] Rate limit KV error (failing open):", err);
    return false;
  }
}

// =============================================================================
// HANDLER FACTORY
// =============================================================================

/**
 * Create a callback handler for Better Auth OAuth authentication.
 *
 * This factory creates a SvelteKit GET handler that:
 * 1. Checks for OAuth errors from the provider
 * 2. Verifies the Better Auth session cookie was set
 * 3. Redirects to the requested destination
 *
 * Note: With Better Auth, the OAuth flow is handled entirely by GroveAuth.
 * This callback just needs to verify success and redirect - no token exchange!
 *
 * @param config - Configuration for the callback handler
 * @returns A SvelteKit RequestHandler
 *
 * @example
 * ```typescript
 * // In routes/auth/callback/+server.ts
 * import { createCallbackHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createCallbackHandler({
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 */
export function createCallbackHandler(
  config: CallbackHandlerConfig = {},
): RequestHandler {
  const { defaultReturnTo = "/admin", rateLimitKvKey = "CACHE_KV" } = config;

  return async ({
    url,
    cookies,
    platform,
    request,
  }): Promise<Response | never> => {
    // Cast env to allow dynamic key access
    const env = platform?.env as Record<string, unknown> | undefined;

    // Rate limiting
    const kv = env?.[rateLimitKvKey] as KVNamespace | undefined;
    if (kv) {
      const clientIp = getClientIP(request);
      const rateLimited = await isRateLimited(
        kv,
        `auth-callback:${clientIp}`,
        10, // 10 attempts
        900, // per 15 minutes
      );

      if (rateLimited) {
        console.warn("[Auth Callback] Rate limited:", { ip: clientIp });
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            message: getFriendlyErrorMessage("rate_limited"),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "900",
            },
          },
        );
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

    // Get return URL from query params (set by LoginGraft) or use default
    const returnTo = url.searchParams.get("returnTo") || defaultReturnTo;

    // Verify Better Auth session cookie was set
    // Better Auth sets this cookie during the OAuth callback
    const sessionToken = cookies.get(AUTH_COOKIE_NAMES.betterAuthSession);

    if (!sessionToken) {
      // No session cookie - auth may have failed silently
      console.warn("[Auth Callback] No Better Auth session cookie found");
      redirect(
        302,
        `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("no_session"))}`,
      );
    }

    // Success! Redirect to the requested destination
    console.log("[Auth Callback] Success, redirecting to:", returnTo);
    redirect(302, returnTo);
  };
}
