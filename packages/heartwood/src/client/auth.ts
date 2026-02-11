/**
 * Heartwood Auth Client
 *
 * This is the client-side auth client for use in Grove services.
 * It integrates Better Auth with Cloudflare-specific optimizations.
 *
 * Usage:
 * ```typescript
 * import { authClient } from '@groveauth/client';
 *
 * // Sign in with Google
 * await authClient.signIn.social({ provider: 'google' });
 *
 * // Sign in with magic link
 * await authClient.signIn.magicLink({ email: 'user@example.com' });
 *
 * // Get current session
 * const session = await authClient.getSession();
 *
 * // Sign out
 * await authClient.signOut();
 * ```
 */

import { createAuthClient } from "better-auth/client";
import {
  magicLinkClient,
  twoFactorClient as twoFactorClientPlugin,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

// Auth base URL - configurable for different environments
// This file is intended for browser use; for server-side, import directly from better-auth
// Canonical source: @autumnsgrove/groveengine/config AUTH_HUB_URL
const AUTH_BASE_URL = "https://login.grove.place";

/**
 * Create the Heartwood auth client
 */
export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,

  // Include Cloudflare-specific plugins
  plugins: [
    // Magic link authentication
    magicLinkClient(),

    // Passkey (WebAuthn) authentication
    passkeyClient(),

    // Two-factor authentication
    twoFactorClientPlugin(),
  ],
});

// Re-export types for convenience
export type Session = typeof authClient.$Infer.Session.session;
export type User = typeof authClient.$Infer.Session.user;

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(options?: { callbackURL?: string }) {
  return authClient.signIn.social({
    provider: "google",
    callbackURL: options?.callbackURL || "/",
  });
}

/**
 * Sign in with magic link
 */
export async function signInWithMagicLink(
  email: string,
  options?: {
    callbackURL?: string;
    name?: string;
  },
) {
  return authClient.signIn.magicLink({
    email,
    callbackURL: options?.callbackURL || "/",
    name: options?.name,
  });
}

/**
 * Sign in with passkey
 */
export async function signInWithPasskey() {
  return authClient.signIn.passkey();
}

/**
 * Register a new passkey for the current user
 */
export async function registerPasskey(name?: string) {
  return authClient.passkey.addPasskey({ name });
}

/**
 * Get the current session
 */
export async function getSession() {
  return authClient.getSession();
}

/**
 * Get the current user
 */
export async function getUser() {
  const session = await authClient.getSession();
  return session.data?.user || null;
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated() {
  const session = await authClient.getSession();
  return !!session.data?.session;
}

/**
 * Sign out
 */
export async function signOut() {
  return authClient.signOut();
}

/**
 * List all passkeys for the current user
 */
export async function listPasskeys() {
  return authClient.passkey.listUserPasskeys();
}

/**
 * Delete a passkey
 */
export async function deletePasskey(id: string) {
  return authClient.passkey.deletePasskey({ id });
}

// =============================================================================
// TWO-FACTOR AUTHENTICATION
// =============================================================================

/**
 * Enable 2FA - generates TOTP secret and returns setup info
 * Note: For OAuth users without password, pass empty string
 */
export async function enableTwoFactor(password = "") {
  return authClient.twoFactor.enable({ password });
}

/**
 * Verify 2FA setup with a TOTP code
 */
export async function verifyTwoFactorSetup(code: string) {
  return authClient.twoFactor.verifyTotp({ code });
}

/**
 * Disable 2FA - requires password (empty for OAuth users)
 */
export async function disableTwoFactor(password = "") {
  return authClient.twoFactor.disable({ password });
}

/**
 * Verify 2FA during login
 */
export async function verifyTwoFactor(code: string) {
  return authClient.twoFactor.verifyTotp({ code });
}

/**
 * Generate new backup codes
 */
export async function generateBackupCodes(password = "") {
  return authClient.twoFactor.generateBackupCodes({ password });
}

/**
 * Get the raw 2FA client for direct access to all methods
 */
export const twoFactorClient = authClient.twoFactor;

export default authClient;
