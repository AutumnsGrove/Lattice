/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements RFC 7636 PKCE for secure OAuth 2.0 authorization flows.
 * PKCE protects against authorization code interception attacks.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

import type { PKCEValues } from "../types.js";

/**
 * Characters allowed in the code verifier per RFC 7636.
 * Uses unreserved URI characters: A-Z a-z 0-9 - . _ ~
 */
const CODE_VERIFIER_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Default length for the code verifier (64 characters).
 * RFC 7636 allows 43-128 characters; 64 is a good balance.
 */
const DEFAULT_VERIFIER_LENGTH = 64;

/**
 * Generate a cryptographically secure random string for PKCE.
 *
 * @param length - Length of the string to generate (43-128 per RFC 7636)
 * @returns A random string suitable for use as a code verifier
 */
export function generateRandomString(
  length: number = DEFAULT_VERIFIER_LENGTH,
): string {
  if (length < 43 || length > 128) {
    throw new Error(
      "Code verifier length must be between 43 and 128 characters",
    );
  }

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    (byte) => CODE_VERIFIER_CHARSET[byte % CODE_VERIFIER_CHARSET.length],
  ).join("");
}

/**
 * Generate a code challenge from a code verifier using SHA-256.
 *
 * The code challenge is the base64url-encoded SHA-256 hash of the verifier.
 * This is sent during authorization; the original verifier is sent during
 * token exchange to prove the same client initiated both requests.
 *
 * @param verifier - The code verifier string
 * @returns Base64url-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

  // Convert base64 to base64url (RFC 4648 Section 5)
  // Replace + with -, / with _, and remove trailing =
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate both PKCE values (code verifier and challenge).
 *
 * Use this function to generate a fresh PKCE pair for each OAuth flow.
 * Store the verifier securely (e.g., in an HTTP-only cookie) and send
 * the challenge with the authorization request.
 *
 * @param verifierLength - Optional length for the code verifier (default: 64)
 * @returns Object containing codeVerifier and codeChallenge
 *
 * @example
 * ```typescript
 * const { codeVerifier, codeChallenge } = await generatePKCE();
 *
 * // Store verifier in cookie
 * cookies.set('auth_code_verifier', codeVerifier, { httpOnly: true });
 *
 * // Send challenge with auth request
 * const authUrl = `${baseUrl}/authorize?code_challenge=${codeChallenge}&code_challenge_method=S256`;
 * ```
 */
export async function generatePKCE(
  verifierLength: number = DEFAULT_VERIFIER_LENGTH,
): Promise<PKCEValues> {
  const codeVerifier = generateRandomString(verifierLength);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  return { codeVerifier, codeChallenge };
}

/**
 * Generate a random state value for CSRF protection.
 *
 * The state parameter prevents cross-site request forgery by ensuring
 * the authorization response matches the request from this client.
 *
 * @returns A UUID v4 string suitable for use as OAuth state
 */
export function generateState(): string {
  return crypto.randomUUID();
}
