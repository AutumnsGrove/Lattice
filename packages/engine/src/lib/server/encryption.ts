/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption for sensitive data like API tokens.
 * Uses Web Crypto API which is available in Cloudflare Workers.
 *
 * Format: base64(iv):base64(ciphertext)
 * - IV: 12 bytes (96 bits) - recommended for GCM
 * - Key: 32 bytes (256 bits) from TOKEN_ENCRYPTION_KEY secret
 */

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @param keyHex - 64-character hex string (256-bit key)
 * @returns Encrypted string in format "iv:ciphertext" (both base64)
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

  // Return as base64 iv:ciphertext
  return `${arrayBufferToBase64(iv)}:${arrayBufferToBase64(ciphertext)}`;
}

/**
 * Decrypts an encrypted token string.
 *
 * @param encrypted - Encrypted string in format "iv:ciphertext"
 * @param keyHex - 64-character hex string (256-bit key)
 * @returns Decrypted plaintext string
 * @throws If decryption fails (wrong key, tampered data, etc.)
 */
export async function decryptToken(
  encrypted: string,
  keyHex: string,
): Promise<string> {
  const colonIndex = encrypted.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid encrypted format: missing separator");
  }

  const ivBase64 = encrypted.slice(0, colonIndex);
  const ciphertextBase64 = encrypted.slice(colonIndex + 1);

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
 * Check if a string appears to be encrypted (has the iv:ciphertext format).
 * Used to handle migration from plaintext to encrypted tokens.
 */
export function isEncryptedToken(value: string): boolean {
  // Encrypted tokens have format: base64:base64
  // Base64 IV is always 16 chars (12 bytes = 16 base64 chars)
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) return false;

  const ivPart = value.slice(0, colonIndex);
  const ciphertextPart = value.slice(colonIndex + 1);

  // IV should be 16 chars, ciphertext should be at least 24 chars (16 bytes min + auth tag)
  // Also check they look like base64
  return (
    ivPart.length === 16 &&
    ciphertextPart.length >= 24 &&
    /^[A-Za-z0-9+/=]+$/.test(ivPart) &&
    /^[A-Za-z0-9+/=]+$/.test(ciphertextPart)
  );
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
