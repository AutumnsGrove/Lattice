/**
 * OAuth Login - Start authentication flow via GroveAuth
 *
 * Redirects to GroveAuth with PKCE for secure authentication.
 * After auth, user returns to /auth/callback which sets cross-subdomain cookies.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getRealOrigin } from "$lib/server/origin";

/**
 * Generate a cryptographically secure random string
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
  const authBaseUrl =
    platform?.env?.GROVEAUTH_URL || "https://auth.grove.place";
  const clientId = platform?.env?.GROVEAUTH_CLIENT_ID || "groveengine";
  const redirectUri = `${getRealOrigin(request, url)}/auth/callback`;

  // Check for return_to parameter
  const returnTo =
    url.searchParams.get("return_to") || "https://admin.grove.place";

  // Generate PKCE values
  const state = crypto.randomUUID();
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store state, code verifier, and return URL in cookies
  cookies.set("auth_state", state, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  cookies.set("auth_code_verifier", codeVerifier, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  cookies.set("auth_return_to", returnTo, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  // Build GroveAuth login URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  throw redirect(302, `${authBaseUrl}/login?${params}`);
};
