/**
 * Passkey Authentication Verify API
 *
 * POST /api/passkey/authenticate/verify
 *
 * Verifies the WebAuthn assertion and creates a session.
 * This is the second step of passkey authentication:
 * 1. Client gets options from /options endpoint
 * 2. Browser performs WebAuthn ceremony
 * 3. Client sends assertion here for verification
 * 4. Server verifies, looks up user, sets session cookies
 *
 * Uses the same session cookie pattern as OAuth callback.
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

/** Session cookie duration: 30 days */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

/** Default access token duration: 1 hour */
const DEFAULT_ACCESS_TOKEN_DURATION = 3600;

/** Grove platform domain for cross-subdomain cookies */
const GROVE_PLATFORM_DOMAIN = ".grove.place";

interface VerifyRequestBody {
  credential: {
    id: string;
    rawId: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle: string | null;
    };
    type: string;
  };
  returnTo?: string;
}

interface GroveAuthVerifyResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
  error?: string;
}

export const POST: RequestHandler = async ({
  request,
  cookies,
  platform,
  url,
}) => {
  // Validate CSRF (origin-based for API endpoints)
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Rate limit to prevent brute force
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const clientIp = getClientIP(request);
    const limitConfig = getEndpointLimitByKey("auth/callback");
    const rateLimitKey = buildRateLimitKey("passkey/auth/verify", clientIp);

    const { response: rateLimitResponse } = await checkRateLimit({
      kv,
      key: rateLimitKey,
      limit: limitConfig.limit,
      windowSeconds: limitConfig.windowSeconds,
      namespace: "passkey-ratelimit",
    });

    if (rateLimitResponse) {
      console.warn("[Passkey Verify] Rate limited:", { ip: clientIp });
      return rateLimitResponse;
    }
  }

  // Parse request body
  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    throw error(400, "Invalid request body");
  }

  // Validate credential structure
  if (
    !body.credential ||
    !body.credential.id ||
    !body.credential.response ||
    !body.credential.response.authenticatorData ||
    !body.credential.response.clientDataJSON ||
    !body.credential.response.signature
  ) {
    throw error(400, "Invalid credential data");
  }

  // Get returnTo from request body or cookie (sanitized to prevent open redirects)
  const returnTo = sanitizeReturnTo(
    body.returnTo || cookies.get("passkey_return_to"),
    "/arbor",
  );

  // Clear the returnTo cookie
  cookies.delete("passkey_return_to", { path: "/" });

  const authBaseUrl = platform?.env?.GROVEAUTH_URL || DEFAULT_AUTH_URL;

  try {
    // Send assertion to GroveAuth for verification
    const response = await fetch(
      `${authBaseUrl}/api/auth/passkey/verify-authentication`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: body.credential,
        }),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      console.error("[Passkey Verify] GroveAuth verification failed:", {
        status: response.status,
        error: errorData.error || errorData.message,
      });

      // Map specific errors to user-friendly messages
      const errorMessage =
        errorData.message || errorData.error || "Passkey verification failed";

      if (response.status === 404) {
        throw error(
          401,
          "No passkey found. Try signing in with Google instead.",
        );
      }

      throw error(response.status, errorMessage);
    }

    const result = (await response.json()) as GroveAuthVerifyResponse;

    if (!result.verified || !result.accessToken) {
      throw error(401, result.error || "Passkey verification failed");
    }

    // Upsert user into D1 if we have user info and database access
    if (result.user && platform?.env?.DB) {
      try {
        const userId = crypto.randomUUID();
        const displayName = result.user.name || result.user.email.split("@")[0];

        await platform.env.DB.prepare(
          `
          INSERT INTO users (id, groveauth_id, email, display_name, avatar_url, last_login_at, login_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, unixepoch(), 1, unixepoch(), unixepoch())
          ON CONFLICT (groveauth_id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            last_login_at = unixepoch(),
            login_count = login_count + 1,
            updated_at = unixepoch()
        `,
        )
          .bind(
            userId,
            result.user.id,
            result.user.email,
            displayName,
            result.user.picture || null,
          )
          .run();

        console.log("[Passkey Verify] User upserted:", result.user.id);
      } catch (dbErr) {
        // Log but don't fail auth - user can still proceed
        console.error("[Passkey Verify] Failed to upsert user:", {
          error: dbErr instanceof Error ? dbErr.message : "Unknown error",
          groveauth_id: result.user.id,
        });
      }
    }

    // Determine production environment
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    // Only set cross-subdomain cookie on grove.place
    const isGrovePlatform = url.hostname.endsWith("grove.place");
    const cookieDomain =
      isProduction && isGrovePlatform ? GROVE_PLATFORM_DOMAIN : undefined;

    // Set session cookies (same pattern as OAuth callback)
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    // Set access token
    cookies.set("access_token", result.accessToken, {
      ...cookieOptions,
      maxAge: result.expiresIn || DEFAULT_ACCESS_TOKEN_DURATION,
    });

    // Set refresh token if provided
    if (result.refreshToken) {
      cookies.set("refresh_token", result.refreshToken, {
        ...cookieOptions,
        maxAge: SESSION_DURATION_SECONDS,
      });
    }

    // Set session identifier
    const sessionId = crypto.randomUUID();
    cookies.set("session", sessionId, {
      ...cookieOptions,
      maxAge: SESSION_DURATION_SECONDS,
    });

    console.log("[Passkey Verify] Authentication successful");

    return json({
      success: true,
      redirectTo: returnTo,
    });
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === "object" && "status" in err) {
      throw err;
    }

    console.error("[Passkey Verify] Error:", err);
    throw error(500, "Failed to verify passkey authentication");
  }
};
