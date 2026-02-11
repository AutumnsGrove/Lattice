/**
 * Passkey Authentication Options API
 *
 * POST /api/passkey/authenticate/options
 *
 * Returns WebAuthn authentication options for signing in with a passkey.
 * Uses discoverable credentials (empty allowCredentials) so the browser
 * shows all available passkeys for this domain.
 *
 * Note: Unlike registration, this endpoint doesn't require authentication -
 * anyone can request authentication options to sign in.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  API_ERRORS,
  throwGroveError,
  logGroveError,
} from "$lib/errors/index.js";
import { sanitizeReturnTo } from "$lib/utils/grove-url.js";
import {
  checkRateLimit,
  buildRateLimitKey,
  getClientIP,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits/index.js";
import { AUTH_HUB_URL } from "$lib/config/auth.js";

interface RequestBody {
  returnTo?: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate CSRF (origin-based for API endpoints)
  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  // Rate limit to prevent abuse
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const clientIp = getClientIP(request);
    // Use same limits as auth/callback since this is part of auth flow
    const limitConfig = getEndpointLimitByKey("auth/callback");
    const rateLimitKey = buildRateLimitKey("passkey/auth/options", clientIp);

    const { response: rateLimitResponse } = await checkRateLimit({
      kv,
      key: rateLimitKey,
      limit: limitConfig.limit,
      windowSeconds: limitConfig.windowSeconds,
      namespace: "passkey-ratelimit",
    });

    if (rateLimitResponse) {
      console.warn("[Passkey Auth] Rate limited:", { ip: clientIp });
      return rateLimitResponse;
    }
  }

  // Parse request body (optional returnTo)
  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    // Body is optional, continue with defaults
  }

  // Store returnTo in cookie for verification endpoint (sanitized to prevent open redirects)
  if (body.returnTo) {
    cookies.set(
      "passkey_return_to",
      sanitizeReturnTo(body.returnTo, "/arbor"),
      {
        path: "/",
        httpOnly: true,
        secure: request.url.includes("localhost") ? false : true,
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
      },
    );
  }

  const authBaseUrl = platform?.env?.GROVEAUTH_URL || AUTH_HUB_URL;

  try {
    // Request authentication options from GroveAuth
    // This returns challenge, rpId, timeout - no allowCredentials for discoverable flow
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/generate-authentication-options`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey Auth] Failed to get authentication options:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      logGroveError("API", API_ERRORS.UPSTREAM_ERROR, {
        detail: errorData.message || errorData.error,
        status: response.status,
      });
      throwGroveError(response.status, API_ERRORS.UPSTREAM_ERROR, "API");
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
    throwGroveError(500, API_ERRORS.INTERNAL_ERROR, "API");
  }
};
