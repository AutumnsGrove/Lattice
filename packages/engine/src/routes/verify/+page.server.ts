/**
 * Verification Page Server
 *
 * Checks if user is already verified and redirects if so.
 * Provides the Turnstile site key to the page.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { TURNSTILE_COOKIE_NAME, validateVerificationCookie } from '$lib/server/services/turnstile';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const secretKey = platform?.env?.TURNSTILE_SECRET_KEY;
	const siteKey = platform?.env?.TURNSTILE_SITE_KEY;

	// Check if already verified
	const existingCookie = cookies.get(TURNSTILE_COOKIE_NAME);
	if (existingCookie && secretKey && await validateVerificationCookie(existingCookie, secretKey)) {
		// Already verified, redirect to intended destination or home
		const returnTo = url.searchParams.get('return') || '/';
		throw redirect(302, returnTo);
	}

	// Get return URL for after verification
	const returnTo = url.searchParams.get('return') || '/';

	return {
		siteKey: siteKey || '',
		returnTo
	};
};
