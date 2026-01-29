/**
 * Passkey Utilities
 *
 * Client-side helpers for WebAuthn passkey registration ceremony.
 * These functions handle the browser-side WebAuthn API interactions.
 */

import {
  base64urlToBuffer,
  bufferToBase64url,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from "$lib/utils/webauthn";

/**
 * Check if the current device supports passkeys.
 * Returns true only if WebAuthn is supported AND a platform authenticator
 * (Touch ID, Face ID, Windows Hello) is available.
 */
export async function checkPasskeySupport(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }
  return isPlatformAuthenticatorAvailable();
}

/**
 * Get a descriptive name for the current device.
 * Used as the default passkey name during registration.
 */
export function getDeviceName(): string {
  if (typeof navigator === "undefined") {
    return "My Passkey";
  }

  const platform = navigator.platform?.toLowerCase() || "";
  const userAgent = navigator.userAgent?.toLowerCase() || "";

  // macOS detection
  if (platform.includes("mac") || userAgent.includes("macintosh")) {
    if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      return userAgent.includes("ipad") ? "iPad" : "iPhone";
    }
    return "MacBook";
  }

  // Windows detection
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "Windows PC";
  }

  // Linux detection
  if (platform.includes("linux") || userAgent.includes("linux")) {
    if (userAgent.includes("android")) {
      return "Android Device";
    }
    return "Linux Device";
  }

  // iOS detection (in case platform doesn't match)
  if (userAgent.includes("iphone")) {
    return "iPhone";
  }
  if (userAgent.includes("ipad")) {
    return "iPad";
  }

  // Android detection
  if (userAgent.includes("android")) {
    return "Android Device";
  }

  return "My Passkey";
}

/**
 * Result from a passkey registration attempt
 */
export interface PasskeyRegistrationResult {
  success: boolean;
  error?: string;
}

/**
 * Register a new passkey via WebAuthn ceremony.
 *
 * This function:
 * 1. Fetches registration options from the server
 * 2. Triggers the WebAuthn ceremony in the browser
 * 3. Sends the credential back to the server for verification
 *
 * @param name - Optional custom name for the passkey (defaults to device name)
 * @returns Result indicating success or failure with error message
 */
export async function registerPasskey(
  name?: string,
): Promise<PasskeyRegistrationResult> {
  const passkeyName = name || getDeviceName();

  try {
    // Step 1: Get registration options from server
    const optionsResponse = await fetch("/api/passkey/register-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!optionsResponse.ok) {
      const errorData = (await optionsResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || "Failed to start passkey registration",
      };
    }

    const options = (await optionsResponse.json()) as {
      challenge: string;
      rp: { name: string; id: string };
      user: { id: string; name: string; displayName: string };
      pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
      authenticatorSelection?: {
        authenticatorAttachment?: AuthenticatorAttachment;
        requireResidentKey?: boolean;
        residentKey?: ResidentKeyRequirement;
        userVerification?: UserVerificationRequirement;
      };
      timeout?: number;
      attestation?: AttestationConveyancePreference;
    };

    // Step 2: Convert base64url values to ArrayBuffer for WebAuthn API
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
        challenge: base64urlToBuffer(options.challenge),
        rp: options.rp,
        user: {
          id: base64urlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        authenticatorSelection: options.authenticatorSelection || {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        timeout: options.timeout || 60000,
        attestation: options.attestation || "none",
      };

    // Step 3: Trigger WebAuthn ceremony
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: "Passkey registration was cancelled",
      };
    }

    // Step 4: Prepare credential response for server
    const attestationResponse =
      credential.response as AuthenticatorAttestationResponse;

    const credentialData = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      response: {
        attestationObject: bufferToBase64url(
          attestationResponse.attestationObject,
        ),
        clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
      },
      type: credential.type,
    };

    // Step 5: Verify credential with server
    const verifyResponse = await fetch("/api/passkey/verify-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialData, name: passkeyName }),
    });

    if (!verifyResponse.ok) {
      const errorData = (await verifyResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || "Failed to verify passkey registration",
      };
    }

    return { success: true };
  } catch (err) {
    // Handle specific WebAuthn errors
    if (err instanceof DOMException) {
      switch (err.name) {
        case "NotAllowedError":
          return {
            success: false,
            error: "Passkey registration was cancelled or timed out",
          };
        case "InvalidStateError":
          return {
            success: false,
            error: "A passkey for this device already exists",
          };
        case "SecurityError":
          return {
            success: false,
            error: "Passkey registration is not allowed on this page",
          };
        case "NotSupportedError":
          return {
            success: false,
            error: "Your device does not support passkeys",
          };
        default:
          return {
            success: false,
            error: `Passkey error: ${err.message}`,
          };
      }
    }

    console.error("[Passkey] Registration error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during passkey registration",
    };
  }
}
