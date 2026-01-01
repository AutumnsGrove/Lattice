/**
 * Unsubscribe Token Utilities
 *
 * Uses HMAC-SHA256 to generate secure, deterministic tokens for unsubscribe links.
 * Tokens are derived from the email address and a secret key, so they can be
 * regenerated without storing them in the database.
 */

const UNSUBSCRIBE_PREFIX = 'grove-unsubscribe-v1';

/**
 * Generate an HMAC-SHA256 signature for an email address
 */
async function hmacSign(email: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(`${UNSUBSCRIBE_PREFIX}:${email.toLowerCase()}`);

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
	const hashArray = Array.from(new Uint8Array(signature));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate an unsubscribe token for an email address
 *
 * @param email - The subscriber's email address
 * @param secret - Secret key (typically RESEND_API_KEY or dedicated secret)
 * @returns A secure token that can be used in unsubscribe links
 */
export async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
	const signature = await hmacSign(email, secret);
	// Use first 32 chars (128 bits) - sufficient for security, keeps URLs reasonable
	return signature.substring(0, 32);
}

/**
 * Verify an unsubscribe token matches the expected value for an email
 *
 * @param email - The subscriber's email address
 * @param token - The token from the unsubscribe link
 * @param secret - Secret key (same as used for generation)
 * @returns True if the token is valid for this email
 */
export async function verifyUnsubscribeToken(
	email: string,
	token: string,
	secret: string
): Promise<boolean> {
	const expectedToken = await generateUnsubscribeToken(email, secret);
	// Constant-time comparison to prevent timing attacks
	if (token.length !== expectedToken.length) return false;

	let result = 0;
	for (let i = 0; i < token.length; i++) {
		result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Generate a full unsubscribe URL for an email
 *
 * @param email - The subscriber's email address
 * @param secret - Secret key for token generation
 * @param baseUrl - Base URL of the site (e.g., 'https://grove.place')
 * @returns Full unsubscribe URL with email and token parameters
 */
export async function generateUnsubscribeUrl(
	email: string,
	secret: string,
	baseUrl: string = 'https://grove.place'
): Promise<string> {
	const token = await generateUnsubscribeToken(email, secret);
	const params = new URLSearchParams({
		email: email.toLowerCase(),
		token
	});
	return `${baseUrl}/unsubscribe?${params.toString()}`;
}
