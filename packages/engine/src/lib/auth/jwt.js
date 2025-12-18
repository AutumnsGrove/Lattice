/**
 * JWT utilities using Web Crypto API (Cloudflare Workers compatible)
 */

/**
 * @typedef {Object} JwtPayload
 * @property {string} [sub]
 * @property {string} [email]
 * @property {number} [exp]
 * @property {number} [iat]
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Base64URL encode
 * @param {ArrayBuffer} data
 * @returns {string}
 */
function base64UrlEncode(data) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64URL decode
 * @param {string} str
 * @returns {Uint8Array}
 */
function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Create HMAC key from secret
 * @param {string} secret
 * @returns {Promise<CryptoKey>}
 */
async function createKey(secret) {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign a JWT payload
 * @param {JwtPayload} payload - The payload to sign
 * @param {string} secret - The secret key
 * @returns {Promise<string>} - The signed JWT token
 */
export async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };

  const headerEncoded = base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer);
  const payloadEncoded = base64UrlEncode(
    encoder.encode(JSON.stringify(payload)).buffer,
  );

  const message = `${headerEncoded}.${payloadEncoded}`;
  const key = await createKey(secret);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  const signatureEncoded = base64UrlEncode(signature);

  return `${message}.${signatureEncoded}`;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @param {string} secret - The secret key
 * @returns {Promise<JwtPayload|null>} - The decoded payload or null if invalid
 */
export async function verifyJwt(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const message = `${headerEncoded}.${payloadEncoded}`;

    const key = await createKey(secret);
    const signature = base64UrlDecode(signatureEncoded);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(message),
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadEncoded)));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
