/**
 * OAuth Callback - Handle GroveAuth (Heartwood) authentication response
 *
 * Exchanges the authorization code for tokens, fetches user info,
 * upserts user into D1, and sets session cookies.
 *
 * Note: This uses GROVEAUTH_API_URL for API calls (token, userinfo).
 * The login redirect in /auth/login/start uses GROVEAUTH_URL for the user-facing login page.
 * These may be different domains (e.g., auth.grove.place vs auth-api.grove.place).
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  checkRateLimit,
  buildRateLimitKey,
  getClientIP,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits";

// ============================================================================
// Constants
// ============================================================================

/** Session cookie duration: 30 days */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

/** Default access token duration: 1 hour */
const DEFAULT_ACCESS_TOKEN_DURATION = 3600;

/** Auth state cookie duration: 10 minutes (for PKCE flow) */
const AUTH_STATE_DURATION_SECONDS = 60 * 10;

/** Grove platform domain for cross-subdomain cookies */
const GROVE_PLATFORM_DOMAIN = ".grove.place";

// ============================================================================
// Auth Configuration
// ============================================================================

interface AuthConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Get typed auth configuration from platform environment
 * Provides consistent defaults and type safety for auth-related env vars
 */
function getAuthConfig(platform: App.Platform | undefined): AuthConfig {
  return {
    // API URL for token/userinfo endpoints (may differ from user-facing login URL)
    apiUrl:
      platform?.env?.GROVEAUTH_API_URL ||
      platform?.env?.GROVEAUTH_URL ||
      "https://auth-api.grove.place",
    clientId: platform?.env?.GROVEAUTH_CLIENT_ID || "groveengine",
    clientSecret: platform?.env?.GROVEAUTH_CLIENT_SECRET || "",
  };
}

// ============================================================================
// Types
// ============================================================================

/**
 * OAuth token response from GroveAuth
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * OAuth error response from GroveAuth
 */
interface ErrorResponse {
  error?: string;
  error_description?: string;
}

/**
 * User info response from GroveAuth /userinfo endpoint
 *
 * Note: We trust this response because it comes directly from our auth server
 * over HTTPS. Runtime validation is omitted for performance.
 */
interface UserInfoResponse {
  sub: string; // GroveAuth user ID
  email: string; // User's email
  name?: string; // Display name
  picture?: string; // Avatar URL
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract username from email for display name fallback
 * Handles common email separators (., _, -) and capitalizes each word
 *
 * @example
 * john.smith@example.com → "John Smith"
 * john_doe@example.com → "John Doe"
 * jane-doe@example.com → "Jane Doe"
 */
function getDisplayNameFromEmail(email: string): string {
  const username = email.split("@")[0];
  // Split on common separators and capitalize each word
  return username
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  invalid_grant: "Login session expired, please try again",
  server_error: "Authentication service unavailable, please try later",
  invalid_state: "Login session expired, please try again",
  missing_verifier: "Login session expired, please try again",
  missing_code: "Login was not completed, please try again",
  token_exchange_failed: "Unable to complete login, please try again",
};

function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

export const GET: RequestHandler = async ({
  url,
  cookies,
  platform,
  request,
}) => {
  // ============================================================================
  // Rate Limiting (Threshold pattern)
  // Protects against brute force attacks on auth callback
  // ============================================================================
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

    // Return 429 if rate limited
    if (rateLimitResponse) {
      console.warn("[Auth Callback] Rate limited:", { ip: clientIp });
      return rateLimitResponse;
    }
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Check for error from GroveAuth
  if (errorParam) {
    console.error("[Auth Callback] Error from GroveAuth:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(errorParam);
    redirect(302, `/auth/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Validate state (CSRF protection)
  const savedState = cookies.get("auth_state");
  if (!state || state !== savedState) {
    console.error("[Auth Callback] State mismatch - CSRF check failed");
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("invalid_state"))}`,
    );
  }

  // Get code verifier (PKCE)
  const codeVerifier = cookies.get("auth_code_verifier");
  if (!codeVerifier) {
    console.error("[Auth Callback] Missing code verifier");
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("missing_verifier"))}`,
    );
  }

  if (!code) {
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("missing_code"))}`,
    );
  }

  // Get return URL
  const returnTo = cookies.get("auth_return_to") || "/admin";

  // Clear auth cookies immediately
  cookies.delete("auth_state", { path: "/" });
  cookies.delete("auth_code_verifier", { path: "/" });
  cookies.delete("auth_return_to", { path: "/" });

  try {
    // Get typed auth configuration
    const authConfig = getAuthConfig(platform);
    const redirectUri = `${url.origin}/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${authConfig.apiUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json()) as ErrorResponse;
      // Only log sensitive debugging info in development
      console.error("[Auth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        error: errorData?.error,
        // Include detailed debugging info only in development
        ...(import.meta.env.DEV && {
          authApiUrl: authConfig.apiUrl,
          clientId: authConfig.clientId,
          hasSecret: !!authConfig.clientSecret,
          redirectUri,
          errorDescription: errorData?.error_description,
        }),
      });
      const debugError =
        errorData?.error_description ||
        errorData?.error ||
        "token_exchange_failed";
      redirect(302, `/auth/login?error=${encodeURIComponent(debugError)}`);
    }

    const tokens = (await tokenResponse.json()) as TokenResponse;

    // Fetch user info from GroveAuth
    let userInfo: UserInfoResponse | null = null;
    try {
      const userInfoResponse = await fetch(`${authConfig.apiUrl}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        userInfo = (await userInfoResponse.json()) as UserInfoResponse;
      } else {
        console.warn("[Auth Callback] Failed to fetch user info:", {
          status: userInfoResponse.status,
          authApiUrl: authConfig.apiUrl,
        });
      }
    } catch (userInfoErr) {
      console.warn("[Auth Callback] Error fetching user info:", {
        error:
          userInfoErr instanceof Error ? userInfoErr.message : "Unknown error",
        authApiUrl: authConfig.apiUrl,
      });
    }

    // Upsert user into D1 if we have user info and database access
    // Note: Auth succeeds even if DB insert fails - user can still proceed.
    // The ON CONFLICT clause handles race conditions where multiple requests
    // try to create the same user simultaneously.
    if (userInfo && platform?.env?.DB) {
      try {
        const userId = crypto.randomUUID();
        // Use display name from GroveAuth, or fall back to email username for better UX
        const displayName =
          userInfo.name || getDisplayNameFromEmail(userInfo.email);

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
            userInfo.sub,
            userInfo.email,
            displayName,
            userInfo.picture || null,
          )
          .run();

        console.log("[Auth Callback] User upserted:", userInfo.sub);
      } catch (dbErr) {
        // Log with structured data for debugging, but don't fail auth
        // User can still proceed - they'll be created on next login
        console.error("[Auth Callback] Failed to upsert user:", {
          error: dbErr instanceof Error ? dbErr.message : "Unknown error",
          groveauth_id: userInfo.sub,
        });
      }
    }

    // Determine if we're in production
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    // Only set cross-subdomain cookie if we're actually on grove.place
    // This prevents issues on staging, test, or other deployments
    const isGrovePlatform = url.hostname.endsWith("grove.place");
    const cookieDomain =
      isProduction && isGrovePlatform ? GROVE_PLATFORM_DOMAIN : undefined;

    // Set cookies - use .grove.place domain for cross-subdomain access on platform
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    // Set access token (used for API calls and session verification)
    cookies.set("access_token", tokens.access_token, {
      ...cookieOptions,
      maxAge: tokens.expires_in || DEFAULT_ACCESS_TOKEN_DURATION,
    });

    // Set refresh token if provided
    if (tokens.refresh_token) {
      cookies.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: SESSION_DURATION_SECONDS,
      });
    }

    // Set session identifier cookie
    const sessionId = crypto.randomUUID();
    cookies.set("session", sessionId, {
      ...cookieOptions,
      maxAge: SESSION_DURATION_SECONDS,
    });

    // Redirect to the requested destination
    redirect(302, returnTo);
  } catch (err) {
    // Re-throw redirects
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 302
    ) {
      throw err;
    }
    console.error("[Auth Callback] Error:", err);
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("token_exchange_failed"))}`,
    );
  }
};
