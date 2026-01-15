/**
 * OAuth Initiation - Start Heartwood OAuth flow
 *
 * Redirects to GroveAuth with PKCE parameters.
 * Supports providers: google (others coming post-launch)
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Generate a random string for PKCE and state
 */
function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues, (v) => charset[v % charset.length]).join("");
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateRandomString(64);

  // Create SHA-256 hash of verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Base64url encode the hash
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { verifier, challenge };
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  // Check if signups are enabled (gate for Lemon Squeezy verification)
  const env = platform?.env as Record<string, string> | undefined;
  const signupsEnabled = env?.SIGNUPS_ENABLED === "true";

  if (!signupsEnabled) {
    // Redirect back to homepage with a friendly message
    redirect(302, "/?notice=coming_soon");
  }

  const provider = url.searchParams.get("provider") || "google";
  // Only Google for launch - Discord, Email, Passkey coming post-launch
  const validProviders = ["google"];

  if (!validProviders.includes(provider)) {
    redirect(302, "/?error=invalid_provider");
  }

  // Get GroveAuth configuration (env already defined above for signup gate check)
  const authBaseUrl = env?.GROVEAUTH_URL || "https://auth-api.grove.place";
  const clientId = env?.GROVEAUTH_CLIENT_ID || "grove-plant";
  // Use canonical URL to avoid cookie domain mismatch between pages.dev and custom domain
  const appBaseUrl = env?.PUBLIC_APP_URL || "https://plant.grove.place";
  const redirectUri = `${appBaseUrl}/auth/callback`;

  // Generate PKCE values
  const { verifier, challenge } = await generatePKCE();

  // Generate state for CSRF protection
  const state = generateRandomString(32);

  // Store PKCE and state in cookies (httpOnly for security)
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutes
  };

  cookies.set("auth_state", state, cookieOptions);
  cookies.set("auth_code_verifier", verifier, cookieOptions);

  // Build authorization URL (GroveAuth uses /login as the authorization endpoint)
  const authUrl = new URL(`${authBaseUrl}/login`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // Add provider hint if not default
  if (provider !== "google") {
    authUrl.searchParams.set("provider", provider);
  }

  // Redirect to GroveAuth
  redirect(302, authUrl.toString());
};
