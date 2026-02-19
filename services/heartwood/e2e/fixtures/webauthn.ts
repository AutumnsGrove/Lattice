/**
 * WebAuthn Virtual Authenticator Fixture
 *
 * Uses Chrome DevTools Protocol (CDP) to create a virtual authenticator
 * that simulates passkey registration and authentication without requiring
 * a physical security key.
 *
 * This is the key insight that makes passkey E2E testing fully automatable:
 * CDP's WebAuthn domain provides complete control over virtual authenticators.
 *
 * @see https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */

import { test as base, type CDPSession } from "@playwright/test";

/**
 * Credential returned from the virtual authenticator
 */
export interface VirtualCredential {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  userHandle: string;
  signCount: number;
}

/**
 * Interface for controlling the virtual WebAuthn authenticator
 */
export interface WebAuthnAuthenticator {
  /** Unique identifier for this authenticator instance */
  authenticatorId: string;

  /** CDP session for advanced operations */
  cdpSession: CDPSession;

  /** Get all credentials stored in the authenticator */
  getCredentials(): Promise<VirtualCredential[]>;

  /** Clear all stored credentials */
  clearCredentials(): Promise<void>;

  /** Set whether user verification succeeds or fails */
  setUserVerified(verified: boolean): Promise<void>;

  /** Enable/disable automatic presence simulation (user tap) */
  setAutomaticPresence(enabled: boolean): Promise<void>;

  /** Add a credential directly (for test setup) */
  addCredential(credential: {
    credentialId: string;
    isResidentCredential: boolean;
    rpId: string;
    privateKey: string;
    userHandle: string;
    signCount: number;
  }): Promise<void>;
}

/**
 * Extended Playwright test with WebAuthn virtual authenticator fixture
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/webauthn';
 *
 * test('register passkey', async ({ page, webauthn }) => {
 *   // Navigate to passkey registration
 *   await page.goto('/dashboard/security');
 *   await page.click('button:has-text("Add passkey")');
 *
 *   // Virtual authenticator handles the WebAuthn ceremony automatically
 *   await expect(page.getByText('Passkey registered')).toBeVisible();
 *
 *   // Verify credential was stored
 *   const credentials = await webauthn.getCredentials();
 *   expect(credentials).toHaveLength(1);
 * });
 * ```
 */
export const test = base.extend<{ webauthn: WebAuthnAuthenticator }>({
  webauthn: async ({ page, context }, use) => {
    // Create a CDP session attached to the page
    const cdpSession = await context.newCDPSession(page);

    // Enable WebAuthn domain
    await cdpSession.send("WebAuthn.enable");

    // Create a virtual authenticator with platform authenticator characteristics
    // This simulates Touch ID, Face ID, Windows Hello, etc.
    const { authenticatorId } = await cdpSession.send(
      "WebAuthn.addVirtualAuthenticator",
      {
        options: {
          protocol: "ctap2", // CTAP2 is required for resident keys (passkeys)
          transport: "internal", // Platform authenticator (built-in)
          hasResidentKey: true, // Supports discoverable credentials (passkeys)
          hasUserVerification: true, // Supports user verification
          isUserVerified: true, // User is verified (biometric/PIN passed)
          automaticPresenceSimulation: true, // Automatically simulate user presence
        },
      },
    );

    // Create authenticator interface
    const authenticator: WebAuthnAuthenticator = {
      authenticatorId,
      cdpSession,

      async getCredentials(): Promise<VirtualCredential[]> {
        const response = await cdpSession.send("WebAuthn.getCredentials", {
          authenticatorId,
        });
        return response.credentials as VirtualCredential[];
      },

      async clearCredentials(): Promise<void> {
        await cdpSession.send("WebAuthn.clearCredentials", {
          authenticatorId,
        });
      },

      async setUserVerified(verified: boolean): Promise<void> {
        await cdpSession.send("WebAuthn.setUserVerified", {
          authenticatorId,
          isUserVerified: verified,
        });
      },

      async setAutomaticPresence(enabled: boolean): Promise<void> {
        await cdpSession.send("WebAuthn.setAutomaticPresenceSimulation", {
          authenticatorId,
          enabled,
        });
      },

      async addCredential(credential): Promise<void> {
        await cdpSession.send("WebAuthn.addCredential", {
          authenticatorId,
          credential,
        });
      },
    };

    // Provide authenticator to test
    await use(authenticator);

    // Cleanup: remove virtual authenticator after test
    await cdpSession.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId,
    });
    await cdpSession.detach();
  },
});

// Re-export expect for convenience
export { expect } from "@playwright/test";
