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

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import { sanitizeReturnTo } from "$lib/utils/grove-url.js";
import {
  checkRateLimit,
  buildRateLimitKey,
  getClientIP,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits/index.js";

/** Default GroveAuth API URL */
const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

interface RequestBody {
  returnTo?: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  // Validate CSRF (origin-based for API endpoints)
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
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

  const authBaseUrl = platform?.env?.GROVEAUTH_URL || DEFAULT_AUTH_URL;

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

      throw error(
        response.status,
        errorData.message ||
          errorData.error ||
          "Failed to get passkey authentication options",
      );
    }

    const options = await response.json();
    return json(options);
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey Auth] Options error:", err);
    throw error(500, "Failed to get passkey authentication options");
  }
};
