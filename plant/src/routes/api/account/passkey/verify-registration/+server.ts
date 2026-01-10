/**
 * API: Verify passkey registration
 *
 * POST /api/account/passkey/verify-registration
 *
 * Verifies and registers a new passkey credential.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const AUTH_BASE_URL = 'https://heartwood.grove.place';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const accessToken = cookies.get('access_token');

	if (!accessToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const env = platform?.env as Record<string, string> | undefined;
	const authBaseUrl = env?.AUTH_BASE_URL || AUTH_BASE_URL;

	try {
		const body = await request.json();

		const response = await fetch(`${authBaseUrl}/api/auth/passkey/verify-registration`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const data = (await response.json()) as { message?: string };
			return json(
				{ error: data.message || 'Failed to register passkey' },
				{ status: response.status }
			);
		}

		const passkey = await response.json();
		return json(passkey);
	} catch {
		return json({ error: 'Unable to register passkey' }, { status: 500 });
	}
};
