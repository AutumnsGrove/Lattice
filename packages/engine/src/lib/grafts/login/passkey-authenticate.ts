/**
 * Passkey Authentication Utilities
 *
 * Client-side WebAuthn authentication ceremony for signing in with passkeys.
 * Uses discoverable credentials (resident keys) - the browser shows all available
 * passkeys for the domain without requiring a username.
 *
 * @example
 * ```typescript
 * import { authenticateWithPasskey } from '@autumnsgrove/lattice/grafts/login';
 *
 * const result = await authenticateWithPasskey({ returnTo: '/dashboard' });
 * if (result.success) {
 *   window.location.href = result.redirectTo!;
 * }
 * ```
 */

import type { PasskeyAuthResult } from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for passkey authentication.
 */
export interface AuthenticateOptions {
  /** URL to redirect after successful authentication */
  returnTo?: string;
}

/**
 * WebAuthn authentication options from server.
 */
interface AuthenticationOptionsResponse {
  challenge: string;
  rpId: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: PublicKeyCredentialDescriptor[];
}

/**
 * Server verification response.
 */
interface VerifyResponse {
  success: boolean;
  redirectTo?: string;
  error?: string;
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/**
 * User-friendly error messages for WebAuthn errors.
 */
const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "Passkey sign-in was cancelled or timed out",
  SecurityError: "Passkey authentication is not available on this origin",
  NotSupportedError: "Passkeys are not supported in this browser",
  InvalidStateError: "No passkey found for this site",
  AbortError: "Passkey sign-in was cancelled",
  UnknownError: "Something went wrong. Please try again.",
};

/**
 * Get a user-friendly error message from a WebAuthn error.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific DOMException names
    if (error.name in ERROR_MESSAGES) {
      return ERROR_MESSAGES[error.name];
    }

    // Check for "no credentials" type errors
    if (
      error.message.includes("no credential") ||
      error.message.includes("empty allow list")
    ) {
      return "No passkey found. Try signing in with Google instead.";
    }
  }

  return ERROR_MESSAGES.UnknownError;
}

// =============================================================================
// CAPABILITY DETECTION
// =============================================================================

/**
 * Check if WebAuthn is supported in this browser.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

/**
 * Check if the browser supports passkey authentication.
 * This checks for both WebAuthn support and platform authenticator availability.
 */
export async function hasPasskeysAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    // Check if a platform authenticator (Face ID, Touch ID, Windows Hello) is available
    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Check if conditional mediation (autofill UI) is supported.
 * This would allow passkeys to appear in username field autocomplete.
 */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    if (
      typeof PublicKeyCredential.isConditionalMediationAvailable === "function"
    ) {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

// =============================================================================
// BASE64URL ENCODING
// =============================================================================

/**
 * Convert an ArrayBuffer to a base64url string.
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Convert a base64url string to an ArrayBuffer.
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// =============================================================================
// AUTHENTICATION FLOW
// =============================================================================

/**
 * Authenticate with a passkey.
 *
 * This performs the full WebAuthn authentication ceremony:
 * 1. Fetches authentication options from the server
 * 2. Triggers the browser's passkey picker (Face ID, Touch ID, etc.)
 * 3. Verifies the assertion with the server
 * 4. Server sets session cookies on success
 *
 * @param options - Authentication options
 * @returns Result with success status and redirect URL or error message
 *
 * @example
 * ```typescript
 * const result = await authenticateWithPasskey({ returnTo: '/dashboard' });
 *
 * if (result.success) {
 *   window.location.href = result.redirectTo!;
 * } else {
 *   showError(result.error);
 * }
 * ```
 */
export async function authenticateWithPasskey(
  options: AuthenticateOptions = {},
): Promise<PasskeyAuthResult> {
  const { returnTo = "/arbor" } = options;

  // Check WebAuthn support
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: ERROR_MESSAGES.NotSupportedError,
    };
  }

  try {
    // Step 1: Get authentication options from server
    const optionsResponse = await fetch("/api/passkey/authenticate/options", {
      // csrf-ok
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ returnTo }),
    });

    if (!optionsResponse.ok) {
      const errorData = (await optionsResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || "Failed to start passkey authentication",
      };
    }

    const authOptions =
      (await optionsResponse.json()) as AuthenticationOptionsResponse;

    // Step 2: Build WebAuthn credential request options
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64UrlToArrayBuffer(authOptions.challenge),
      rpId: authOptions.rpId,
      timeout: authOptions.timeout || 60000,
      userVerification: authOptions.userVerification || "preferred",
      // Empty allowCredentials for discoverable credential flow
      // Browser will show all available passkeys for this rpId
      allowCredentials:
        authOptions.allowCredentials?.map((cred) => ({
          type: cred.type,
          id: base64UrlToArrayBuffer(cred.id as unknown as string),
          transports: cred.transports,
        })) || [],
    };

    // Step 3: Trigger WebAuthn ceremony
    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: "No passkey was selected",
      };
    }

    // Step 4: Send assertion to server for verification
    const assertionResponse =
      credential.response as AuthenticatorAssertionResponse;

    const verifyResponse = await fetch("/api/passkey/authenticate/verify", {
      // csrf-ok
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          rawId: arrayBufferToBase64Url(credential.rawId),
          response: {
            authenticatorData: arrayBufferToBase64Url(
              assertionResponse.authenticatorData,
            ),
            clientDataJSON: arrayBufferToBase64Url(
              assertionResponse.clientDataJSON,
            ),
            signature: arrayBufferToBase64Url(assertionResponse.signature),
            userHandle: assertionResponse.userHandle
              ? arrayBufferToBase64Url(assertionResponse.userHandle)
              : null,
          },
          type: credential.type,
        },
        returnTo,
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = (await verifyResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || "Failed to verify passkey",
      };
    }

    const verifyResult = (await verifyResponse.json()) as VerifyResponse;

    if (verifyResult.success) {
      return {
        success: true,
        redirectTo: verifyResult.redirectTo || returnTo,
      };
    }

    return {
      success: false,
      error: verifyResult.error || "Passkey verification failed",
    };
  } catch (error) {
    console.error("[Passkey] Authentication error:", error);
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}
