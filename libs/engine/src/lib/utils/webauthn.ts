/**
 * WebAuthn Utilities
 *
 * Helper functions for WebAuthn/Passkey operations.
 * Used for encoding/decoding data between browser WebAuthn API and server.
 */

/**
 * Convert a base64url-encoded string to an ArrayBuffer.
 * Used for converting server-provided challenges and user IDs to WebAuthn format.
 *
 * @example
 * ```ts
 * const challenge = base64urlToBuffer(options.challenge);
 * const userId = base64urlToBuffer(options.user.id);
 * ```
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  // Add padding if necessary
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  // Convert base64url to standard base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  // Decode base64 to binary string
  const binary = atob(base64);
  // Convert to ArrayBuffer
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert an ArrayBuffer to a base64url-encoded string.
 * Used for encoding WebAuthn credential responses for server transmission.
 *
 * @example
 * ```ts
 * const rawId = bufferToBase64url(credential.rawId);
 * const attestation = bufferToBase64url(response.attestationObject);
 * ```
 */
export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Encode to base64 and convert to base64url
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Check if WebAuthn is supported in the current browser.
 *
 * @example
 * ```ts
 * if (isWebAuthnSupported()) {
 *   // Show passkey sign-in option
 * }
 * ```
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function"
  );
}

/**
 * Check if platform authenticator (Face ID, Touch ID, Windows Hello) is available.
 * Returns false if WebAuthn is not supported.
 *
 * @example
 * ```ts
 * const hasPlatformAuth = await isPlatformAuthenticatorAvailable();
 * if (hasPlatformAuth) {
 *   // Show "Sign in with Face ID / Touch ID" option
 * }
 * ```
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
