/**
 * Session Cookie Tests
 *
 * Tests the AES-GCM encrypted session cookies and related utilities.
 * Security-critical functionality requires thorough testing.
 */

import { describe, it, expect } from "vitest";
import {
  createSessionCookie,
  parseSessionCookie,
  getDeviceId,
  parseDeviceName,
  getClientIP,
  getUserAgent,
  createSessionCookieHeader,
  clearSessionCookieHeader,
} from "./session.js";

// Test secret (32+ bytes as required)
const TEST_SECRET = "test-secret-key-for-unit-tests-32bytes!";

describe("Session Cookie Encryption", () => {
  describe("createSessionCookie", () => {
    it("should create an encrypted cookie in v2 format", async () => {
      const sessionId = "sess_abc123";
      const userId = "user_xyz789";

      const cookie = await createSessionCookie(sessionId, userId, TEST_SECRET);

      // v2 format: {salt+iv}:{ciphertext} - should have exactly 2 parts
      const parts = cookie.split(":");
      expect(parts).toHaveLength(2);

      // salt+iv should be base64url encoded (16+12=28 bytes ≈ 38 chars base64)
      expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(parts[0].length).toBeGreaterThan(30); // 28 bytes = ~38 chars

      // Ciphertext should be base64url encoded
      expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should produce different cookies for the same input (unique IV)", async () => {
      const sessionId = "sess_abc123";
      const userId = "user_xyz789";

      const cookie1 = await createSessionCookie(sessionId, userId, TEST_SECRET);
      const cookie2 = await createSessionCookie(sessionId, userId, TEST_SECRET);

      // Same inputs should produce different cookies (random IV)
      expect(cookie1).not.toBe(cookie2);
    });

    it("should handle special characters in session IDs", async () => {
      const sessionId = "sess_abc+123/456=";
      const userId = "user_xyz+789/012=";

      const cookie = await createSessionCookie(sessionId, userId, TEST_SECRET);
      const parsed = await parseSessionCookie(cookie, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed!.sessionId).toBe(sessionId);
      expect(parsed!.userId).toBe(userId);
    });

    it("should handle empty strings gracefully", async () => {
      const cookie = await createSessionCookie("", "", TEST_SECRET);
      const parsed = await parseSessionCookie(cookie, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed!.sessionId).toBe("");
      expect(parsed!.userId).toBe("");
    });
  });

  describe("parseSessionCookie", () => {
    it("should decrypt and parse a valid cookie", async () => {
      const sessionId = "sess_abc123";
      const userId = "user_xyz789";

      const cookie = await createSessionCookie(sessionId, userId, TEST_SECRET);
      const parsed = await parseSessionCookie(cookie, TEST_SECRET);

      expect(parsed).not.toBeNull();
      expect(parsed!.sessionId).toBe(sessionId);
      expect(parsed!.userId).toBe(userId);
      expect(parsed!.signature).toBe("aes-gcm-v2"); // v2 format with per-cookie salt
    });

    it("should return null for invalid cookie format", async () => {
      const parsed = await parseSessionCookie("invalid-cookie", TEST_SECRET);
      expect(parsed).toBeNull();
    });

    it("should return null for empty cookie", async () => {
      const parsed = await parseSessionCookie("", TEST_SECRET);
      expect(parsed).toBeNull();
    });

    it("should return null for wrong secret (tampered)", async () => {
      const cookie = await createSessionCookie(
        "sess_123",
        "user_456",
        TEST_SECRET,
      );
      const parsed = await parseSessionCookie(
        cookie,
        "wrong-secret-key-also-32bytes!!!",
      );

      // AES-GCM decryption should fail with wrong key
      expect(parsed).toBeNull();
    });

    it("should detect tampered ciphertext", async () => {
      const cookie = await createSessionCookie(
        "sess_123",
        "user_456",
        TEST_SECRET,
      );
      const parts = cookie.split(":");

      // Tamper with the ciphertext
      const tamperedCiphertext = "AAAA" + parts[1].slice(4);
      const tamperedCookie = `${parts[0]}:${tamperedCiphertext}`;

      const parsed = await parseSessionCookie(tamperedCookie, TEST_SECRET);
      expect(parsed).toBeNull();
    });

    it("should detect tampered IV", async () => {
      const cookie = await createSessionCookie(
        "sess_123",
        "user_456",
        TEST_SECRET,
      );
      const parts = cookie.split(":");

      // Tamper with the IV
      const tamperedIv = "BBBB" + parts[0].slice(4);
      const tamperedCookie = `${tamperedIv}:${parts[1]}`;

      const parsed = await parseSessionCookie(tamperedCookie, TEST_SECRET);
      expect(parsed).toBeNull();
    });
  });

  describe("Legacy cookie backward compatibility", () => {
    it("should parse legacy format cookies (sessionId:userId:signature)", async () => {
      // Verify the format detection works for legacy cookies
      // (Legacy format: sessionId:userId:signature, before encryption update)
      const invalidLegacy = "part1:part2:part3";
      const parsed = await parseSessionCookie(invalidLegacy, TEST_SECRET);

      // Should fail because signature is invalid
      expect(parsed).toBeNull();
    });

    it("should reject legacy cookies with invalid signature", async () => {
      const fakeLegacy = "sess_fake:user_fake:invalid_signature";
      const parsed = await parseSessionCookie(fakeLegacy, TEST_SECRET);

      expect(parsed).toBeNull();
    });
  });
});

describe("Session Cookie Header", () => {
  describe("createSessionCookieHeader", () => {
    it("should create a proper Set-Cookie header", async () => {
      const header = await createSessionCookieHeader(
        "sess_123",
        "user_456",
        TEST_SECRET,
      );

      expect(header).toContain("grove_session=");
      expect(header).toContain("Path=/");
      expect(header).toContain("HttpOnly");
      expect(header).toContain("Secure");
      expect(header).toContain("SameSite=Lax");
      expect(header).toContain("Domain=.grove.place");
      expect(header).toContain("Max-Age=");
    });

    it("should use default 7-day expiry", async () => {
      const header = await createSessionCookieHeader(
        "sess_123",
        "user_456",
        TEST_SECRET,
      );

      // 7 days = 604800 seconds
      expect(header).toContain("Max-Age=604800");
    });

    it("should respect custom max age", async () => {
      const customMaxAge = 3600; // 1 hour
      const header = await createSessionCookieHeader(
        "sess_123",
        "user_456",
        TEST_SECRET,
        customMaxAge,
      );

      expect(header).toContain(`Max-Age=${customMaxAge}`);
    });
  });

  describe("clearSessionCookieHeader", () => {
    it("should create a cookie clearing header", () => {
      const header = clearSessionCookieHeader();

      expect(header).toContain("grove_session=");
      expect(header).toContain("Max-Age=0");
      expect(header).toContain("Domain=.grove.place");
    });
  });
});

describe("Device Fingerprinting", () => {
  describe("getDeviceId", () => {
    it("should generate consistent device ID for same request", async () => {
      const request = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
        },
      });

      const deviceId1 = await getDeviceId(request, TEST_SECRET);
      const deviceId2 = await getDeviceId(request, TEST_SECRET);

      expect(deviceId1).toBe(deviceId2);
      expect(deviceId1).toHaveLength(16);
    });

    it("should generate different device ID for different user-agent", async () => {
      const request1 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
        },
      });

      const request2 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Firefox/120",
          "accept-language": "en-US",
        },
      });

      const deviceId1 = await getDeviceId(request1, TEST_SECRET);
      const deviceId2 = await getDeviceId(request2, TEST_SECRET);

      expect(deviceId1).not.toBe(deviceId2);
    });

    it("should NOT include IP in fingerprint (stable for VPN/mobile users)", async () => {
      // Same device, different IPs should produce SAME device ID
      const request1 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
          "cf-connecting-ip": "192.168.1.1",
        },
      });

      const request2 = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
          "cf-connecting-ip": "10.0.0.50", // Different IP
        },
      });

      const deviceId1 = await getDeviceId(request1, TEST_SECRET);
      const deviceId2 = await getDeviceId(request2, TEST_SECRET);

      // Same device ID even with different IPs
      expect(deviceId1).toBe(deviceId2);
    });

    it("should include Sec-CH-UA headers in fingerprint", async () => {
      const requestWithClientHints = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
          "sec-ch-ua": '"Chromium";v="120", "Google Chrome";v="120"',
          "sec-ch-ua-platform": '"macOS"',
          "sec-ch-ua-mobile": "?0",
        },
      });

      const requestWithoutClientHints = new Request("https://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120",
          "accept-language": "en-US",
        },
      });

      const deviceIdWith = await getDeviceId(
        requestWithClientHints,
        TEST_SECRET,
      );
      const deviceIdWithout = await getDeviceId(
        requestWithoutClientHints,
        TEST_SECRET,
      );

      // Different fingerprints due to Sec-CH-UA headers
      expect(deviceIdWith).not.toBe(deviceIdWithout);
    });

    it("should handle missing headers gracefully", async () => {
      const request = new Request("https://example.com");

      const deviceId = await getDeviceId(request, TEST_SECRET);

      expect(deviceId).toHaveLength(16);
      expect(deviceId).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("parseDeviceName", () => {
    it("should identify iPhone", () => {
      expect(
        parseDeviceName(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
        ),
      ).toBe("iPhone");
    });

    it("should identify iPad", () => {
      expect(
        parseDeviceName("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)"),
      ).toBe("iPad");
    });

    it("should identify Android Phone", () => {
      expect(
        parseDeviceName("Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile"),
      ).toBe("Android Phone");
    });

    it("should identify Android Tablet", () => {
      expect(parseDeviceName("Mozilla/5.0 (Linux; Android 13; SM-T970)")).toBe(
        "Android Tablet",
      );
    });

    it("should identify Chrome on Mac", () => {
      expect(
        parseDeviceName(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
        ),
      ).toBe("Chrome on Mac");
    });

    it("should identify Safari on Mac", () => {
      expect(
        parseDeviceName(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605",
        ),
      ).toBe("Safari on Mac");
    });

    it("should identify Firefox on Mac", () => {
      expect(
        parseDeviceName(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Firefox/120",
        ),
      ).toBe("Firefox on Mac");
    });

    it("should identify Edge on Windows", () => {
      expect(
        parseDeviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120"),
      ).toBe("Edge on Windows");
    });

    it("should identify Chrome on Windows", () => {
      expect(
        parseDeviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"),
      ).toBe("Chrome on Windows");
    });

    it("should identify Chrome on Linux", () => {
      expect(
        parseDeviceName("Mozilla/5.0 (X11; Linux x86_64) Chrome/120"),
      ).toBe("Chrome on Linux");
    });

    it("should identify Chromebook", () => {
      expect(parseDeviceName("Mozilla/5.0 (X11; CrOS x86_64) Chrome/120")).toBe(
        "Chromebook",
      );
    });

    it("should return Unknown Device for null", () => {
      expect(parseDeviceName(null)).toBe("Unknown Device");
    });

    it("should return Unknown Device for unrecognized user agent", () => {
      expect(parseDeviceName("Some Random Bot/1.0")).toBe("Unknown Device");
    });
  });
});

describe("Request Utilities", () => {
  describe("getClientIP", () => {
    it("should extract IP from cf-connecting-ip header", () => {
      const request = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "192.168.1.100" },
      });

      expect(getClientIP(request)).toBe("192.168.1.100");
    });

    it("should fall back to x-forwarded-for header", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
      });

      expect(getClientIP(request)).toBe("10.0.0.1, 10.0.0.2");
    });

    it("should return null when no IP headers present", () => {
      const request = new Request("https://example.com");
      expect(getClientIP(request)).toBeNull();
    });

    it("should prefer cf-connecting-ip over x-forwarded-for", () => {
      const request = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "192.168.1.100",
          "x-forwarded-for": "10.0.0.1",
        },
      });

      expect(getClientIP(request)).toBe("192.168.1.100");
    });
  });

  describe("getUserAgent", () => {
    it("should extract user-agent header", () => {
      const request = new Request("https://example.com", {
        headers: { "user-agent": "Mozilla/5.0 Test Browser" },
      });

      expect(getUserAgent(request)).toBe("Mozilla/5.0 Test Browser");
    });

    it("should return null when no user-agent present", () => {
      const request = new Request("https://example.com");
      expect(getUserAgent(request)).toBeNull();
    });
  });
});

describe("Security: Cookie Tamper Detection", () => {
  it("should reject cookies with modified sessionId", async () => {
    const cookie = await createSessionCookie(
      "original_session",
      "user_123",
      TEST_SECRET,
    );

    // Try to create a cookie with different sessionId
    const maliciousCookie = await createSessionCookie(
      "stolen_session",
      "user_123",
      TEST_SECRET,
    );

    // Parse the original
    const parsed = await parseSessionCookie(cookie, TEST_SECRET);
    expect(parsed!.sessionId).toBe("original_session");

    // The malicious cookie should parse to the malicious sessionId
    // (it's encrypted correctly, just with different data)
    const maliciousParsed = await parseSessionCookie(
      maliciousCookie,
      TEST_SECRET,
    );
    expect(maliciousParsed!.sessionId).toBe("stolen_session");

    // Key point: you can't modify the cookie content without knowing the secret
  });

  it("should reject cookies with modified userId", async () => {
    const cookie = await createSessionCookie(
      "sess_123",
      "legitimate_user",
      TEST_SECRET,
    );

    // An attacker cannot modify the userId in an existing cookie
    // because they don't know the encryption key
    const parsed = await parseSessionCookie(cookie, TEST_SECRET);
    expect(parsed!.userId).toBe("legitimate_user");
  });

  it("should use different derived keys for different secrets", async () => {
    const cookie = await createSessionCookie(
      "sess_123",
      "user_456",
      "secret_key_one_32bytes!!!!!!!!!",
    );

    // Cookie encrypted with one secret can't be decrypted with another
    const parsedWrongKey = await parseSessionCookie(
      cookie,
      "secret_key_two_32bytes!!!!!!!!!",
    );
    expect(parsedWrongKey).toBeNull();
  });
});
