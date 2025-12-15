/**
 * OAuth Callback - Handle Heartwood OAuth response
 *
 * Exchanges authorization code for tokens, fetches user info,
 * creates/updates user_onboarding record, and redirects to profile.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
	access_denied: 'You cancelled the login process',
	invalid_grant: 'Login session expired, please try again',
	server_error: 'Authentication service unavailable, please try later',
	invalid_state: 'Login session expired, please try again',
	missing_verifier: 'Login session expired, please try again',
	missing_code: 'Login was not completed, please try again',
	token_exchange_failed: 'Unable to complete login, please try again',
	userinfo_failed: 'Unable to fetch your profile, please try again'
};

function getFriendlyErrorMessage(errorCode: string): string {
	return ERROR_MESSAGES[errorCode] || 'An error occurred during login';
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');

	// Check for error from GroveAuth
	if (errorParam) {
		console.error('[Auth Callback] Error from GroveAuth:', errorParam);
		const friendlyMessage = getFriendlyErrorMessage(errorParam);
		redirect(302, `/?error=${encodeURIComponent(friendlyMessage)}`);
	}

	// Validate state (CSRF protection)
	const savedState = cookies.get('auth_state');
	if (!state || state !== savedState) {
		console.error('[Auth Callback] State mismatch - CSRF check failed');
		redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('invalid_state'))}`);
	}

	// Get code verifier (PKCE)
	const codeVerifier = cookies.get('auth_code_verifier');
	if (!codeVerifier) {
		console.error('[Auth Callback] Missing code verifier');
		redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('missing_verifier'))}`);
	}

	if (!code) {
		redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('missing_code'))}`);
	}

	// Clear auth cookies immediately
	cookies.delete('auth_state', { path: '/' });
	cookies.delete('auth_code_verifier', { path: '/' });

	// Get configuration
	const authBaseUrl = platform?.env?.GROVEAUTH_URL || 'https://auth-api.grove.place';
	const clientId = platform?.env?.GROVEAUTH_CLIENT_ID || 'grove-plant';
	const clientSecret = platform?.env?.GROVEAUTH_CLIENT_SECRET || '';
	const redirectUri = `${url.origin}/auth/callback`;
	const db = platform?.env?.DB;

	if (!db) {
		console.error('[Auth Callback] Database not available');
		redirect(302, `/?error=${encodeURIComponent('Service temporarily unavailable')}`);
	}

	try {
		// Exchange code for tokens
		const tokenResponse = await fetch(`${authBaseUrl}/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
				client_id: clientId,
				client_secret: clientSecret,
				code_verifier: codeVerifier
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json().catch(() => ({}));
			console.error('[Auth Callback] Token exchange failed:', {
				status: tokenResponse.status,
				error: errorData
			});
			redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('token_exchange_failed'))}`);
		}

		const tokens = await tokenResponse.json();

		// Fetch user info from GroveAuth
		const userinfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`
			}
		});

		if (!userinfoResponse.ok) {
			console.error('[Auth Callback] Userinfo fetch failed:', userinfoResponse.status);
			redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('userinfo_failed'))}`);
		}

		const userinfo = await userinfoResponse.json();
		const groveauthId = userinfo.sub || userinfo.id;
		const email = userinfo.email;
		const name = userinfo.name || userinfo.display_name;

		if (!groveauthId || !email) {
			console.error('[Auth Callback] Missing user info:', { groveauthId, email });
			redirect(302, `/?error=${encodeURIComponent('Unable to fetch your profile')}`);
		}

		// Check if user already has an onboarding record
		const existingOnboarding = await db
			.prepare('SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?')
			.bind(groveauthId)
			.first();

		let onboardingId: string;

		if (existingOnboarding) {
			// User already started onboarding
			onboardingId = existingOnboarding.id as string;

			// Update auth timestamp
			await db
				.prepare('UPDATE user_onboarding SET auth_completed_at = unixepoch(), updated_at = unixepoch() WHERE id = ?')
				.bind(onboardingId)
				.run();

			// If they already have a tenant, redirect to their blog
			if (existingOnboarding.tenant_id) {
				// Get their subdomain
				const tenant = await db
					.prepare('SELECT subdomain FROM tenants WHERE id = ?')
					.bind(existingOnboarding.tenant_id)
					.first();

				if (tenant) {
					redirect(302, `https://${tenant.subdomain}.grove.place/admin`);
				}
			}
		} else {
			// Create new onboarding record
			onboardingId = crypto.randomUUID();

			await db
				.prepare(
					`INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
					 VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`
				)
				.bind(onboardingId, groveauthId, email, name || null)
				.run();
		}

		// Set cookies
		const isProduction = url.hostname !== 'localhost' && url.hostname !== '127.0.0.1';

		const cookieOptions = {
			path: '/',
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax' as const,
			maxAge: 60 * 60 * 24 * 7 // 7 days
		};

		// Store onboarding ID
		cookies.set('onboarding_id', onboardingId, cookieOptions);

		// Store access token for authenticated requests
		cookies.set('access_token', tokens.access_token, {
			...cookieOptions,
			maxAge: tokens.expires_in || 3600
		});

		// Store refresh token if provided
		if (tokens.refresh_token) {
			cookies.set('refresh_token', tokens.refresh_token, {
				...cookieOptions,
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});
		}

		// Redirect to profile page (or plans if profile already done)
		if (existingOnboarding?.profile_completed_at) {
			redirect(302, '/plans');
		} else {
			redirect(302, '/profile');
		}
	} catch (err) {
		// Re-throw redirects
		if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
			throw err;
		}
		console.error('[Auth Callback] Error:', err);
		redirect(302, `/?error=${encodeURIComponent(getFriendlyErrorMessage('token_exchange_failed'))}`);
	}
};
