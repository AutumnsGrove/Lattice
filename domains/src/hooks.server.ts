import type { Handle } from '@sveltejs/kit';
import { getUserById, getSession, updateSessionTokens } from '$lib/server/db';

/**
 * Environment variables required for core functionality.
 * Validated on first request to fail fast if misconfigured.
 */
const REQUIRED_ENV_VARS = ['DB'] as const;
const GROVEAUTH_ENV_VARS = ['GROVEAUTH_CLIENT_ID', 'GROVEAUTH_CLIENT_SECRET'] as const;

let envValidated = false;

function validateEnvironment(env: Record<string, unknown>): void {
	if (envValidated) return;

	const missing: string[] = [];

	for (const varName of REQUIRED_ENV_VARS) {
		if (!env[varName]) {
			missing.push(varName);
		}
	}

	// GroveAuth vars are only required if we're using GroveAuth
	// (they're optional for magic code auth fallback)
	const hasGroveAuth = GROVEAUTH_ENV_VARS.every((v) => !!env[v]);
	if (!hasGroveAuth) {
		console.warn(
			'[Env Check] GroveAuth environment variables not fully configured. ' +
				'GroveAuth login will not work. Missing: ' +
				GROVEAUTH_ENV_VARS.filter((v) => !env[v]).join(', ')
		);
	}

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	envValidated = true;
}

/**
 * Check if token is expired or about to expire (within 60 seconds)
 */
function isTokenExpiringSoon(expiresAt: string | null): boolean {
	if (!expiresAt) return true;
	const expiresTime = new Date(expiresAt).getTime();
	const bufferMs = 60 * 1000; // 60 seconds
	return Date.now() >= expiresTime - bufferMs;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Validate environment on first request
	if (event.platform?.env) {
		try {
			validateEnvironment(event.platform.env as Record<string, unknown>);
		} catch (error) {
			console.error('[Env Validation Error]', error);
			// In production, we might want to return a 500 error page
			// For now, continue with degraded functionality
		}
	}

	// Initialize user as null
	event.locals.user = null;

	// Check for session cookie
	const sessionId = event.cookies.get('session');
	if (!sessionId || !event.platform?.env?.DB) {
		return resolve(event);
	}

	try {
		const db = event.platform.env.DB;

		// Get session with token information
		const session = await getSession(db, sessionId);

		if (!session) {
			// Clear invalid session cookie
			event.cookies.delete('session', { path: '/' });
			return resolve(event);
		}

		// Check if access token needs refresh
		if (
			session.access_token &&
			session.refresh_token &&
			isTokenExpiringSoon(session.token_expires_at)
		) {
			// Token is expiring soon, try to refresh it
			try {
				const authBaseUrl = event.platform.env.GROVEAUTH_URL || 'https://auth.grove.place';
				const clientId = event.platform.env.GROVEAUTH_CLIENT_ID;
				const clientSecret = event.platform.env.GROVEAUTH_CLIENT_SECRET;

				if (clientId && clientSecret) {
					const response = await fetch(`${authBaseUrl}/token/refresh`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						body: new URLSearchParams({
							grant_type: 'refresh_token',
							refresh_token: session.refresh_token,
							client_id: clientId,
							client_secret: clientSecret,
						}),
					});

					if (response.ok) {
						const tokens = await response.json();
						await updateSessionTokens(db, sessionId, {
							accessToken: tokens.access_token,
							refreshToken: tokens.refresh_token,
							expiresIn: tokens.expires_in,
						});
						console.log('[Auth Hook] Token refreshed successfully');
					} else {
						console.warn('[Auth Hook] Token refresh failed, user may need to re-login');
					}
				}
			} catch (refreshError) {
				console.error('[Auth Hook] Token refresh error:', refreshError);
				// Continue with possibly stale token - next request will retry
			}
		}

		// Get user
		const user = await getUserById(db, session.user_id);

		if (user) {
			event.locals.user = {
				id: user.id,
				email: user.email,
				is_admin: user.is_admin,
			};
		}
	} catch (error) {
		console.error('[Auth Hook Error]', error);
	}

	return resolve(event);
};
