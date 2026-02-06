/**
 * Cryptographic utilities
 */

/**
 * Generate a cryptographically secure random string
 */
export function generateRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a 6-digit numeric code for magic code authentication
 */
export function generateMagicCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = new DataView(bytes.buffer).getUint32(0);
  // Ensure 6 digits by taking modulo and padding
  return String(num % 1000000).padStart(6, "0");
}

/**
 * Base64 URL encode (no padding)
 */
export function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64 URL decode
 */
export function base64UrlDecode(str: string): Uint8Array {
  // Add padding if necessary
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * SHA-256 hash
 */
export async function sha256(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(data));
}

/**
 * SHA-256 hash as base64url string
 */
export async function sha256Base64Url(data: string): Promise<string> {
  const hash = await sha256(data);
  return base64UrlEncode(hash);
}

/**
 * Verify PKCE code challenge
 */
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): Promise<boolean> {
  if (method !== "S256") {
    return false;
  }

  const expectedChallenge = await sha256Base64Url(codeVerifier);
  return timingSafeEqual(expectedChallenge, codeChallenge);
}

/**
 * Hash a secret for storage (using SHA-256)
 */
export async function hashSecret(secret: string): Promise<string> {
  return sha256Base64Url(secret);
}

/**
 * Verify a secret against its hash
 */
export async function verifySecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  const computedHash = await hashSecret(secret);
  return timingSafeEqual(computedHash, hash);
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * SECURITY: Avoids early returns that could leak length information.
 * Uses Math.max to iterate the full length of the longer string,
 * and accumulates the length difference into the result variable.
 * This ensures comparison time is proportional to the longer input,
 * not the shorter one (which would reveal partial length info).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aLen = a.length;
  const bLen = b.length;
  const maxLength = Math.max(aLen, bLen);
  let result = aLen ^ bLen; // Accumulate length difference
  for (let i = 0; i < maxLength; i++) {
    // Explicit bounds check avoids NaN-to-0 coercion via || operator,
    // which could introduce subtle branch timing differences
    const aCode = i < aLen ? a.charCodeAt(i) : 0;
    const bCode = i < bLen ? b.charCodeAt(i) : 0;
    result |= aCode ^ bCode;
  }
  return result === 0;
}

/**
 * Generate a secure authorization code
 */
export function generateAuthCode(): string {
  return generateRandomString(32);
}

/**
 * Generate a secure refresh token
 */
export function generateRefreshToken(): string {
  return generateRandomString(48);
}

/**
 * Generate a secure device code (RFC 8628)
 * Returns a 32-byte random string, base64url encoded
 */
export function generateDeviceCode(): string {
  return generateRandomString(32);
}

/**
 * Generate a human-readable user code for device authorization (RFC 8628)
 * Format: XXXX-XXXX using a restricted character set
 * - No vowels (avoid profanity)
 * - No confusable characters (0/O, 1/I/L)
 */
export function generateUserCode(charset: string, length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let code = "";
  for (let i = 0; i < length; i++) {
    code += charset[bytes[i] % charset.length];
  }

  // Format as XXXX-XXXX for readability
  if (length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}

/**
 * Normalize user code input for comparison
 * Removes hyphens/spaces and converts to uppercase
 */
export function normalizeUserCode(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}
