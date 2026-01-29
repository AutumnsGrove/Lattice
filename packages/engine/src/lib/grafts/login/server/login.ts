/**
 * Login Handler Factory
 *
 * Creates a SvelteKit request handler for initiating OAuth login flows.
 * Generates PKCE values, stores state in cookies, and redirects to GroveAuth.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler, RequestEvent } from "@sveltejs/kit";
import type { LoginHandlerConfig, AuthProvider } from "../types.js";
import { generatePKCE, generateState } from "./pkce.js";
import { getRealOrigin, isProduction } from "./origin.js";
import {
  AUTH_COOKIE_NAMES,
  AUTH_COOKIE_OPTIONS,
  GROVEAUTH_URLS,
} from "../config.js";

/**
 * Set authentication cookies for the OAuth flow.
 *
 * Stores state, code verifier, and return URL in HTTP-only cookies
 * for retrieval during the callback phase.
 *
 * Note: The `secure` flag is set dynamically based on environment to allow
 * localhost development (HTTP) while enforcing HTTPS in production.
 */
function setAuthCookies(
  cookies: RequestEvent["cookies"],
  values: { state: string; codeVerifier: string; returnTo: string },
  url: URL,
): void {
  // Dynamically set secure flag - false for localhost, true for production
  const cookieOptions = {
    ...AUTH_COOKIE_OPTIONS.temporary,
    secure: isProduction(url),
  };

  cookies.set(AUTH_COOKIE_NAMES.state, values.state, cookieOptions);
  cookies.set(
    AUTH_COOKIE_NAMES.codeVerifier,
    values.codeVerifier,
    cookieOptions,
  );
  cookies.set(AUTH_COOKIE_NAMES.returnTo, values.returnTo, cookieOptions);
}

/**
 * Build the GroveAuth authorization URL with all required parameters.
 */
function buildAuthUrl(
  baseUrl: string,
  params: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    provider?: AuthProvider;
  },
): string {
  const url = new URL("/login", baseUrl);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (params.provider) {
    url.searchParams.set("provider", params.provider);
  }
  return url.toString();
}

/**
 * Create a login handler for OAuth authentication.
 *
 * This factory creates a SvelteKit GET handler that:
 * 1. Generates PKCE values for secure token exchange
 * 2. Stores auth state in HTTP-only cookies
 * 3. Redirects to GroveAuth with the authorization request
 *
 * @param config - Configuration for the login handler
 * @returns A SvelteKit RequestHandler
 *
 * @example
 * ```typescript
 * // In routes/auth/login/+server.ts
 * import { createLoginHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createLoginHandler({
 *   clientId: 'my-app',
 *   authUrl: 'https://auth.grove.place',
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 */
export function createLoginHandler(config: LoginHandlerConfig): RequestHandler {
  const {
    clientId,
    authUrl = GROVEAUTH_URLS.auth,
    defaultProvider = "google",
    defaultReturnTo = "/admin",
  } = config;

  return async ({ url, cookies, request }): Promise<never> => {
    // Get provider from query params (optional)
    const provider =
      (url.searchParams.get("provider") as AuthProvider | null) ||
      defaultProvider;

    // Get return URL from query params or use default
    // Security: Validate returnTo is a safe relative path to prevent open redirect attacks
    const requestedReturnTo = url.searchParams.get("return_to");
    let returnTo = defaultReturnTo;

    if (requestedReturnTo) {
      // Must start with "/" (relative path) but not "//" (protocol-relative URL)
      // Also block paths that could be interpreted as URLs (e.g., "/\evil.com")
      const isSafeRelativePath =
        requestedReturnTo.startsWith("/") &&
        !requestedReturnTo.startsWith("//") &&
        !requestedReturnTo.startsWith("/\\");

      if (isSafeRelativePath) {
        returnTo = requestedReturnTo;
      } else {
        console.warn(
          "[LoginGraft] Blocked potentially malicious return_to:",
          requestedReturnTo,
        );
      }
    }

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    // Store in cookies for the callback handler
    setAuthCookies(cookies, { state, codeVerifier, returnTo }, url);

    // Build the redirect URI for the callback
    const redirectUri = `${getRealOrigin(request, url)}/auth/callback`;

    // Build and redirect to GroveAuth
    const authorizationUrl = buildAuthUrl(authUrl, {
      clientId,
      redirectUri,
      state,
      codeChallenge,
      provider,
    });

    redirect(302, authorizationUrl);
  };
}
