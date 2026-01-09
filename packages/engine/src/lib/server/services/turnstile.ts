/**
 * Turnstile Server-Side Verification (Shade)
 *
 * Validates Turnstile tokens with Cloudflare's siteverify endpoint.
 * Part of Grove's Shade AI protection system.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
	success: boolean;
	challenge_ts?: string;
	hostname?: string;
	'error-codes'?: string[];
	action?: string;
	cdata?: string;
}

export interface TurnstileVerifyOptions {
	/** The Turnstile token from the client */
	token: string;
	/** The secret key from Cloudflare Dashboard */
	secretKey: string;
	/** Optional: The user's IP address for additional validation */
	remoteip?: string;
}

/**
 * Verify a Turnstile token server-side
 *
 * @example
 * const result = await verifyTurnstileToken({
 *   token: formData.get('cf-turnstile-response'),
 *   secretKey: platform.env.TURNSTILE_SECRET_KEY,
 *   remoteip: request.headers.get('CF-Connecting-IP')
 * });
 *
 * if (!result.success) {
 *   throw error(403, 'Human verification failed');
 * }
 */
export async function verifyTurnstileToken(
	options: TurnstileVerifyOptions
): Promise<TurnstileVerifyResult> {
	const { token, secretKey, remoteip } = options;

	if (!token) {
		return {
			success: false,
			'error-codes': ['missing-input-response']
		};
	}

	if (!secretKey) {
		console.error('Turnstile: Missing secret key');
		return {
			success: false,
			'error-codes': ['missing-input-secret']
		};
	}

	const formData = new FormData();
	formData.append('secret', secretKey);
	formData.append('response', token);

	if (remoteip) {
		formData.append('remoteip', remoteip);
	}

	try {
		const response = await fetch(TURNSTILE_VERIFY_URL, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			console.error('Turnstile: Verification request failed', response.status);
			return {
				success: false,
				'error-codes': ['request-failed']
			};
		}

		const result: TurnstileVerifyResult = await response.json();
		return result;
	} catch (err) {
		console.error('Turnstile: Verification error', err);
		return {
			success: false,
			'error-codes': ['network-error']
		};
	}
}

/**
 * Cookie name for tracking Turnstile verification status
 */
export const TURNSTILE_COOKIE_NAME = 'grove_verified';

/**
 * Cookie max age (7 days in seconds)
 */
export const TURNSTILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Create the verification cookie value (signed timestamp)
 * Format: timestamp:signature
 * Uses HMAC-SHA256 for cryptographically secure signing
 */
export async function createVerificationCookie(secretKey: string): Promise<string> {
	const timestamp = Date.now().toString();
	const signature = await signCookie(timestamp, secretKey);
	return `${timestamp}:${signature}`;
}

/**
 * Validate a verification cookie
 * Returns true if valid and not expired
 * Uses HMAC-SHA256 for cryptographically secure verification
 */
export async function validateVerificationCookie(
	cookie: string | undefined,
	secretKey: string,
	maxAgeMs: number = TURNSTILE_COOKIE_MAX_AGE * 1000
): Promise<boolean> {
	if (!cookie) return false;

	const parts = cookie.split(':');
	if (parts.length !== 2) return false;

	const [timestamp, signature] = parts;
	const timestampNum = parseInt(timestamp, 10);

	if (isNaN(timestampNum)) return false;

	// Check expiration
	if (Date.now() - timestampNum > maxAgeMs) return false;

	// Verify signature
	return await verifyCookie(timestamp, signature, secretKey);
}

/**
 * Sign a value using HMAC-SHA256 for secure cookie signing
 * Uses Web Crypto API for cryptographically secure signing
 */
async function signCookie(value: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Verify a signed cookie value using HMAC-SHA256
 * Returns true if the signature matches
 */
async function verifyCookie(value: string, signature: string, secret: string): Promise<boolean> {
	const expectedSignature = await signCookie(value, secret);
	return signature === expectedSignature;
}

/**
 * Get cookie options for the verification cookie
 */
export function getVerificationCookieOptions(domain?: string) {
	return {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax' as const,
		maxAge: TURNSTILE_COOKIE_MAX_AGE,
		// Set domain to .grove.place to work across subdomains
		...(domain ? { domain } : {})
	};
}
