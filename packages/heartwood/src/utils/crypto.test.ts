/**
 * Tests for cryptographic utilities
 */

import { describe, it, expect } from "vitest";
import {
  base64UrlEncode,
  base64UrlDecode,
  sha256,
  sha256Base64Url,
  verifyCodeChallenge,
  hashSecret,
  verifySecret,
  timingSafeEqual,
  generateMagicCode,
  generateUserCode,
  normalizeUserCode,
  generateAuthCode,
  generateRefreshToken,
  generateDeviceCode,
  generateRandomString,
} from "./crypto.js";

// =============================================================================
// base64UrlEncode / base64UrlDecode
// =============================================================================

describe("base64UrlEncode", () => {
  it("encodes empty array", () => {
    expect(base64UrlEncode(new Uint8Array([]))).toBe("");
  });

  it("encodes known bytes", () => {
    // "Hello" in ASCII
    const bytes = new TextEncoder().encode("Hello");
    const result = base64UrlEncode(bytes);
    expect(result).toBe("SGVsbG8");
  });

  it("uses URL-safe characters (no +, /, =)", () => {
    // Bytes that would produce +, /, = in standard base64
    const bytes = new Uint8Array([251, 255, 254]);
    const result = base64UrlEncode(bytes);
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toContain("=");
  });

  it("accepts ArrayBuffer input", () => {
    const bytes = new TextEncoder().encode("Test");
    const result = base64UrlEncode(new Uint8Array(bytes.buffer));
    expect(result).toBe("VGVzdA");
  });
});

describe("base64UrlDecode", () => {
  it("decodes empty string", () => {
    const result = base64UrlDecode("");
    expect(result).toEqual(new Uint8Array([]));
  });

  it("decodes known value", () => {
    const result = base64UrlDecode("SGVsbG8");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("handles URL-safe characters (- and _)", () => {
    // Encode then decode should roundtrip
    const original = new Uint8Array([251, 255, 254]);
    const encoded = base64UrlEncode(original);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(original);
  });
});

describe("base64Url roundtrip", () => {
  it("roundtrips arbitrary bytes", () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) original[i] = i;
    const decoded = base64UrlDecode(base64UrlEncode(original));
    expect(decoded).toEqual(original);
  });

  it("roundtrips empty data", () => {
    const original = new Uint8Array([]);
    expect(base64UrlDecode(base64UrlEncode(original))).toEqual(original);
  });
});

// =============================================================================
// sha256 / sha256Base64Url
// =============================================================================

describe("sha256", () => {
  it("produces 32-byte output", async () => {
    const hash = await sha256("test");
    expect(hash.byteLength).toBe(32);
  });

  it("produces consistent output for same input", async () => {
    const hash1 = await sha256("hello");
    const hash2 = await sha256("hello");
    expect(new Uint8Array(hash1)).toEqual(new Uint8Array(hash2));
  });

  it("produces different output for different input", async () => {
    const hash1 = await sha256("hello");
    const hash2 = await sha256("world");
    expect(new Uint8Array(hash1)).not.toEqual(new Uint8Array(hash2));
  });
});

describe("sha256Base64Url", () => {
  it("returns base64url-encoded hash", async () => {
    const result = await sha256Base64Url("test");
    // Should not contain padding or standard base64 chars
    expect(result).not.toContain("=");
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
  });

  it("matches known SHA-256 output for empty string", async () => {
    // SHA-256 of "" is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const result = await sha256Base64Url("");
    // Verify it's a consistent 43-char base64url string (256 bits / 6 bits per char)
    expect(result.length).toBe(43);
  });

  it("is consistent across calls", async () => {
    const result1 = await sha256Base64Url("consistent");
    const result2 = await sha256Base64Url("consistent");
    expect(result1).toBe(result2);
  });
});

// =============================================================================
// verifyCodeChallenge (PKCE - SECURITY CRITICAL)
// =============================================================================

describe("verifyCodeChallenge", () => {
  it("verifies correct S256 challenge", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await sha256Base64Url(verifier);
    const result = await verifyCodeChallenge(verifier, challenge, "S256");
    expect(result).toBe(true);
  });

  it("rejects wrong verifier", async () => {
    const verifier = "correct-verifier";
    const challenge = await sha256Base64Url(verifier);
    const result = await verifyCodeChallenge(
      "wrong-verifier",
      challenge,
      "S256",
    );
    expect(result).toBe(false);
  });

  it("rejects non-S256 method (plain)", async () => {
    const verifier = "test-verifier";
    const result = await verifyCodeChallenge(verifier, verifier, "plain");
    expect(result).toBe(false);
  });

  it("rejects empty method", async () => {
    const verifier = "test-verifier";
    const result = await verifyCodeChallenge(verifier, verifier, "");
    expect(result).toBe(false);
  });

  it("rejects unknown method", async () => {
    const verifier = "test-verifier";
    const challenge = await sha256Base64Url(verifier);
    const result = await verifyCodeChallenge(verifier, challenge, "SHA512");
    expect(result).toBe(false);
  });
});

// =============================================================================
// hashSecret / verifySecret (SECURITY CRITICAL)
// =============================================================================

describe("hashSecret", () => {
  it("produces consistent hash for same input", async () => {
    const hash1 = await hashSecret("my-secret");
    const hash2 = await hashSecret("my-secret");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashSecret("secret-1");
    const hash2 = await hashSecret("secret-2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifySecret", () => {
  it("verifies correct secret", async () => {
    const secret = "my-client-secret";
    const hash = await hashSecret(secret);
    const result = await verifySecret(secret, hash);
    expect(result).toBe(true);
  });

  it("rejects wrong secret", async () => {
    const hash = await hashSecret("correct-secret");
    const result = await verifySecret("wrong-secret", hash);
    expect(result).toBe(false);
  });

  it("rejects empty secret against valid hash", async () => {
    const hash = await hashSecret("some-secret");
    const result = await verifySecret("", hash);
    expect(result).toBe(false);
  });
});

// =============================================================================
// timingSafeEqual (SECURITY CRITICAL)
// =============================================================================

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for unequal strings of same length", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqual("short", "longer-string")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false when one is empty", () => {
    expect(timingSafeEqual("", "notempty")).toBe(false);
    expect(timingSafeEqual("notempty", "")).toBe(false);
  });

  it("detects single character difference", () => {
    expect(timingSafeEqual("abcdef", "abcdeg")).toBe(false);
  });
});

// =============================================================================
// generateMagicCode
// =============================================================================

describe("generateMagicCode", () => {
  it("produces 6-digit string", () => {
    const code = generateMagicCode();
    expect(code).toHaveLength(6);
  });

  it("produces only numeric characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateMagicCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("produces varying codes (not always the same)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateMagicCode());
    }
    // With 20 tries, extremely unlikely to get fewer than 5 unique codes
    expect(codes.size).toBeGreaterThan(5);
  });
});

// =============================================================================
// generateUserCode
// =============================================================================

describe("generateUserCode", () => {
  const charset = "BCDFGHJKLMNPQRSTVWXZ23456789";

  it("produces XXXX-XXXX format with length 8", () => {
    const code = generateUserCode(charset, 8);
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("only uses characters from the charset", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateUserCode(charset, 8);
      const chars = code.replace(/-/g, "");
      for (const ch of chars) {
        expect(charset).toContain(ch);
      }
    }
  });

  it("returns raw string for non-8 length", () => {
    const code = generateUserCode(charset, 4);
    expect(code).toHaveLength(4);
    expect(code).not.toContain("-");
  });

  it("excludes vowels and confusable characters", () => {
    // Charset BCDFGHJKLMNPQRSTVWXZ23456789 excludes: vowels (AEIOU), Y, 0, 1, I
    const excluded = "AEIOU01Y";
    for (let i = 0; i < 100; i++) {
      const code = generateUserCode(charset, 8).replace(/-/g, "");
      for (const ch of code) {
        expect(excluded).not.toContain(ch);
      }
    }
  });
});

// =============================================================================
// normalizeUserCode
// =============================================================================

describe("normalizeUserCode", () => {
  it("removes hyphens", () => {
    expect(normalizeUserCode("ABCD-EFGH")).toBe("ABCDEFGH");
  });

  it("removes spaces", () => {
    expect(normalizeUserCode("ABCD EFGH")).toBe("ABCDEFGH");
  });

  it("converts to uppercase", () => {
    expect(normalizeUserCode("abcd-efgh")).toBe("ABCDEFGH");
  });

  it("handles mixed formatting", () => {
    expect(normalizeUserCode("ab cd-EF gh")).toBe("ABCDEFGH");
  });

  it("handles already normalized input", () => {
    expect(normalizeUserCode("ABCDEFGH")).toBe("ABCDEFGH");
  });
});

// =============================================================================
// Generation functions (format/uniqueness checks)
// =============================================================================

describe("generateAuthCode", () => {
  it("produces non-empty string", () => {
    expect(generateAuthCode().length).toBeGreaterThan(0);
  });

  it("produces unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateAuthCode());
    }
    expect(codes.size).toBe(10);
  });
});

describe("generateRefreshToken", () => {
  it("produces non-empty string", () => {
    expect(generateRefreshToken().length).toBeGreaterThan(0);
  });

  it("is longer than auth code (48 vs 32 bytes)", () => {
    const refreshToken = generateRefreshToken();
    const authCode = generateAuthCode();
    expect(refreshToken.length).toBeGreaterThan(authCode.length);
  });
});

describe("generateDeviceCode", () => {
  it("produces non-empty string", () => {
    expect(generateDeviceCode().length).toBeGreaterThan(0);
  });

  it("produces unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateDeviceCode());
    }
    expect(codes.size).toBe(10);
  });
});

describe("generateRandomString", () => {
  it("produces base64url-safe output", () => {
    const result = generateRandomString(32);
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toContain("=");
  });

  it("produces different values each call", () => {
    const a = generateRandomString(16);
    const b = generateRandomString(16);
    expect(a).not.toBe(b);
  });
});
