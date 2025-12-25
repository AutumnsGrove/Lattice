/**
 * Turnstile Verification Endpoint (Shade)
 *
 * POST /api/verify/turnstile
 *
 * Validates a Turnstile token and sets a verification cookie.
 * Cookie lasts 7 days, shared across all *.grove.place subdomains.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	verifyTurnstileToken,
	createVerificationCookie,
	getVerificationCookieOptions,
	TURNSTILE_COOKIE_NAME
} from '$lib/server/services/turnstile';

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	// Get the token from the request body
	let token: string;

	try {
		const body = await request.json();
		token = body.token;
	} catch {
		throw error(400, 'Invalid request body');
	}

	if (!token) {
		throw error(400, 'Missing Turnstile token');
	}

	// Get the secret key from environment
	const secretKey = platform?.env?.TURNSTILE_SECRET_KEY;

	if (!secretKey) {
		console.error('Turnstile: TURNSTILE_SECRET_KEY not configured');
		throw error(500, 'Verification service not configured');
	}

	// Get the user's IP for additional validation
	const remoteip =
		request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || undefined;

	// Verify the token with Cloudflare
	const result = await verifyTurnstileToken({
		token,
		secretKey,
		remoteip
	});

	if (!result.success) {
		console.warn('Turnstile verification failed:', result['error-codes']);
		throw error(403, 'Human verification failed');
	}

	// Create and set the verification cookie
	const cookieValue = createVerificationCookie(secretKey);
	const cookieOptions = getVerificationCookieOptions('.grove.place');

	cookies.set(TURNSTILE_COOKIE_NAME, cookieValue, cookieOptions);

	return json({
		success: true,
		message: 'Verification successful'
	});
};
