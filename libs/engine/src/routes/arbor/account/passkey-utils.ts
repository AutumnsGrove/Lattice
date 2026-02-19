/**
 * Passkey Utilities
 *
 * Client-side helpers for passkey feature detection.
 * Registration is handled by login.grove.place (single WebAuthn origin).
 */

import {
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
