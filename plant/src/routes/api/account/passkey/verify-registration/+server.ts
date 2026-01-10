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

// Validate WebAuthn credential structure
interface PasskeyCredential {
	id: string;
	rawId: string;
	response: {
		attestationObject: string;
		clientDataJSON: string;
	};
	type: string;
	name?: string;
}

function isValidCredential(body: unknown): body is PasskeyCredential {
	if (!body || typeof body !== 'object') return false;
	const obj = body as Record<string, unknown>;

	// Required fields
	if (typeof obj.id !== 'string' || !obj.id) return false;
	if (typeof obj.rawId !== 'string' || !obj.rawId) return false;
	if (typeof obj.type !== 'string' || obj.type !== 'public-key') return false;

	// Response object
	if (!obj.response || typeof obj.response !== 'object') return false;
	const response = obj.response as Record<string, unknown>;
	if (typeof response.attestationObject !== 'string' || !response.attestationObject) return false;
	if (typeof response.clientDataJSON !== 'string' || !response.clientDataJSON) return false;

	// Optional name field
	if (obj.name !== undefined && typeof obj.name !== 'string') return false;

	return true;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const accessToken = cookies.get('access_token');

	if (!accessToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const env = platform?.env as Record<string, string> | undefined;
	const authBaseUrl = env?.AUTH_BASE_URL || AUTH_BASE_URL;

	try {
		const body = await request.json();

		// Validate credential structure before forwarding
		if (!isValidCredential(body)) {
			return json({ error: 'Invalid credential format' }, { status: 400 });
		}

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
