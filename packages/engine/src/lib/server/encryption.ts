/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption for sensitive data like API tokens.
 * Uses Web Crypto API which is available in Cloudflare Workers.
 *
 * Format: v1:base64(iv):base64(ciphertext)
 * - Version: "v1" prefix for future algorithm changes
 * - IV: 12 bytes (96 bits) - recommended for GCM
 * - Key: 32 bytes (256 bits) from TOKEN_ENCRYPTION_KEY secret
 *
 * See docs/security/token-encryption.md for setup and key rotation.
 */

// Current encryption version - increment when changing algorithm
const ENCRYPTION_VERSION = "v1";

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param keyHex - 64-character hex string (256-bit key)
 * @returns Encrypted string in format "v1:iv:ciphertext" (iv and ciphertext are base64)
 */
export async function encryptToken(
  plaintext: string,
  keyHex: string,
): Promise<string> {
  // Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import the key
  const key = await importKey(keyHex);

  // Encrypt
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // Return as versioned format: v1:base64(iv):base64(ciphertext)
  return `${ENCRYPTION_VERSION}:${arrayBufferToBase64(iv)}:${arrayBufferToBase64(ciphertext)}`;
}

/**
 * Decrypts an encrypted token string.
 *
 * @param encrypted - Encrypted string in format "v1:iv:ciphertext" or legacy "iv:ciphertext"
 * @param keyHex - 64-character hex string (256-bit key)
 * @returns Decrypted plaintext string
 * @throws If decryption fails (wrong key, tampered data, unsupported version)
 */
export async function decryptToken(
  encrypted: string,
  keyHex: string,
): Promise<string> {
  const parts = encrypted.split(":");

  let ivBase64: string;
  let ciphertextBase64: string;

  if (parts.length === 3 && parts[0] === ENCRYPTION_VERSION) {
    // Versioned format: v1:iv:ciphertext
    ivBase64 = parts[1];
    ciphertextBase64 = parts[2];
  } else if (parts.length === 2) {
    // Legacy format: iv:ciphertext (for backwards compatibility)
    ivBase64 = parts[0];
    ciphertextBase64 = parts[1];
  } else if (parts.length === 3 && parts[0].startsWith("v")) {
    // Unknown version
    throw new Error(`Unsupported encryption version: ${parts[0]}`);
  } else {
    throw new Error("Invalid encrypted format: expected v1:iv:ciphertext");
  }

  const iv = base64ToArrayBuffer(ivBase64);
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const key = await importKey(keyHex);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Check if a string appears to be encrypted.
 * Used to handle migration from plaintext to encrypted tokens.
 *
 * Detects:
 * - Versioned format: v1:iv:ciphertext (preferred)
 * - Legacy format: iv:ciphertext (for backwards compatibility)
 */
export function isEncryptedToken(value: string): boolean {
  const parts = value.split(":");

  // Versioned format: v1:iv:ciphertext
  if (parts.length === 3 && parts[0] === ENCRYPTION_VERSION) {
    const ivPart = parts[1];
    const ciphertextPart = parts[2];
    // IV should be 16 chars (12 bytes base64), ciphertext at least 24 chars
    return (
      ivPart.length === 16 &&
      ciphertextPart.length >= 24 &&
      /^[A-Za-z0-9+/=]+$/.test(ivPart) &&
      /^[A-Za-z0-9+/=]+$/.test(ciphertextPart)
    );
  }

  // Legacy format: iv:ciphertext (no version prefix)
  if (parts.length === 2) {
    const ivPart = parts[0];
    const ciphertextPart = parts[1];
    // IV should be 16 chars, ciphertext at least 24 chars
    // Also ensure first part doesn't look like a version prefix
    return (
      ivPart.length === 16 &&
      !ivPart.startsWith("v") &&
      ciphertextPart.length >= 24 &&
      /^[A-Za-z0-9+/=]+$/.test(ivPart) &&
      /^[A-Za-z0-9+/=]+$/.test(ciphertextPart)
    );
  }

  return false;
}

/**
 * Safely decrypt a token, returning null if decryption fails.
 * Useful for handling potentially invalid or legacy tokens.
 */
export async function safeDecryptToken(
  encrypted: string | null,
  keyHex: string | undefined,
): Promise<string | null> {
  if (!encrypted || !keyHex) return null;

  // If it doesn't look encrypted, assume it's plaintext (legacy)
  // This allows graceful migration
  if (!isEncryptedToken(encrypted)) {
    return encrypted;
  }

  try {
    return await decryptToken(encrypted, keyHex);
  } catch {
    // Decryption failed - could be wrong key or corrupted data
    return null;
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

async function importKey(keyHex: string): Promise<CryptoKey> {
  if (keyHex.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 64 hex characters (256 bits)",
    );
  }

  const keyBytes = hexToArrayBuffer(keyHex);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  // Validate hex characters before parsing
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must contain only hex characters (0-9, a-f)",
    );
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
