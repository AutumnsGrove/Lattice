/**
 * Tests for passkey-utils.ts
 *
 * Tests device name detection and passkey support checking functionality.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { getDeviceName, checkPasskeySupport } from "./passkey-utils";

describe("passkey-utils", () => {
  describe("getDeviceName", () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        configurable: true,
      });
    });

    it("returns 'MacBook' for Mac platform", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "MacIntel", userAgent: "" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("MacBook");
    });

    it("returns 'Windows PC' for Windows platform", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "Win32", userAgent: "" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("Windows PC");
    });

    it("returns 'Linux Device' for Linux platform", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "Linux x86_64", userAgent: "" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("Linux Device");
    });

    it("returns 'iPhone' for iPhone userAgent", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "", userAgent: "iPhone OS 17_0" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("iPhone");
    });

    it("returns 'iPad' for iPad userAgent", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "", userAgent: "iPad OS 17_0" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("iPad");
    });

    it("returns 'Android Device' for Android userAgent", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "", userAgent: "Mozilla/5.0 (Linux; Android 14)" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("Android Device");
    });

    it("returns 'My Passkey' for unknown platform", () => {
      Object.defineProperty(global, "navigator", {
        value: { platform: "Unknown", userAgent: "" },
        configurable: true,
      });
      expect(getDeviceName()).toBe("My Passkey");
    });

    it("returns 'My Passkey' when navigator is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        configurable: true,
      });
      expect(getDeviceName()).toBe("My Passkey");
    });
  });

  describe("checkPasskeySupport", () => {
    const originalWindow = global.window;
    const originalPublicKeyCredential = global.PublicKeyCredential;

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
    });

    it("returns false when WebAuthn not available", async () => {
      // Simulate no PublicKeyCredential
      delete (global as Record<string, unknown>).PublicKeyCredential;
      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: undefined },
        configurable: true,
        writable: true,
      });
      expect(await checkPasskeySupport()).toBe(false);
    });

    it("returns true when platform authenticator is available", async () => {
      // Mock PublicKeyCredential as a function (class) with the static method
      const mockPublicKeyCredential =
        vi.fn() as unknown as typeof PublicKeyCredential;
      (
        mockPublicKeyCredential as unknown as Record<string, unknown>
      ).isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockResolvedValue(true);

      // Set on both window and global
      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockPublicKeyCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockPublicKeyCredential;

      expect(await checkPasskeySupport()).toBe(true);
    });

    it("returns false when platform authenticator is not available", async () => {
      const mockPublicKeyCredential =
        vi.fn() as unknown as typeof PublicKeyCredential;
      (
        mockPublicKeyCredential as unknown as Record<string, unknown>
      ).isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockResolvedValue(false);

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockPublicKeyCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockPublicKeyCredential;

      expect(await checkPasskeySupport()).toBe(false);
    });

    it("returns false when check throws an error", async () => {
      const mockPublicKeyCredential =
        vi.fn() as unknown as typeof PublicKeyCredential;
      (
        mockPublicKeyCredential as unknown as Record<string, unknown>
      ).isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockRejectedValue(new Error("Not supported"));

      Object.defineProperty(global, "window", {
        value: { PublicKeyCredential: mockPublicKeyCredential },
        configurable: true,
        writable: true,
      });
      global.PublicKeyCredential = mockPublicKeyCredential;

      expect(await checkPasskeySupport()).toBe(false);
    });
  });
});
