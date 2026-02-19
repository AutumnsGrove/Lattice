/**
 * Tests for passkey-authenticate.ts
 *
 * Tests WebAuthn authentication flow including capability detection,
 * the full authentication ceremony, and error handling.
 *
 * These tests mock the browser WebAuthn APIs and fetch to test
 * the authentication flow in isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isWebAuthnSupported,
  hasPasskeysAvailable,
  isConditionalMediationSupported,
  authenticateWithPasskey,
} from "./passkey-authenticate.js";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock PublicKeyCredential class with configurable static methods
 */
function createMockPublicKeyCredential(
  options: {
    platformAuthenticatorAvailable?: boolean;
    conditionalMediationAvailable?: boolean;
  } = {},
) {
  const mock = vi.fn() as unknown as typeof PublicKeyCredential;

  (
    mock as unknown as Record<string, unknown>
  ).isUserVerifyingPlatformAuthenticatorAvailable = vi
    .fn()
    .mockResolvedValue(options.platformAuthenticatorAvailable ?? true);

  if (options.conditionalMediationAvailable !== undefined) {
    (
      mock as unknown as Record<string, unknown>
    ).isConditionalMediationAvailable = vi
      .fn()
      .mockResolvedValue(options.conditionalMediationAvailable);
  }

  return mock;
}

/**
 * Create a mock WebAuthn credential response
 */
function createMockCredential() {
  return {
    id: "credential-id-123",
    rawId: new ArrayBuffer(16),
    type: "public-key",
    response: {
      authenticatorData: new ArrayBuffer(37),
      clientDataJSON: new ArrayBuffer(100),
      signature: new ArrayBuffer(64),
      userHandle: new ArrayBuffer(16),
    },
  };
}

// =============================================================================
// Capability Detection Tests
// =============================================================================

describe("passkey-authenticate", () => {
  const originalWindow = global.window;
  const originalPublicKeyCredential = global.PublicKeyCredential;
  const originalNavigator = global.navigator;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original globals
    Object.defineProperty(global, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });

    if (originalPublicKeyCredential !== undefined) {
      global.PublicKeyCredential = originalPublicKeyCredential;
    } else {
      delete (global as Record<string, unknown>).PublicKeyCredential;
    }

    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });

    global.fetch = originalFetch;
  });

  // ===========================================================================
  // isWebAuthnSupported
  // ===========================================================================

  describe("isWebAuthnSupported", () => {
    it("returns false when window is undefined (SSR)", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(isWebAuthnSupported()).toBe(false);
    });

    it("returns false when PublicKeyCredential is undefined", () => {
      Object.defineProperty(global, "window", {
        value: {},
        configurable: true,
        writable: true,
      });
      delete (global as Record<string, unknown>).PublicKeyCredential;

      expect(isWebAuthnSupported()).toBe(false);
    });

    it("returns false when isUserVerifyingPlatformAuthenticatorAvailable is not a function", () => {
      const mockCredential = vi.fn() as unknown as typeof PublicKeyCredential;
      // Don't add the static method

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(isWebAuthnSupported()).toBe(false);
    });

    it("returns true when WebAuthn is fully supported", () => {
      const mockCredential = createMockPublicKeyCredential();

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(isWebAuthnSupported()).toBe(true);
    });
  });

  // ===========================================================================
  // hasPasskeysAvailable
  // ===========================================================================

  describe("hasPasskeysAvailable", () => {
    it("returns false when WebAuthn is not supported", async () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(await hasPasskeysAvailable()).toBe(false);
    });

    it("returns true when platform authenticator is available", async () => {
      const mockCredential = createMockPublicKeyCredential({
        platformAuthenticatorAvailable: true,
      });

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await hasPasskeysAvailable()).toBe(true);
    });

    it("returns false when platform authenticator is not available", async () => {
      const mockCredential = createMockPublicKeyCredential({
        platformAuthenticatorAvailable: false,
      });

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await hasPasskeysAvailable()).toBe(false);
    });

    it("returns false when the check throws an error", async () => {
      const mockCredential = vi.fn() as unknown as typeof PublicKeyCredential;
      (
        mockCredential as unknown as Record<string, unknown>
      ).isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockRejectedValue(new Error("Not supported"));

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await hasPasskeysAvailable()).toBe(false);
    });
  });

  // ===========================================================================
  // isConditionalMediationSupported
  // ===========================================================================

  describe("isConditionalMediationSupported", () => {
    it("returns false when WebAuthn is not supported", async () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(await isConditionalMediationSupported()).toBe(false);
    });

    it("returns false when isConditionalMediationAvailable is not a function", async () => {
      const mockCredential = createMockPublicKeyCredential();
      // Don't add isConditionalMediationAvailable

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await isConditionalMediationSupported()).toBe(false);
    });

    it("returns true when conditional mediation is available", async () => {
      const mockCredential = createMockPublicKeyCredential({
        conditionalMediationAvailable: true,
      });

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await isConditionalMediationSupported()).toBe(true);
    });

    it("returns false when conditional mediation is not available", async () => {
      const mockCredential = createMockPublicKeyCredential({
        conditionalMediationAvailable: false,
      });

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockCredential;

      expect(await isConditionalMediationSupported()).toBe(false);
    });
  });

  // ===========================================================================
  // authenticateWithPasskey
  // ===========================================================================

  describe("authenticateWithPasskey", () => {
    // Setup for authentication tests
    function setupAuthenticationMocks(
      options: {
        webAuthnSupported?: boolean;
        optionsResponse?: { ok: boolean; data?: unknown };
        verifyResponse?: { ok: boolean; data?: unknown };
        credentialResult?: unknown;
        credentialError?: Error;
      } = {},
    ) {
      // Setup WebAuthn support
      if (options.webAuthnSupported !== false) {
        const mockCredential = createMockPublicKeyCredential();
        Object.defineProperty(global, "window", {
          value: { PublicKeyCredential: mockCredential },
          configurable: true,
          writable: true,
        });
        global.PublicKeyCredential = mockCredential;
      } else {
        Object.defineProperty(global, "window", {
          value: {},
          configurable: true,
          writable: true,
        });
        delete (global as Record<string, unknown>).PublicKeyCredential;
      }

      // Setup navigator.credentials.get
      // Note: Use 'in' check because null is a valid value we want to test
      const credentialsGet = options.credentialError
        ? vi.fn().mockRejectedValue(options.credentialError)
        : vi
            .fn()
            .mockResolvedValue(
              "credentialResult" in options
                ? options.credentialResult
                : createMockCredential(),
            );

      Object.defineProperty(global, "navigator", {
        value: {
          credentials: {
            get: credentialsGet,
          },
        },
        configurable: true,
      });

      // Setup fetch mock
      const mockFetch = vi.fn();

      // Options endpoint response
      if (options.optionsResponse) {
        mockFetch.mockResolvedValueOnce({
          ok: options.optionsResponse.ok,
          json: () =>
            Promise.resolve(
              options.optionsResponse.data ?? {
                challenge: "Y2hhbGxlbmdl", // base64url encoded "challenge"
                rpId: "grove.place",
                timeout: 60000,
                userVerification: "preferred",
                allowCredentials: [],
              },
            ),
        });
      }

      // Verify endpoint response
      if (options.verifyResponse) {
        mockFetch.mockResolvedValueOnce({
          ok: options.verifyResponse.ok,
          json: () =>
            Promise.resolve(
              options.verifyResponse.data ?? {
                success: true,
                redirectTo: "/dashboard",
              },
            ),
        });
      }

      global.fetch = mockFetch;

      return { mockFetch, credentialsGet };
    }

    it("returns error when WebAuthn is not supported", async () => {
      setupAuthenticationMocks({ webAuthnSupported: false });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("returns error when options endpoint fails", async () => {
      setupAuthenticationMocks({
        optionsResponse: {
          ok: false,
          data: { message: "Server error" },
        },
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server error");
    });

    it("returns error when user cancels the ceremony", async () => {
      const notAllowedError = new Error("User cancelled");
      notAllowedError.name = "NotAllowedError";

      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        credentialError: notAllowedError,
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("cancelled");
    });

    it("returns error when no passkey is found", async () => {
      const invalidStateError = new Error("No credential found");
      invalidStateError.name = "InvalidStateError";

      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        credentialError: invalidStateError,
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No passkey found");
    });

    it("returns error when credential is null", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        credentialResult: null,
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No passkey was selected");
    });

    it("returns error when verification fails", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        verifyResponse: {
          ok: false,
          data: { message: "Invalid signature" },
        },
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid signature");
    });

    it("returns success with redirect URL on successful authentication", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        verifyResponse: {
          ok: true,
          data: { success: true, redirectTo: "/dashboard" },
        },
      });

      const result = await authenticateWithPasskey({ returnTo: "/dashboard" });

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/dashboard");
    });

    it("uses default return URL when none specified", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        verifyResponse: {
          ok: true,
          data: { success: true }, // No redirectTo in response
        },
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/arbor"); // Default
    });

    it("sends credential data to verify endpoint", async () => {
      const { mockFetch } = setupAuthenticationMocks({
        optionsResponse: { ok: true },
        verifyResponse: { ok: true, data: { success: true } },
      });

      await authenticateWithPasskey({ returnTo: "/profile" });

      // Verify endpoint should be called with credential data
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const verifyCall = mockFetch.mock.calls[1];
      expect(verifyCall[0]).toBe("/api/passkey/authenticate/verify");
      expect(verifyCall[1].method).toBe("POST");

      const body = JSON.parse(verifyCall[1].body);
      expect(body.credential).toBeDefined();
      expect(body.credential.id).toBe("credential-id-123");
      expect(body.returnTo).toBe("/profile");
    });

    it("handles verification response with success false", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        verifyResponse: {
          ok: true,
          data: { success: false, error: "User not found" },
        },
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("handles security errors gracefully", async () => {
      const securityError = new Error("Security error");
      securityError.name = "SecurityError";

      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        credentialError: securityError,
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toContain("not available on this origin");
    });

    it("handles unknown errors gracefully", async () => {
      setupAuthenticationMocks({
        optionsResponse: { ok: true },
        credentialError: new Error("Something unexpected"),
      });

      const result = await authenticateWithPasskey();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Something went wrong. Please try again.");
    });
  });
});
