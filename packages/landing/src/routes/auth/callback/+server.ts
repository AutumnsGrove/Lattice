/**
 * OAuth Callback - Handle GroveAuth authentication response
 *
 * Exchanges the authorization code for tokens and sets cross-subdomain cookies
 * so that admin.grove.place and other *.grove.place sites can access the session.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getRealOrigin } from "$lib/server/origin";

/**
 * Get client IP from request headers (Cloudflare provides CF-Connecting-IP)
 */
function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Simple KV-based rate limiting for auth endpoints
 * Returns true if rate limited, false if allowed
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
  } catch {
    // On error, allow the request (fail open for auth)
    return false;
  }
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
  // Server-side rate limiting to prevent brute force attacks
  const kv = platform?.env?.CACHE_KV;
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
          message: "Too many login attempts. Please wait before trying again.",
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

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Check for error from GroveAuth
  if (errorParam) {
    console.error("[Auth Callback] Error:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(errorParam);
    throw redirect(302, `/?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Validate state (CSRF protection)
  const savedState = cookies.get("auth_state");
  if (!state || state !== savedState) {
    console.error("[Auth Callback] State mismatch");
    throw redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("invalid_state"))}`,
    );
  }

  // Get code verifier (PKCE)
  const codeVerifier = cookies.get("auth_code_verifier");
  if (!codeVerifier) {
    console.error("[Auth Callback] Missing code verifier");
    throw redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("missing_verifier"))}`,
    );
  }

  if (!code) {
    throw redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("missing_code"))}`,
    );
  }

  // Get return URL
  const returnTo = cookies.get("auth_return_to") || "https://admin.grove.place";

  // Clear auth cookies with proper attributes
  cookies.delete("auth_state", { path: "/", httpOnly: true, secure: true });
  cookies.delete("auth_code_verifier", {
    path: "/",
    httpOnly: true,
    secure: true,
  });
  cookies.delete("auth_return_to", { path: "/", httpOnly: true, secure: true });

  try {
    const authBaseUrl =
      platform?.env?.GROVEAUTH_URL || "https://auth-api.grove.place";
    const clientId = platform?.env?.GROVEAUTH_CLIENT_ID || "groveengine";
    const clientSecret = platform?.env?.GROVEAUTH_CLIENT_SECRET || "";
    const redirectUri = `${getRealOrigin(request, url)}/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${authBaseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json()) as
        | Record<string, unknown>
        | unknown;
      // Only log detailed debugging info in development
      console.error("[Auth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        error:
          typeof errorData === "object" && errorData !== null
            ? (errorData as Record<string, unknown>)?.error
            : "unknown",
        // Include detailed config only in development to avoid leaking in production logs
        ...(import.meta.env.DEV && {
          authBaseUrl,
          clientId,
          hasSecret: !!clientSecret,
          redirectUri,
        }),
      });
      // Include API error for debugging (temporarily)
      const debugError =
        typeof errorData === "object" && errorData !== null
          ? ((errorData as Record<string, unknown>)?.error_description as
              | string
              | undefined) ||
            ((errorData as Record<string, unknown>)?.error as
              | string
              | undefined) ||
            "token_exchange_failed"
          : "token_exchange_failed";
      throw redirect(302, `/?error=${encodeURIComponent(debugError)}`);
    }

    const tokens = (await tokenResponse.json()) as Record<string, unknown>;

    // Determine if we're in production
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    // Only set cross-subdomain cookie if we're actually on grove.place
    // This prevents issues on staging, test, or other deployments
    const isGrovePlatform = url.hostname.endsWith("grove.place");
    const cookieDomain =
      isProduction && isGrovePlatform ? ".grove.place" : undefined;

    // Set cookies with domain=.grove.place for cross-subdomain access
    // This allows admin.grove.place to read these cookies
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    // Set access token (used for API calls)
    const accessToken = tokens.access_token as string | undefined;
    const expiresIn = tokens.expires_in as number | undefined;
    const refreshToken = tokens.refresh_token as string | undefined;

    if (accessToken) {
      cookies.set("access_token", accessToken, {
        ...cookieOptions,
        maxAge: expiresIn || 3600,
      });
    }

    // Set refresh token if provided
    if (refreshToken) {
      cookies.set("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Set session cookie - generate a simple session identifier
    // This is used by GroveAuth frontend to check if user is logged in
    const sessionId = crypto.randomUUID();
    cookies.set("session", sessionId, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to the requested destination
    throw redirect(302, returnTo);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      err.status === 302
    ) {
      throw err; // Re-throw redirects
    }
    console.error("[Auth Callback] Error:", err);
    throw redirect(
      302,
      `/?error=${encodeURIComponent(getFriendlyErrorMessage("token_exchange_failed"))}`,
    );
  }
};
