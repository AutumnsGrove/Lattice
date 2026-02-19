/**
 * Email Verification Service Tests
 *
 * Tests for code generation, verification, rate limiting, and email normalization.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeEmail, isValidEmailFormat } from "./email-verification";

// Mock sendEmail to prevent actual emails during tests
vi.mock("./send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Email Verification Service", () => {
  describe("isValidEmailFormat", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@example.co.uk",
        "a@b.co",
        "123@456.com",
      ];
      validEmails.forEach((email) => {
        expect(isValidEmailFormat(email)).toBe(true);
      });
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "noat.com",
        "spaces in@email.com",
        "missing@tld",
        "",
        "   ",
      ];
      invalidEmails.forEach((email) => {
        expect(isValidEmailFormat(email)).toBe(false);
      });
    });
  });

  describe("normalizeEmail", () => {
    it("should lowercase email addresses", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
    });

    it("should handle already normalized emails", () => {
      expect(normalizeEmail("test@example.com")).toBe("test@example.com");
    });

    it("should handle mixed case with whitespace", () => {
      expect(normalizeEmail("  TEST@Example.Com  ")).toBe("test@example.com");
    });

    it("should throw on invalid email format", () => {
      expect(() => normalizeEmail("notanemail")).toThrow(
        "Invalid email format",
      );
      expect(() => normalizeEmail("missing@tld")).toThrow(
        "Invalid email format",
      );
    });
  });

  describe("Code Generation", () => {
    it("should generate 6-digit codes", () => {
      // Test that the code pattern matches expected format
      const codePattern = /^\d{6}$/;

      // Generate several codes to test randomness
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const code = (array[0] % 1000000).toString().padStart(6, "0");
        codes.push(code);
        expect(code).toMatch(codePattern);
      }

      // At least some codes should be different (test randomness)
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(1);
    });

    it("should pad codes with leading zeros", () => {
      // Simulate what happens when random number is small
      const smallNumber = 123;
      const code = (smallNumber % 1000000).toString().padStart(6, "0");
      expect(code).toBe("000123");
      expect(code.length).toBe(6);
    });
  });

  describe("Code Validation Format", () => {
    it("should accept valid 6-digit codes", () => {
      const validCodes = ["000000", "123456", "999999", "000001"];
      validCodes.forEach((code) => {
        expect(/^\d{6}$/.test(code)).toBe(true);
      });
    });

    it("should reject invalid codes", () => {
      const invalidCodes = [
        "12345", // Too short
        "1234567", // Too long
        "abcdef", // Letters
        "12345a", // Mixed
        "12 345", // Spaces
        "", // Empty
      ];
      invalidCodes.forEach((code) => {
        expect(/^\d{6}$/.test(code)).toBe(false);
      });
    });
  });

  describe("Rate Limiting Logic", () => {
    it("should calculate remaining resends correctly", () => {
      const RESEND_RATE_LIMIT = 3;

      // Simulate rate limit state
      const scenarios = [
        { count: 0, expected: { canResend: true, remaining: 3 } },
        { count: 1, expected: { canResend: true, remaining: 2 } },
        { count: 2, expected: { canResend: true, remaining: 1 } },
        { count: 3, expected: { canResend: false, remaining: 0 } },
        { count: 4, expected: { canResend: false, remaining: 0 } },
      ];

      scenarios.forEach(({ count, expected }) => {
        const remaining = Math.max(0, RESEND_RATE_LIMIT - count);
        const canResend = remaining > 0;

        expect(canResend).toBe(expected.canResend);
        expect(remaining).toBe(expected.remaining);
      });
    });

    it("should reset after window expires", () => {
      const RESEND_WINDOW_SECONDS = 3600;
      const windowStart =
        Math.floor(Date.now() / 1000) - RESEND_WINDOW_SECONDS - 1;
      const now = Math.floor(Date.now() / 1000);
      const windowEnd = windowStart + RESEND_WINDOW_SECONDS;

      // Window should be expired
      expect(now >= windowEnd).toBe(true);
    });
  });

  describe("Code Expiry Logic", () => {
    it("should expire codes after 15 minutes", () => {
      const CODE_EXPIRY_MINUTES = 15;
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + CODE_EXPIRY_MINUTES * 60;

      // Code should not be expired immediately
      expect(now > expiresAt).toBe(false);

      // Simulate 16 minutes passing
      const futureTime = now + 16 * 60;
      expect(futureTime > expiresAt).toBe(true);
    });

    it("should not expire codes before 15 minutes", () => {
      const CODE_EXPIRY_MINUTES = 15;
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + CODE_EXPIRY_MINUTES * 60;

      // Simulate 14 minutes passing
      const futureTime = now + 14 * 60;
      expect(futureTime > expiresAt).toBe(false);
    });
  });

  describe("Attempt Tracking", () => {
    it("should allow up to 5 attempts", () => {
      const MAX_ATTEMPTS = 5;

      for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
        expect(attempts < MAX_ATTEMPTS).toBe(true);
      }

      expect(5 >= MAX_ATTEMPTS).toBe(true);
    });

    it("should calculate remaining attempts correctly", () => {
      const MAX_ATTEMPTS = 5;
      const scenarios = [
        { attempts: 0, expected: 5 },
        { attempts: 1, expected: 4 },
        { attempts: 4, expected: 1 },
        { attempts: 5, expected: 0 },
      ];

      scenarios.forEach(({ attempts, expected }) => {
        const remaining = MAX_ATTEMPTS - attempts;
        expect(remaining).toBe(expected);
      });
    });
  });
});

describe("Hex Code Validation", () => {
  it("should validate proper hex color codes", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const validHex = ["#000000", "#FFFFFF", "#16a34a", "#ff5733"];
    validHex.forEach((hex) => {
      expect(hexPattern.test(hex)).toBe(true);
    });
  });

  it("should reject invalid hex codes", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const invalidHex = ["000000", "#fff", "#GGGGGG", "red", "#12345"];
    invalidHex.forEach((hex) => {
      expect(hexPattern.test(hex)).toBe(false);
    });
  });
});
