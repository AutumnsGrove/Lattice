/**
 * GroveAuth Validation Utilities
 *
 * Shared validation functions for authentication flows.
 * These are used both server-side for security and can be tested independently.
 */

// ==========================================================================
// Constants
// ==========================================================================

/** Length of TOTP codes (Time-based One-Time Password) */
export const TOTP_CODE_LENGTH = 6;

/** Regex pattern for valid TOTP codes (6 digits only) */
export const TOTP_CODE_REGEX = /^\d{6}$/;

// ==========================================================================
// Types
// ==========================================================================

/**
 * WebAuthn passkey credential structure.
 * Matches the Credential interface from the Web Authentication API.
 */
export interface PasskeyCredential {
	/** Base64url-encoded credential identifier */
	id: string;
	/** Base64url-encoded raw credential ID */
	rawId: string;
	/** Credential response containing attestation data */
	response: {
		/** Base64url-encoded attestation object */
		attestationObject: string;
		/** Base64url-encoded client data JSON */
		clientDataJSON: string;
	};
	/** Credential type, must be "public-key" */
	type: string;
	/** Optional user-provided name for the passkey */
	name?: string;
}

// ==========================================================================
// TOTP Validation
// ==========================================================================

/**
 * Validate a TOTP (Time-based One-Time Password) code.
 *
 * Checks that the code is exactly 6 digits (no letters or special characters).
 *
 * @param code - The code to validate
 * @returns True if code is a valid 6-digit string
 *
 * @example
 * ```ts
 * isValidTotpCode("123456") // true
 * isValidTotpCode("12345")  // false (too short)
 * isValidTotpCode("1234567") // false (too long)
 * isValidTotpCode("12345a") // false (contains letter)
 * isValidTotpCode(undefined) // false
 * ```
 */
export function isValidTotpCode(code: string | undefined): code is string {
	return typeof code === 'string' && TOTP_CODE_REGEX.test(code);
}

// ==========================================================================
// Passkey Credential Validation
// ==========================================================================

/**
 * Validate a WebAuthn passkey credential structure.
 *
 * This performs structural validation to ensure the credential has the
 * expected shape before forwarding to the authentication server. This
 * prevents the endpoint from being used as an open proxy.
 *
 * @param body - The request body to validate
 * @returns True if body is a valid PasskeyCredential structure
 *
 * @example
 * ```ts
 * const body = await request.json();
 * if (!isValidCredential(body)) {
 *   return json({ error: "Invalid credential" }, { status: 400 });
 * }
 * // body is now typed as PasskeyCredential
 * ```
 */
export function isValidCredential(body: unknown): body is PasskeyCredential {
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

// ==========================================================================
// Environment Variable Validation
// ==========================================================================

/**
 * Get a required environment variable, throwing if not set.
 *
 * @param env - The environment object (from platform.env)
 * @param key - The environment variable key
 * @param fallback - Optional fallback value (for development only)
 * @returns The environment variable value
 * @throws Error if the variable is not set and no fallback provided
 *
 * @example
 * ```ts
 * const authBaseUrl = getRequiredEnv(platform?.env, 'AUTH_BASE_URL');
 * ```
 */
export function getRequiredEnv(
	env: Record<string, string> | undefined,
	key: string,
	fallback?: string
): string {
	const value = env?.[key] ?? fallback;
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}
