/**
 * Integration Tests for Token Encryption Flow
 *
 * These tests verify the end-to-end encryption flow as used by
 * curio config endpoints (Journey, Timeline).
 *
 * Tests the 3-state token handling pattern:
 * - null/undefined = preserve existing token
 * - CLEAR_TOKEN_VALUE = explicitly clear token
 * - actual value = encrypt and store new token
 */

import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  safeDecryptToken,
  isEncryptedToken,
} from "./encryption";

// Sentinel value for clearing tokens (same as in curio modules)
const CLEAR_TOKEN_VALUE = "__CLEAR__";

// Test encryption key (valid 256-bit key)
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Simulates the config endpoint's token processing logic.
 * This mirrors the actual implementation in config endpoints.
 */
async function processTokenForDb(
  newToken: string | undefined | null,
  encryptionKey: string | undefined,
): Promise<string | null> {
  if (newToken === CLEAR_TOKEN_VALUE) {
    // Explicit clear request - return empty string to trigger CASE NULL in SQL
    return "";
  }

  if (newToken?.trim()) {
    // New token value - encrypt it
    const rawToken = newToken.trim();
    return encryptionKey
      ? await encryptToken(rawToken, encryptionKey)
      : rawToken;
  }

  // null/undefined = preserve existing (return null for COALESCE)
  return null;
}

/**
 * Simulates SQL CASE expression behavior:
 * CASE WHEN excluded.token = '' THEN NULL ELSE COALESCE(excluded.token, existing) END
 */
function simulateSqlCaseCoalesce(
  newValue: string | null,
  existingValue: string | null,
): string | null {
  if (newValue === "") {
    // CASE: explicit clear
    return null;
  }
  // COALESCE: use new value if provided, else keep existing
  return newValue ?? existingValue;
}

describe("Token Processing Flow", () => {
  describe("processTokenForDb", () => {
    it("should return empty string for CLEAR_TOKEN_VALUE", async () => {
      const result = await processTokenForDb(CLEAR_TOKEN_VALUE, TEST_KEY);
      expect(result).toBe("");
    });

    it("should encrypt actual token values", async () => {
      const result = await processTokenForDb("ghp_secret123", TEST_KEY);
      expect(result).not.toBeNull();
      expect(isEncryptedToken(result!)).toBe(true);
      expect(result).toMatch(/^v1:/);
    });

    it("should return null for undefined (preserve existing)", async () => {
      const result = await processTokenForDb(undefined, TEST_KEY);
      expect(result).toBeNull();
    });

    it("should return null for null (preserve existing)", async () => {
      const result = await processTokenForDb(null, TEST_KEY);
      expect(result).toBeNull();
    });

    it("should return null for empty string (preserve existing)", async () => {
      const result = await processTokenForDb("", TEST_KEY);
      expect(result).toBeNull();
    });

    it("should return null for whitespace-only (preserve existing)", async () => {
      const result = await processTokenForDb("   ", TEST_KEY);
      expect(result).toBeNull();
    });

    it("should trim tokens before encrypting", async () => {
      const result = await processTokenForDb("  token  ", TEST_KEY);
      expect(result).not.toBeNull();
      const decrypted = await decryptToken(result!, TEST_KEY);
      expect(decrypted).toBe("token");
    });

    it("should store plaintext when no encryption key", async () => {
      const result = await processTokenForDb("plaintext-token", undefined);
      expect(result).toBe("plaintext-token");
    });
  });

  describe("SQL CASE/COALESCE simulation", () => {
    it("should clear token when new value is empty string", () => {
      const existing = "v1:old:encrypted";
      const result = simulateSqlCaseCoalesce("", existing);
      expect(result).toBeNull();
    });

    it("should replace with new value when provided", () => {
      const existing = "v1:old:encrypted";
      const newVal = "v1:new:encrypted";
      const result = simulateSqlCaseCoalesce(newVal, existing);
      expect(result).toBe(newVal);
    });

    it("should preserve existing when new value is null", () => {
      const existing = "v1:existing:encrypted";
      const result = simulateSqlCaseCoalesce(null, existing);
      expect(result).toBe(existing);
    });

    it("should insert new value when existing is null", () => {
      const newVal = "v1:new:encrypted";
      const result = simulateSqlCaseCoalesce(newVal, null);
      expect(result).toBe(newVal);
    });

    it("should stay null when both are null", () => {
      const result = simulateSqlCaseCoalesce(null, null);
      expect(result).toBeNull();
    });
  });
});

describe("End-to-End Token Lifecycle", () => {
  it("should handle complete lifecycle: set → update → clear", async () => {
    // 1. Initial set
    const token1 = "ghp_initial_token_12345";
    const encrypted1 = await processTokenForDb(token1, TEST_KEY);
    expect(encrypted1).not.toBeNull();
    expect(isEncryptedToken(encrypted1!)).toBe(true);

    // Simulate DB state
    let dbValue = simulateSqlCaseCoalesce(encrypted1, null);
    expect(dbValue).toBe(encrypted1);

    // Verify decryption
    const decrypted1 = await safeDecryptToken(dbValue, TEST_KEY);
    expect(decrypted1).toBe(token1);

    // 2. Update with new token
    const token2 = "ghp_updated_token_67890";
    const encrypted2 = await processTokenForDb(token2, TEST_KEY);
    dbValue = simulateSqlCaseCoalesce(encrypted2, dbValue);
    expect(dbValue).toBe(encrypted2);

    const decrypted2 = await safeDecryptToken(dbValue, TEST_KEY);
    expect(decrypted2).toBe(token2);

    // 3. Preserve during unrelated update (null input)
    const preserved = await processTokenForDb(undefined, TEST_KEY);
    dbValue = simulateSqlCaseCoalesce(preserved, dbValue);
    expect(dbValue).toBe(encrypted2); // Should still be token2

    // 4. Explicit clear
    const cleared = await processTokenForDb(CLEAR_TOKEN_VALUE, TEST_KEY);
    expect(cleared).toBe("");
    dbValue = simulateSqlCaseCoalesce(cleared, dbValue);
    expect(dbValue).toBeNull();

    // 5. Set again after clear
    const token3 = "ghp_fresh_token_xxxxx";
    const encrypted3 = await processTokenForDb(token3, TEST_KEY);
    dbValue = simulateSqlCaseCoalesce(encrypted3, dbValue);

    const decrypted3 = await safeDecryptToken(dbValue, TEST_KEY);
    expect(decrypted3).toBe(token3);
  });

  it("should handle migration from plaintext to encrypted", async () => {
    // Simulate legacy plaintext token in DB
    const legacyPlaintext = "ghp_plaintext_legacy_token";

    // safeDecryptToken should return plaintext as-is
    const retrieved = await safeDecryptToken(legacyPlaintext, TEST_KEY);
    expect(retrieved).toBe(legacyPlaintext);

    // On next save, token gets encrypted
    const newEncrypted = await processTokenForDb(legacyPlaintext, TEST_KEY);
    expect(isEncryptedToken(newEncrypted!)).toBe(true);

    // Future retrieval uses decryption
    const decrypted = await safeDecryptToken(newEncrypted, TEST_KEY);
    expect(decrypted).toBe(legacyPlaintext);
  });

  it("should handle multiple tokens independently", async () => {
    // Simulate Journey/Timeline having both GitHub and OpenRouter tokens
    const githubToken = "ghp_github_token_12345";
    const openrouterKey = "sk-or-v1-openrouter-key";

    const encryptedGithub = await processTokenForDb(githubToken, TEST_KEY);
    const encryptedOpenrouter = await processTokenForDb(
      openrouterKey,
      TEST_KEY,
    );

    // Both should be independently encrypted
    expect(encryptedGithub).not.toBe(encryptedOpenrouter);
    expect(isEncryptedToken(encryptedGithub!)).toBe(true);
    expect(isEncryptedToken(encryptedOpenrouter!)).toBe(true);

    // Clear only GitHub, preserve OpenRouter
    const clearedGithub = await processTokenForDb(CLEAR_TOKEN_VALUE, TEST_KEY);
    const preservedOpenrouter = await processTokenForDb(undefined, TEST_KEY);

    let dbGithub: string | null = encryptedGithub;
    let dbOpenrouter: string | null = encryptedOpenrouter;

    dbGithub = simulateSqlCaseCoalesce(clearedGithub, dbGithub);
    dbOpenrouter = simulateSqlCaseCoalesce(preservedOpenrouter, dbOpenrouter);

    expect(dbGithub).toBeNull();
    expect(dbOpenrouter).toBe(encryptedOpenrouter);

    // OpenRouter should still decrypt correctly
    const decryptedOpenrouter = await safeDecryptToken(dbOpenrouter, TEST_KEY);
    expect(decryptedOpenrouter).toBe(openrouterKey);
  });
});

describe("Error Handling in Flow", () => {
  it("should handle wrong encryption key gracefully", async () => {
    const token = "secret_token";
    const encrypted = await processTokenForDb(token, TEST_KEY);

    const wrongKey =
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
    const result = await safeDecryptToken(encrypted, wrongKey);

    // safeDecryptToken returns null on failure, doesn't throw
    expect(result).toBeNull();
  });

  it("should handle corrupted ciphertext gracefully", async () => {
    const token = "secret_token";
    const encrypted = await processTokenForDb(token, TEST_KEY);

    // Corrupt the encrypted value
    const corrupted = encrypted!.slice(0, -4) + "XXXX";
    const result = await safeDecryptToken(corrupted, TEST_KEY);

    expect(result).toBeNull();
  });

  it("should handle missing encryption key by storing plaintext", async () => {
    const token = "my-api-key";
    const result = await processTokenForDb(token, undefined);

    // Without key, stores plaintext
    expect(result).toBe(token);
    expect(isEncryptedToken(result!)).toBe(false);
  });
});

describe("Version Migration", () => {
  it("should decrypt legacy v0 format (iv:ciphertext)", async () => {
    // Encrypt with current version
    const token = "legacy_token_test";
    const encrypted = await encryptToken(token, TEST_KEY);

    // Simulate legacy format by stripping v1: prefix
    const legacyFormat = encrypted.replace(/^v1:/, "");
    expect(legacyFormat).not.toMatch(/^v1:/);

    // Should still decrypt
    const decrypted = await decryptToken(legacyFormat, TEST_KEY);
    expect(decrypted).toBe(token);
  });

  it("should upgrade legacy format on re-encryption", async () => {
    const token = "upgrade_me";

    // Create legacy format
    const v1Encrypted = await encryptToken(token, TEST_KEY);
    const legacyFormat = v1Encrypted.replace(/^v1:/, "");

    // Decrypt (simulating read)
    const retrieved = await safeDecryptToken(legacyFormat, TEST_KEY);
    expect(retrieved).toBe(token);

    // Re-encrypt (simulating save) - should use v1 format
    const reEncrypted = await encryptToken(retrieved!, TEST_KEY);
    expect(reEncrypted).toMatch(/^v1:/);

    // Should still decrypt to original
    const final = await decryptToken(reEncrypted, TEST_KEY);
    expect(final).toBe(token);
  });
});
