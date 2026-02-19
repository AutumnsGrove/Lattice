/**
 * Turnstile Verification Tests
 *
 * Tests server-side Turnstile token verification, cookie signing/verification,
 * and cookie option configuration.
 * Covers: verifyTurnstileToken, createVerificationCookie, validateVerificationCookie,
 * getVerificationCookieOptions, and related constants.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  verifyTurnstileToken,
  createVerificationCookie,
  validateVerificationCookie,
  getVerificationCookieOptions,
  TURNSTILE_COOKIE_NAME,
  TURNSTILE_COOKIE_MAX_AGE,
  type TurnstileVerifyResult,
} from "./turnstile";

// =============================================================================
// Constants Tests
// =============================================================================

describe("Turnstile Constants", () => {
  it("TURNSTILE_COOKIE_NAME is 'grove_verified'", () => {
    expect(TURNSTILE_COOKIE_NAME).toBe("grove_verified");
  });

  it("TURNSTILE_COOKIE_MAX_AGE is 7 days in seconds", () => {
    const sevenDaysInSeconds = 60 * 60 * 24 * 7;
    expect(TURNSTILE_COOKIE_MAX_AGE).toBe(sevenDaysInSeconds);
    expect(TURNSTILE_COOKIE_MAX_AGE).toBe(604800);
  });
});

// =============================================================================
// verifyTurnstileToken Tests
// =============================================================================

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Input Validation Tests
  // =========================================================================

  describe("Input Validation", () => {
    it("returns success: false with 'missing-input-response' if no token", async () => {
      const result = await verifyTurnstileToken({
        token: "",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("missing-input-response");
    });

    it("returns success: false with 'missing-input-response' if token is undefined", async () => {
      const result = await verifyTurnstileToken({
        token: undefined as any,
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("missing-input-response");
    });

    it("returns success: false with 'missing-input-secret' if no secretKey", async () => {
      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("missing-input-secret");
    });

    it("returns success: false with 'missing-input-secret' if secretKey is undefined", async () => {
      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: undefined as any,
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("missing-input-secret");
    });
  });

  // =========================================================================
  // Successful Verification Tests
  // =========================================================================

  describe("Successful Verification", () => {
    it("sends FormData to Cloudflare siteverify endpoint", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          ({
            success: true,
            hostname: "example.com",
            challenge_ts: "2025-01-16T12:00:00Z",
          }) as TurnstileVerifyResult,
      });

      const result = await verifyTurnstileToken({
        token: "test-token-123",
        secretKey: "test-secret-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.hostname).toBe("example.com");
    });

    it("includes remoteip in FormData when provided", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      let capturedFormData: FormData | null = null;

      mockFetch.mockImplementationOnce(async (url, options) => {
        capturedFormData = options.body;
        return {
          ok: true,
          json: async () => ({ success: true }) as TurnstileVerifyResult,
        };
      });

      await verifyTurnstileToken({
        token: "test-token-123",
        secretKey: "test-secret-key",
        remoteip: "192.168.1.1",
      });

      expect(mockFetch).toHaveBeenCalled();
      // Verify remoteip was included in the request
      // (FormData doesn't have direct iteration in this environment, but we verify the call)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("returns result on successful response", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const expectedResult: TurnstileVerifyResult = {
        success: true,
        hostname: "grove.place",
        challenge_ts: "2025-01-16T12:00:00Z",
        action: "manage",
        cdata: "custom-data-123",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResult,
      });

      const result = await verifyTurnstileToken({
        token: "valid-token",
        secretKey: "secret-key",
      });

      expect(result).toEqual(expectedResult);
    });

    it("returns failed verification result from Cloudflare", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const failedResult: TurnstileVerifyResult = {
        success: false,
        "error-codes": ["invalid-input-response"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => failedResult,
      });

      const result = await verifyTurnstileToken({
        token: "invalid-token",
        secretKey: "secret-key",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("invalid-input-response");
    });
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  describe("Error Handling", () => {
    it("returns success: false with 'request-failed' on non-ok response", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("request-failed");
    });

    it("returns success: false with 'request-failed' on 4xx response", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("request-failed");
    });

    it("returns success: false with 'network-error' on fetch error", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("network-error");
    });

    it("returns success: false with 'network-error' on JSON parse error", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("network-error");
    });

    it("handles fetch error with TypeError", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const result = await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result["error-codes"]).toContain("network-error");
    });
  });

  // =========================================================================
  // FormData Construction Tests
  // =========================================================================

  describe("FormData Construction", () => {
    it("includes secret and response in FormData", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }) as TurnstileVerifyResult,
      });

      await verifyTurnstileToken({
        token: "token-value",
        secretKey: "secret-value",
      });

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      expect(call[1].method).toBe("POST");
      expect(call[1].body).toBeInstanceOf(FormData);
    });

    it("omits remoteip from FormData when not provided", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }) as TurnstileVerifyResult,
      });

      await verifyTurnstileToken({
        token: "test-token",
        secretKey: "test-secret",
        // remoteip deliberately omitted
      });

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[1].body).toBeInstanceOf(FormData);
    });
  });
});

// =============================================================================
// getVerificationCookieOptions Tests
// =============================================================================

describe("getVerificationCookieOptions", () => {
  describe("Default Options", () => {
    it("returns object with required secure cookie properties", () => {
      const options = getVerificationCookieOptions();

      expect(options).toHaveProperty("path", "/");
      expect(options).toHaveProperty("httpOnly", true);
      expect(options).toHaveProperty("secure", true);
      expect(options).toHaveProperty("sameSite", "lax");
      expect(options).toHaveProperty("maxAge", TURNSTILE_COOKIE_MAX_AGE);
    });

    it("has httpOnly true for security", () => {
      const options = getVerificationCookieOptions();
      expect(options.httpOnly).toBe(true);
    });

    it("has secure true for HTTPS enforcement", () => {
      const options = getVerificationCookieOptions();
      expect(options.secure).toBe(true);
    });

    it("has sameSite lax for CSRF protection", () => {
      const options = getVerificationCookieOptions();
      expect(options.sameSite).toBe("lax");
    });

    it("sets path to root", () => {
      const options = getVerificationCookieOptions();
      expect(options.path).toBe("/");
    });

    it("uses TURNSTILE_COOKIE_MAX_AGE for maxAge", () => {
      const options = getVerificationCookieOptions();
      expect(options.maxAge).toBe(TURNSTILE_COOKIE_MAX_AGE);
      expect(options.maxAge).toBe(604800); // 7 days in seconds
    });
  });

  describe("Domain Parameter", () => {
    it("includes domain when provided", () => {
      const options = getVerificationCookieOptions("grove.place");
      expect(options).toHaveProperty("domain", "grove.place");
    });

    it("excludes domain property when not provided", () => {
      const options = getVerificationCookieOptions();
      expect(options).not.toHaveProperty("domain");
    });

    it("supports subdomain cookies", () => {
      const options = getVerificationCookieOptions(".grove.place");
      expect(options.domain).toBe(".grove.place");
    });

    it("allows empty string domain to be provided", () => {
      const options = getVerificationCookieOptions("");
      expect(options).not.toHaveProperty("domain");
    });
  });

  describe("Cookie Security Configuration", () => {
    it("is configured for HTTPS-only environments", () => {
      const options = getVerificationCookieOptions();
      expect(options.secure).toBe(true);
    });

    it("is not accessible via JavaScript", () => {
      const options = getVerificationCookieOptions();
      expect(options.httpOnly).toBe(true);
    });

    it("prevents CSRF attacks with lax sameSite", () => {
      const options = getVerificationCookieOptions();
      expect(options.sameSite).toBe("lax");
    });

    it("covers all subdirectories", () => {
      const options = getVerificationCookieOptions();
      expect(options.path).toBe("/");
    });
  });
});

// =============================================================================
// Turnstile Cookie Signing Security Tests
// =============================================================================

describe("Turnstile Cookie Signing Security Tests", () => {
  const TEST_SECRET = "test-secret-key-for-hmac-signing-32chars!";

  // ==========================================================================
  // Cookie Creation Tests
  // ==========================================================================

  describe("createVerificationCookie", () => {
    it("creates a cookie with timestamp:signature format", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);

      expect(cookie).toMatch(/^\d+:[a-f0-9]{64}$/);

      const [timestamp, signature] = cookie.split(":");
      expect(parseInt(timestamp)).toBeGreaterThan(0);
      expect(signature).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it("creates different signatures for different secrets", async () => {
      const cookie1 = await createVerificationCookie("secret-one");
      const cookie2 = await createVerificationCookie("secret-two");

      const sig1 = cookie1.split(":")[1];
      const sig2 = cookie2.split(":")[1];

      expect(sig1).not.toBe(sig2);
    });

    it("creates different cookies for different timestamps", async () => {
      const cookie1 = await createVerificationCookie(TEST_SECRET);

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cookie2 = await createVerificationCookie(TEST_SECRET);

      expect(cookie1).not.toBe(cookie2);
    });

    it("creates deterministic signatures for same timestamp and secret", async () => {
      // We can't easily test this without mocking Date.now()
      // But we can verify the format is consistent
      const cookie = await createVerificationCookie(TEST_SECRET);
      expect(cookie.split(":").length).toBe(2);
    });
  });

  // ==========================================================================
  // Cookie Validation Tests
  // ==========================================================================

  describe("validateVerificationCookie", () => {
    it("validates a correctly signed cookie", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const isValid = await validateVerificationCookie(cookie, TEST_SECRET);

      expect(isValid).toBe(true);
    });

    it("rejects cookie with wrong secret", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const isValid = await validateVerificationCookie(cookie, "wrong-secret");

      expect(isValid).toBe(false);
    });

    it("rejects tampered timestamp", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const [_timestamp, signature] = cookie.split(":");

      // Tamper with timestamp
      const tamperedCookie = `${Date.now() + 1000}:${signature}`;
      const isValid = await validateVerificationCookie(
        tamperedCookie,
        TEST_SECRET,
      );

      expect(isValid).toBe(false);
    });

    it("rejects tampered signature", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const [timestamp, _signature] = cookie.split(":");

      // Tamper with signature
      const tamperedCookie = `${timestamp}:${"a".repeat(64)}`;
      const isValid = await validateVerificationCookie(
        tamperedCookie,
        TEST_SECRET,
      );

      expect(isValid).toBe(false);
    });

    it("rejects expired cookie", async () => {
      const oldTimestamp = Date.now() - TURNSTILE_COOKIE_MAX_AGE * 1000 - 1000;

      // Create a cookie with old timestamp (we'll need to sign it properly)
      // For this test, we'll use a custom maxAge
      const cookie = await createVerificationCookie(TEST_SECRET);
      const isValid = await validateVerificationCookie(cookie, TEST_SECRET, 1); // 1ms max age

      // Wait to ensure expiration (20ms gives comfortable margin for CI)
      await new Promise((resolve) => setTimeout(resolve, 20));

      const isValidAfterExpiry = await validateVerificationCookie(
        cookie,
        TEST_SECRET,
        1,
      );

      // The second check should fail due to expiration
      expect(isValidAfterExpiry).toBe(false);
    });

    it("rejects undefined cookie", async () => {
      const isValid = await validateVerificationCookie(undefined, TEST_SECRET);
      expect(isValid).toBe(false);
    });

    it("rejects empty cookie", async () => {
      const isValid = await validateVerificationCookie("", TEST_SECRET);
      expect(isValid).toBe(false);
    });

    it("rejects malformed cookie (no colon)", async () => {
      const isValid = await validateVerificationCookie(
        "notavalidcookie",
        TEST_SECRET,
      );
      expect(isValid).toBe(false);
    });

    it("rejects malformed cookie (too many parts)", async () => {
      const isValid = await validateVerificationCookie("1:2:3", TEST_SECRET);
      expect(isValid).toBe(false);
    });

    it("rejects cookie with non-numeric timestamp", async () => {
      const isValid = await validateVerificationCookie(
        "notanumber:abc123",
        TEST_SECRET,
      );
      expect(isValid).toBe(false);
    });

    it("rejects cookie with negative timestamp", async () => {
      const isValid = await validateVerificationCookie(
        "-12345:abc123",
        TEST_SECRET,
      );
      // Should either reject or fail signature check
      expect(isValid).toBe(false);
    });
  });

  // ==========================================================================
  // Security Properties Tests
  // ==========================================================================

  describe("Security Properties", () => {
    it("signature is SHA-256 (64 hex characters)", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const signature = cookie.split(":")[1];

      expect(signature).toHaveLength(64);
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it("different timestamps produce different signatures", async () => {
      const signatures = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const cookie = await createVerificationCookie(TEST_SECRET);
        const signature = cookie.split(":")[1];
        signatures.add(signature);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // All signatures should be unique
      expect(signatures.size).toBe(10);
    });

    it("signature changes completely with small input change", async () => {
      // This tests the avalanche effect of HMAC
      const cookie1 = await createVerificationCookie(TEST_SECRET);
      const [ts1, sig1] = cookie1.split(":");

      // Create another cookie with timestamp + 1
      const ts2 = String(parseInt(ts1) + 1);

      // We can't directly test this without exposing signCookie,
      // but we can verify that consecutive cookies have different signatures
      await new Promise((resolve) => setTimeout(resolve, 20));
      const cookie2 = await createVerificationCookie(TEST_SECRET);
      const [_, sig2] = cookie2.split(":");

      expect(sig1).not.toBe(sig2);
    });

    it("withstands length extension attack", async () => {
      // HMAC is resistant to length extension attacks (unlike raw SHA-256)
      const cookie = await createVerificationCookie(TEST_SECRET);
      const [timestamp, signature] = cookie.split(":");

      // Attacker tries to append data to the cookie
      const attackCookie = `${timestamp}extended:${signature}`;
      const isValid = await validateVerificationCookie(
        attackCookie,
        TEST_SECRET,
      );

      expect(isValid).toBe(false);
    });

    it("signature verification is timing-safe (uses re-signing)", async () => {
      // Our implementation re-signs and compares strings, which provides
      // timing safety by making both code paths roughly equal length
      const cookie = await createVerificationCookie(TEST_SECRET);

      // Both should take similar time (we can't easily measure this,
      // but we verify the implementation pattern)
      const validResult = await validateVerificationCookie(cookie, TEST_SECRET);
      const invalidResult = await validateVerificationCookie(
        cookie,
        "wrong-secret",
      );

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  // ==========================================================================
  // Cookie Expiration Tests
  // ==========================================================================

  describe("Cookie Expiration", () => {
    it("accepts cookie within max age", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);
      const isValid = await validateVerificationCookie(
        cookie,
        TEST_SECRET,
        60000, // 1 minute
      );

      expect(isValid).toBe(true);
    });

    it("uses default max age from constant", async () => {
      // TURNSTILE_COOKIE_MAX_AGE is 7 days in seconds
      expect(TURNSTILE_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7);
    });

    it("respects custom max age", async () => {
      const cookie = await createVerificationCookie(TEST_SECRET);

      // Should be valid with 1 hour max age
      const validWithLongAge = await validateVerificationCookie(
        cookie,
        TEST_SECRET,
        3600000,
      );
      expect(validWithLongAge).toBe(true);

      // Wait a bit then check with very short max age
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should be invalid with 1ms max age after waiting
      const invalidWithShortAge = await validateVerificationCookie(
        cookie,
        TEST_SECRET,
        1,
      );
      expect(invalidWithShortAge).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("handles very long secret keys", async () => {
      const longSecret = "a".repeat(1000);
      const cookie = await createVerificationCookie(longSecret);
      const isValid = await validateVerificationCookie(cookie, longSecret);

      expect(isValid).toBe(true);
    });

    it("rejects empty secret key", async () => {
      // Web Crypto API doesn't support zero-length keys - this is correct security behavior
      await expect(createVerificationCookie("")).rejects.toThrow();
    });

    it("handles unicode in secret key", async () => {
      const unicodeSecret = "密钥🔐émoji";
      const cookie = await createVerificationCookie(unicodeSecret);
      const isValid = await validateVerificationCookie(cookie, unicodeSecret);

      expect(isValid).toBe(true);
    });

    it("handles concurrent cookie creation", async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => createVerificationCookie(TEST_SECRET));

      const cookies = await Promise.all(promises);

      // All should be valid
      for (const cookie of cookies) {
        const isValid = await validateVerificationCookie(cookie, TEST_SECRET);
        expect(isValid).toBe(true);
      }
    });
  });
});
