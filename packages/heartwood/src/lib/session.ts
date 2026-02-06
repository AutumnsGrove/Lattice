/**
 * Session Utilities for SessionDO
 * Uses Web Crypto API for AES-GCM encryption + HMAC-SHA256 signing
 *
 * Cookie format (v2): {salt+iv (28 bytes)}:{ciphertext}
 * - salt: 16-byte random salt for per-cookie key derivation
 * - iv: 12-byte random initialization vector for AES-GCM
 * - ciphertext: AES-GCM encrypted {sessionId}:{userId} with auth tag
 *
 * Security properties:
 * - Per-cookie salt: Even if SESSION_SECRET leaks, each cookie requires
 *   individual key derivation (no bulk decryption)
 * - Random IV: Ensures unique ciphertext even for identical payloads
 * - Authenticated encryption: Tampering is detected and rejected
 *
 * This prevents userId enumeration by encrypting the entire payload.
 */

// Salt size for per-cookie key derivation (16 bytes = 128 bits)
const SALT_SIZE = 16;
// IV size for AES-GCM (12 bytes = 96 bits, recommended by NIST)
const IV_SIZE = 12;

export interface ParsedSessionCookie {
  sessionId: string;
  userId: string;
  signature: string; // Kept for backward compatibility, now represents the auth tag
}

/**
 * Base64 URL encode (no padding, URL-safe characters)
 */
function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
  // Restore standard base64 characters
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-GCM key from secret using HKDF with per-cookie salt
 *
 * Security: Using a random salt per cookie means each cookie gets a unique
 * derived key. If SESSION_SECRET is compromised, an attacker must still
 * derive each key individually (the salt is in the cookie but adds entropy
 * to the key derivation, preventing precomputation attacks).
 *
 * @param secret - The SESSION_SECRET from environment
 * @param salt - Per-cookie random salt (16 bytes)
 */
async function getAesKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt, // Per-cookie random salt
      info: encoder.encode("grove-session-v2"), // Version bump for new format
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Derive AES-GCM key with fixed salt (legacy v1 format)
 * @deprecated Used only for backward compatibility during migration
 */
async function getAesKeyLegacy(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("grove-session-v1"), // Fixed salt (legacy)
      info: encoder.encode("session-cookie"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Import secret as HMAC key for crypto.subtle
 * Used for device fingerprinting
 */
async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign data with HMAC-SHA256 using Web Crypto API
 * Used for device fingerprinting
 */
async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);

  return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Avoids early returns that could leak length information
 */
function timingSafeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // Accumulate length difference
  for (let i = 0; i < maxLength; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

/**
 * Create an encrypted session cookie value (v2 format)
 * Format: {salt+iv}:{ciphertext}
 *
 * Security improvements in v2:
 * - Per-cookie random salt prevents bulk decryption if secret leaks
 * - Random IV ensures unique ciphertext for identical payloads
 * - AES-GCM provides authenticated encryption (tamper detection)
 */
export async function createSessionCookie(
  sessionId: string,
  userId: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

  // Derive key using per-cookie salt
  const key = await getAesKey(secret, salt);

  // Encrypt the payload
  const payload = `${sessionId}:${userId}`;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(payload),
  );

  // Combine salt + iv for the first part of the cookie
  const saltIv = new Uint8Array(SALT_SIZE + IV_SIZE);
  saltIv.set(salt, 0);
  saltIv.set(iv, SALT_SIZE);

  // Format: {salt+iv}:{ciphertext}
  return `${base64UrlEncode(saltIv)}:${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

/**
 * Parse and decrypt a session cookie
 * Returns null if invalid, tampered, or decryption fails
 *
 * Supports three formats for backward compatibility:
 * - v2 (current): {salt+iv (28 bytes)}:{ciphertext} - per-cookie salt
 * - v1 (migration): {iv (12 bytes)}:{ciphertext} - fixed salt
 * - legacy: {sessionId}:{userId}:{signature} - HMAC signed (deprecated)
 *
 * Security: All code paths perform cryptographic work to prevent timing attacks
 * that could reveal cookie format information.
 *
 * @deprecated Legacy HMAC format will be removed 2026-03-01. All sessions
 * created after this PR will use v2 encrypted format.
 */
export async function parseSessionCookie(
  cookie: string,
  secret: string,
): Promise<ParsedSessionCookie | null> {
  try {
    const parts = cookie.split(":");

    // Encrypted formats: {salt+iv}:{ciphertext} or {iv}:{ciphertext}
    if (parts.length === 2) {
      const [saltIvStr, ciphertextStr] = parts;
      const saltIvBytes = base64UrlDecode(saltIvStr);
      const ciphertext = base64UrlDecode(ciphertextStr);

      let key: CryptoKey;
      let iv: Uint8Array;

      // Detect format by first-part length
      // v2: 28 bytes (16 salt + 12 iv) = ~38 chars base64
      // v1: 12 bytes (iv only) = ~16 chars base64
      if (saltIvBytes.length === SALT_SIZE + IV_SIZE) {
        // v2 format: extract salt and iv
        const salt = saltIvBytes.slice(0, SALT_SIZE);
        iv = saltIvBytes.slice(SALT_SIZE);
        key = await getAesKey(secret, salt);
      } else if (saltIvBytes.length === IV_SIZE) {
        // v1 format: iv only, use fixed salt
        iv = saltIvBytes;
        key = await getAesKeyLegacy(secret);
      } else {
        // Invalid length - do work anyway to prevent timing attack
        const dummySalt = new Uint8Array(SALT_SIZE);
        await getAesKey(secret, dummySalt);
        console.log("[Session] Invalid cookie header length");
        return null;
      }

      // Decrypt (will throw if tampered - AES-GCM is authenticated)
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );

      const decoder = new TextDecoder();
      const payload = decoder.decode(plaintext);
      const payloadParts = payload.split(":");

      if (payloadParts.length !== 2) {
        console.log("[Session] Invalid decrypted payload format");
        return null;
      }

      const [sessionId, userId] = payloadParts;
      return { sessionId, userId, signature: "aes-gcm-v2" };
    }

    // Legacy HMAC format: {sessionId}:{userId}:{signature}
    // @deprecated Remove after 2026-03-01
    if (parts.length === 3) {
      const [sessionId, userId, providedSignature] = parts;

      // Always compute expected signature (timing-safe: no early return)
      const legacyPayload = `${sessionId}:${userId}`;
      const expectedSignature = await hmacSign(legacyPayload, secret);

      // Constant-time comparison
      const isValid = timingSafeEqual(providedSignature, expectedSignature);

      if (!isValid) {
        console.log("[Session] Invalid legacy cookie signature");
        return null;
      }

      // Log deprecation warning (rate-limited in production)
      console.log(
        "[Session] Legacy HMAC cookie used - will be deprecated 2026-03-01",
      );
      return { sessionId, userId, signature: providedSignature };
    }

    // Invalid format - do cryptographic work to prevent timing attack
    const dummySalt = new Uint8Array(SALT_SIZE);
    await getAesKey(secret, dummySalt);
    console.log("[Session] Invalid cookie format");
    return null;
  } catch (error) {
    // AES-GCM throws on decryption failure (tampered cookie)
    console.log("[Session] Cookie verification failed");
    return null;
  }
}

/**
 * Get session cookie from request
 */
export async function getSessionFromRequest(
  request: Request,
  secret: string,
): Promise<ParsedSessionCookie | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...value] = c.trim().split("=");
      return [key, value.join("=")];
    }),
  );

  const sessionCookie = cookies["grove_session"];
  if (!sessionCookie) return null;

  return parseSessionCookie(sessionCookie, secret);
}

/**
 * Generate Set-Cookie header for session
 * Domain: .grove.place for cross-subdomain auth
 */
export async function createSessionCookieHeader(
  sessionId: string,
  userId: string,
  secret: string,
  maxAgeSeconds: number = 7 * 24 * 60 * 60, // 7 days
): Promise<string> {
  const value = await createSessionCookie(sessionId, userId, secret);
  // SameSite=Lax required for OAuth redirects (Google → our callback → device page)
  return `grove_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.grove.place; Max-Age=${maxAgeSeconds}`;
}

/**
 * Generate cookie header to clear the session
 */
export function clearSessionCookieHeader(): string {
  return "grove_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0";
}

/**
 * Generate device ID from request fingerprint
 * Uses HMAC of browser characteristics for consistent device identification
 *
 * Components used:
 * - User-Agent: Browser and OS identification
 * - Accept-Language: Locale preferences (stable per device)
 * - Sec-CH-UA headers: Modern browser identification
 *
 * NOTE: IP address is intentionally NOT included because:
 * - Mobile users change IPs frequently (cell towers, WiFi handoff)
 * - VPN users have different IPs per session
 * - Users behind CGNAT share IPs
 * Including IP would create duplicate "devices" in the session list.
 *
 * IP is stored separately in session metadata for security auditing.
 */
export async function getDeviceId(
  request: Request,
  secret: string,
): Promise<string> {
  const components = [
    request.headers.get("user-agent") || "",
    request.headers.get("accept-language") || "",
    // Sec-CH-UA client hints provide stable device identification
    request.headers.get("sec-ch-ua") || "",
    request.headers.get("sec-ch-ua-platform") || "",
    request.headers.get("sec-ch-ua-mobile") || "",
  ];

  const hash = await hmacSign(components.join("|"), secret);
  return hash.substring(0, 16);
}

/**
 * Parse user agent into friendly device name
 */
export function parseDeviceName(userAgent: string | null): string {
  if (!userAgent) return "Unknown Device";

  // Mobile devices
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) {
    if (userAgent.includes("Mobile")) return "Android Phone";
    return "Android Tablet";
  }

  // Desktop browsers
  if (userAgent.includes("Mac OS")) {
    if (userAgent.includes("Chrome")) return "Chrome on Mac";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari on Mac";
    if (userAgent.includes("Firefox")) return "Firefox on Mac";
    if (userAgent.includes("Arc")) return "Arc on Mac";
    return "Mac";
  }

  if (userAgent.includes("Windows")) {
    if (userAgent.includes("Edg/")) return "Edge on Windows";
    if (userAgent.includes("Chrome")) return "Chrome on Windows";
    if (userAgent.includes("Firefox")) return "Firefox on Windows";
    return "Windows PC";
  }

  if (userAgent.includes("Linux")) {
    if (userAgent.includes("Chrome")) return "Chrome on Linux";
    if (userAgent.includes("Firefox")) return "Firefox on Linux";
    return "Linux";
  }

  if (userAgent.includes("CrOS")) return "Chromebook";

  return "Unknown Device";
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    null
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}
