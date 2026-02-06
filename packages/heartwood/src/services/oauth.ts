/**
 * OAuth Service - OAuth provider helpers
 */

import type { Env, GoogleTokenResponse, GoogleUserInfo } from "../types.js";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  GOOGLE_SCOPES,
} from "../utils/constants.js";

// ==================== Google OAuth ====================

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(
  env: Env,
  state: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCode(
  env: Env,
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      console.error("Google token exchange failed:", await response.text());
      return null;
    }

    return (await response.json()) as GoogleTokenResponse;
  } catch (error) {
    console.error("Google token exchange error:", error);
    return null;
  }
}

/**
 * Get Google user info using access token
 */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Google userinfo failed:", await response.text());
      return null;
    }

    return (await response.json()) as GoogleUserInfo;
  } catch (error) {
    console.error("Google userinfo error:", error);
    return null;
  }
}
