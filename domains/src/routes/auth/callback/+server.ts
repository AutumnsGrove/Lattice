/**
 * GroveAuth OAuth Callback Handler
 *
 * Handles the callback from GroveAuth after user authentication.
 * Exchanges the authorization code for tokens and creates a local session.
 *
 * SECURITY NOTE: This is a +server.ts file which runs server-side only in SvelteKit.
 * Client secrets accessed here are never exposed to the browser.
 * Secrets should be set via: wrangler secret put GROVEAUTH_CLIENT_SECRET
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, getOrCreateUser } from '$lib/server/db';

/**
 * Map GroveAuth error codes to user-friendly messages.
 * Raw error descriptions from OAuth providers may leak implementation details.
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the login process',
  invalid_grant: 'Login session expired, please try again',
  server_error: 'Authentication service unavailable, please try later',
  temporarily_unavailable: 'Authentication service is temporarily unavailable',
  invalid_request: 'There was a problem with the login request',
  unauthorized_client: 'This application is not authorized',
  invalid_scope: 'Invalid permissions requested',
  invalid_state: 'Login session expired, please try again',
  missing_verifier: 'Login session expired, please try again',
  missing_code: 'Login was not completed, please try again',
  token_exchange_failed: 'Unable to complete login, please try again',
  userinfo_failed: 'Unable to retrieve your account information',
  callback_failed: 'An error occurred during login, please try again',
};

/**
 * Get a user-friendly error message for an OAuth error code.
 */
function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || 'An error occurred during login';
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, 'Database not available');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // Check for error from GroveAuth
  if (errorParam) {
    console.error('[GroveAuth Callback] Error:', errorParam);
    const friendlyMessage = getFriendlyErrorMessage(errorParam);
    throw redirect(302, `/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Validate state (CSRF protection)
  const savedState = cookies.get('auth_state');
  if (!state || state !== savedState) {
    console.error('[GroveAuth Callback] State mismatch');
    throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('invalid_state'))}`);
  }

  // Get code verifier (PKCE)
  const codeVerifier = cookies.get('auth_code_verifier');
  if (!codeVerifier) {
    console.error('[GroveAuth Callback] Missing code verifier');
    throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('missing_verifier'))}`);
  }

  if (!code) {
    throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('missing_code'))}`);
  }

  // Clear auth cookies
  cookies.delete('auth_state', { path: '/' });
  cookies.delete('auth_code_verifier', { path: '/' });

  try {
    const { DB, GROVEAUTH_CLIENT_ID, GROVEAUTH_CLIENT_SECRET, GROVEAUTH_REDIRECT_URI } = platform.env;
    const authBaseUrl = platform.env.GROVEAUTH_URL || 'https://auth.grove.place';

    // Build redirect URI - URLSearchParams handles encoding automatically
    const redirectUri = GROVEAUTH_REDIRECT_URI || `${url.origin}/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: GROVEAUTH_CLIENT_ID || 'domains',
        client_secret: GROVEAUTH_CLIENT_SECRET || '',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[GroveAuth Callback] Token exchange failed:', errorData);
      // Use friendly message, don't expose raw error_description to users
      throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('token_exchange_failed'))}`);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[GroveAuth Callback] Failed to get user info');
      throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('userinfo_failed'))}`);
    }

    const userInfo = await userInfoResponse.json();

    // Create or get user in local DB
    const user = await getOrCreateUser(DB, userInfo.email);

    // Create local session with tokens stored in D1 (not cookies)
    // This is more secure for Cloudflare Workers as tokens aren't sent with every request
    const session = await createSession(DB, user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // Only store session ID in cookie - tokens stay in D1
    cookies.set('session', session.id, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to admin
    throw redirect(302, '/admin');
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
      throw err; // Re-throw redirects
    }
    console.error('[GroveAuth Callback] Error:', err);
    throw redirect(302, `/login?error=${encodeURIComponent(getFriendlyErrorMessage('callback_failed'))}`);
  }
};
