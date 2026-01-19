/**
 * Tests for Token Encryption Utility
 *
 * These tests verify the AES-256-GCM encryption implementation
 * used for securing API tokens in the Journey Curio.
 */

import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  isEncryptedToken,
  safeDecryptToken,
} from "./encryption";

// Valid 256-bit key (64 hex characters)
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
// Different valid key for testing wrong-key scenarios
const WRONG_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("encryptToken", () => {
  it("should encrypt with versioned format (v1:iv:ciphertext)", async () => {
    const plaintext = "my-secret-token";
    const encrypted = await encryptToken(plaintext, TEST_KEY);

    // Should be in format v1:iv:ciphertext
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("v1");
    expect(parts[1]).toBeTruthy(); // IV
    expect(parts[2]).toBeTruthy(); // Ciphertext
  });

  it("should produce different ciphertext each time (random IV)", async () => {
    const plaintext = "same-token";
    const encrypted1 = await encryptToken(plaintext, TEST_KEY);
    const encrypted2 = await encryptToken(plaintext, TEST_KEY);

    // Same plaintext should produce different ciphertext due to random IV
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should handle empty string", async () => {
    const encrypted = await encryptToken("", TEST_KEY);
    expect(encrypted).toMatch(/^v1:[^:]+:[^:]+$/);
  });

  it("should handle unicode characters", async () => {
    const plaintext = "token-with-émojis-🌲🔐";
    const encrypted = await encryptToken(plaintext, TEST_KEY);
    expect(encrypted).toMatch(/^v1:/);
  });

  it("should handle long tokens", async () => {
    const plaintext = "a".repeat(1000);
    const encrypted = await encryptToken(plaintext, TEST_KEY);
    expect(encrypted).toMatch(/^v1:/);
  });

  it("should reject invalid key length", async () => {
    await expect(encryptToken("test", "short")).rejects.toThrow(
      "TOKEN_ENCRYPTION_KEY must be 64 hex characters",
    );
  });

  it("should reject non-hex characters in key", async () => {
    // Valid length but contains non-hex characters (g, h, etc.)
    const invalidHexKey =
      "ghijklmnopqrstuv0123456789abcdef0123456789abcdef0123456789abcdef";
    await expect(encryptToken("test", invalidHexKey)).rejects.toThrow(
      "TOKEN_ENCRYPTION_KEY must contain only hex characters",
    );
  });
});

describe("decryptToken", () => {
  it("should decrypt back to original plaintext", async () => {
    const plaintext = "my-secret-api-key-12345";
    const encrypted = await encryptToken(plaintext, TEST_KEY);
    const decrypted = await decryptToken(encrypted, TEST_KEY);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle empty string", async () => {
    const encrypted = await encryptToken("", TEST_KEY);
    const decrypted = await decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe("");
  });

  it("should handle unicode characters", async () => {
    const plaintext = "token-🌲-émojis-日本語";
    const encrypted = await encryptToken(plaintext, TEST_KEY);
    const decrypted = await decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it("should fail with wrong key", async () => {
    const encrypted = await encryptToken("secret", TEST_KEY);

    await expect(decryptToken(encrypted, WRONG_KEY)).rejects.toThrow();
  });

  it("should fail with tampered ciphertext", async () => {
    const encrypted = await encryptToken("secret", TEST_KEY);
    const parts = encrypted.split(":");

    // Tamper with ciphertext (last part)
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -4)}XXXX`;

    await expect(decryptToken(tampered, TEST_KEY)).rejects.toThrow();
  });

  it("should reject invalid format (no separator)", async () => {
    await expect(decryptToken("nocolon", TEST_KEY)).rejects.toThrow(
      "Invalid encrypted format",
    );
  });

  it("should reject unsupported version", async () => {
    await expect(
      decryptToken("v99:someiv:someciphertext", TEST_KEY),
    ).rejects.toThrow("Unsupported encryption version: v99");
  });

  // Legacy format backwards compatibility
  it("should decrypt legacy format (iv:ciphertext without version)", async () => {
    // Simulate a legacy encrypted token (v0 format: iv:ciphertext)
    // We create one by encrypting and stripping the v1: prefix
    const encrypted = await encryptToken("legacy-token", TEST_KEY);
    const legacyFormat = encrypted.replace(/^v1:/, "");

    const decrypted = await decryptToken(legacyFormat, TEST_KEY);
    expect(decrypted).toBe("legacy-token");
  });
});

describe("isEncryptedToken", () => {
  it("should detect versioned encrypted tokens (v1:iv:ciphertext)", async () => {
    const encrypted = await encryptToken("secret", TEST_KEY);
    expect(isEncryptedToken(encrypted)).toBe(true);
  });

  it("should detect legacy encrypted tokens (iv:ciphertext)", async () => {
    // Simulate legacy format by stripping v1: prefix
    const encrypted = await encryptToken("secret", TEST_KEY);
    const legacyFormat = encrypted.replace(/^v1:/, "");
    expect(isEncryptedToken(legacyFormat)).toBe(true);
  });

  it("should detect plaintext tokens (no colon)", () => {
    expect(isEncryptedToken("plaintext-api-key")).toBe(false);
  });

  it("should detect plaintext tokens (colon but wrong format)", () => {
    // This could be a GitHub token with colons or other format
    expect(isEncryptedToken("ghp_abc:def")).toBe(false);
  });

  it("should handle empty string", () => {
    expect(isEncryptedToken("")).toBe(false);
  });

  it("should detect github-style tokens as plaintext", () => {
    expect(isEncryptedToken("ghp_1234567890abcdefghijklmnopqrstuvwxyz")).toBe(
      false,
    );
    expect(isEncryptedToken("sk-proj-1234567890abcdef")).toBe(false);
  });

  it("should not detect unknown version prefixes as encrypted", () => {
    // v99 is not a known version, should not match
    expect(isEncryptedToken("v99:abc:def")).toBe(false);
  });
});

describe("safeDecryptToken", () => {
  it("should decrypt encrypted tokens", async () => {
    const plaintext = "my-token";
    const encrypted = await encryptToken(plaintext, TEST_KEY);

    const result = await safeDecryptToken(encrypted, TEST_KEY);
    expect(result).toBe(plaintext);
  });

  it("should return plaintext tokens as-is (migration support)", async () => {
    const plaintext = "ghp_legacy_plaintext_token";

    const result = await safeDecryptToken(plaintext, TEST_KEY);
    expect(result).toBe(plaintext);
  });

  it("should return null for null input", async () => {
    const result = await safeDecryptToken(null, TEST_KEY);
    expect(result).toBeNull();
  });

  it("should return null for undefined key", async () => {
    const encrypted = await encryptToken("test", TEST_KEY);
    const result = await safeDecryptToken(encrypted, undefined);
    expect(result).toBeNull();
  });

  it("should return null for failed decryption", async () => {
    const encrypted = await encryptToken("secret", TEST_KEY);
    const result = await safeDecryptToken(encrypted, WRONG_KEY);
    expect(result).toBeNull();
  });

  it("should handle corrupted encrypted data gracefully", async () => {
    // Create a real encrypted token, then corrupt the ciphertext
    const encrypted = await encryptToken("secret", TEST_KEY);
    const parts = encrypted.split(":");

    // Corrupt by replacing last few chars of ciphertext (breaks auth tag)
    const corruptedCiphertext = parts[2].slice(0, -4) + "XXXX";
    const corrupted = `${parts[0]}:${parts[1]}:${corruptedCiphertext}`;

    const result = await safeDecryptToken(corrupted, TEST_KEY);
    expect(result).toBeNull();
  });
});

describe("round-trip encryption", () => {
  const testCases = [
    "simple-token",
    "ghp_1234567890abcdefghijklmnopqrstuvwxyz",
    "sk-proj-12345-abcdef",
    "",
    "🔐🌲💚",
    "token with spaces",
    "token\nwith\nnewlines",
    "a".repeat(10000), // Large token
  ];

  testCases.forEach((plaintext) => {
    it(`should round-trip: "${plaintext.slice(0, 30)}${plaintext.length > 30 ? "..." : ""}"`, async () => {
      const encrypted = await encryptToken(plaintext, TEST_KEY);
      const decrypted = await decryptToken(encrypted, TEST_KEY);
      expect(decrypted).toBe(plaintext);
    });
  });
});
