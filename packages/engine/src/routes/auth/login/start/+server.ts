/**
 * OAuth Login Start - Initiate authentication flow via Heartwood (GroveAuth)
 *
 * This route exists separately from the login page to avoid SvelteKit's
 * routing conflict where +page.svelte takes precedence over +server.ts
 * for GET requests to the same path.
 *
 * Flow: /auth/login (page) -> /auth/login/start (this) -> GroveAuth -> /auth/callback
 *
 * URL Configuration:
 * - GROVEAUTH_URL: User-facing login page (e.g., https://auth.grove.place)
 * - GROVEAUTH_API_URL: API endpoints for token/userinfo (used in callback)
 * These may be different domains. This route uses GROVEAUTH_URL for the redirect.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  checkRateLimit,
  buildRateLimitKey,
  getClientIP,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits";

/**
 * Generate a cryptographically secure random string for PKCE
 */
function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(
    randomValues,
    (byte) => charset[byte % charset.length],
  ).join("");
}

/**
 * Generate a code challenge from a code verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // URL-safe base64
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const GET: RequestHandler = async ({
  url,
  cookies,
  platform,
  request,
}) => {
  // ============================================================================
  // Rate Limiting (Threshold pattern)
  // Protects against automated login attempts
  // ============================================================================
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const clientIp = getClientIP(request);
    const limitConfig = getEndpointLimitByKey("auth/login");
    const rateLimitKey = buildRateLimitKey("auth/login", clientIp);

    const { response: rateLimitResponse } = await checkRateLimit({
      kv,
      key: rateLimitKey,
      limit: limitConfig.limit,
      windowSeconds: limitConfig.windowSeconds,
      namespace: "auth-ratelimit",
    });

    // Return 429 if rate limited
    if (rateLimitResponse) {
      console.warn("[Auth Login] Rate limited:", { ip: clientIp });
      return rateLimitResponse;
    }
  }

  const authBaseUrl =
    platform?.env?.GROVEAUTH_URL || "https://auth.grove.place";
  const clientId = platform?.env?.GROVEAUTH_CLIENT_ID || "groveengine";
  const redirectUri = `${url.origin}/auth/callback`;

  // Return to admin panel after login, or use provided return_to
  const returnTo = url.searchParams.get("return_to") || "/admin";

  // Generate PKCE values
  const state = crypto.randomUUID();
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Determine if we're in production
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

  // Cookie options - in production, set for the specific subdomain
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes
  };

  // Store state for CSRF verification
  cookies.set("auth_state", state, cookieOptions);

  // Store code verifier for PKCE
  cookies.set("auth_code_verifier", codeVerifier, cookieOptions);

  // Store return URL
  cookies.set("auth_return_to", returnTo, cookieOptions);

  // Build GroveAuth login URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  redirect(302, `${authBaseUrl}/login?${params}`);
};
