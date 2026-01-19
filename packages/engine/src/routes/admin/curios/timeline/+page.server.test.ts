/**
 * Admin UI Token Encryption Tests
 *
 * Tests verify that the admin page server actions correctly:
 * 1. Encrypt tokens before database storage
 * 2. Indicate token presence without exposing values
 * 3. Handle missing encryption keys gracefully
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, isEncryptedToken } from "$lib/server/encryption";

// Valid 256-bit test key
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Simulates the admin page's token processing logic from +page.server.ts
 * This mirrors lines 152-178 of the actual implementation.
 */
async function processAdminFormTokens(
  githubToken: string | null,
  openrouterKey: string | null,
  encryptionKey: string | undefined,
): Promise<{
  githubTokenEncrypted: string | null;
  openrouterKeyEncrypted: string | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const rawGithubToken = githubToken?.trim() || null;
  const rawOpenrouterKey = openrouterKey?.trim() || null;

  let githubTokenEncrypted = rawGithubToken;
  let openrouterKeyEncrypted = rawOpenrouterKey;

  if (encryptionKey) {
    if (rawGithubToken) {
      githubTokenEncrypted = await encryptToken(rawGithubToken, encryptionKey);
    }
    if (rawOpenrouterKey) {
      openrouterKeyEncrypted = await encryptToken(
        rawOpenrouterKey,
        encryptionKey,
      );
    }
  } else if (rawGithubToken || rawOpenrouterKey) {
    warnings.push(
      "TOKEN_ENCRYPTION_KEY not set - tokens will be stored unencrypted",
    );
  }

  return { githubTokenEncrypted, openrouterKeyEncrypted, warnings };
}

/**
 * Simulates the admin page's config response transformation from +page.server.ts
 * This mirrors lines 69-72 of the actual implementation.
 */
function transformConfigForResponse(dbRow: {
  github_token_encrypted: string | null;
  openrouter_key_encrypted: string | null;
}): {
  hasGithubToken: boolean;
  hasOpenrouterKey: boolean;
} {
  return {
    hasGithubToken: Boolean(dbRow.github_token_encrypted),
    hasOpenrouterKey: Boolean(dbRow.openrouter_key_encrypted),
  };
}

describe("Admin Page Token Encryption", () => {
  describe("processAdminFormTokens", () => {
    it("should encrypt both tokens when encryption key is provided", async () => {
      const result = await processAdminFormTokens(
        "ghp_github_token_12345",
        "sk-or-openrouter-key",
        TEST_KEY,
      );

      expect(result.githubTokenEncrypted).not.toBeNull();
      expect(result.openrouterKeyEncrypted).not.toBeNull();
      expect(isEncryptedToken(result.githubTokenEncrypted!)).toBe(true);
      expect(isEncryptedToken(result.openrouterKeyEncrypted!)).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should encrypt only GitHub token when OpenRouter is empty", async () => {
      const result = await processAdminFormTokens(
        "ghp_github_token_12345",
        null,
        TEST_KEY,
      );

      expect(result.githubTokenEncrypted).not.toBeNull();
      expect(isEncryptedToken(result.githubTokenEncrypted!)).toBe(true);
      expect(result.openrouterKeyEncrypted).toBeNull();
      expect(result.warnings).toHaveLength(0);
    });

    it("should encrypt only OpenRouter key when GitHub is empty", async () => {
      const result = await processAdminFormTokens(
        null,
        "sk-or-openrouter-key",
        TEST_KEY,
      );

      expect(result.githubTokenEncrypted).toBeNull();
      expect(result.openrouterKeyEncrypted).not.toBeNull();
      expect(isEncryptedToken(result.openrouterKeyEncrypted!)).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should store plaintext and warn when encryption key is missing", async () => {
      const githubToken = "ghp_plaintext_token";
      const openrouterKey = "sk-or-plaintext";

      const result = await processAdminFormTokens(
        githubToken,
        openrouterKey,
        undefined,
      );

      // Tokens stored as plaintext
      expect(result.githubTokenEncrypted).toBe(githubToken);
      expect(result.openrouterKeyEncrypted).toBe(openrouterKey);
      expect(isEncryptedToken(result.githubTokenEncrypted!)).toBe(false);
      expect(isEncryptedToken(result.openrouterKeyEncrypted!)).toBe(false);

      // Warning should be generated
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("TOKEN_ENCRYPTION_KEY not set");
    });

    it("should not warn when no tokens are provided", async () => {
      const result = await processAdminFormTokens(null, null, undefined);

      expect(result.githubTokenEncrypted).toBeNull();
      expect(result.openrouterKeyEncrypted).toBeNull();
      expect(result.warnings).toHaveLength(0);
    });

    it("should trim whitespace from tokens before encrypting", async () => {
      const result = await processAdminFormTokens(
        "  ghp_with_spaces  ",
        "  sk-or-with-spaces  ",
        TEST_KEY,
      );

      expect(result.githubTokenEncrypted).not.toBeNull();
      expect(result.openrouterKeyEncrypted).not.toBeNull();

      // Both should be encrypted (trimmed values are non-empty)
      expect(isEncryptedToken(result.githubTokenEncrypted!)).toBe(true);
      expect(isEncryptedToken(result.openrouterKeyEncrypted!)).toBe(true);
    });

    it("should treat whitespace-only tokens as null", async () => {
      const result = await processAdminFormTokens("   ", "   ", TEST_KEY);

      expect(result.githubTokenEncrypted).toBeNull();
      expect(result.openrouterKeyEncrypted).toBeNull();
    });

    it("should produce unique ciphertext for same token (random IV)", async () => {
      const token = "ghp_same_token";

      const result1 = await processAdminFormTokens(token, null, TEST_KEY);
      const result2 = await processAdminFormTokens(token, null, TEST_KEY);

      // Same token should produce different encrypted output
      expect(result1.githubTokenEncrypted).not.toBe(
        result2.githubTokenEncrypted,
      );
    });
  });

  describe("transformConfigForResponse", () => {
    it("should indicate both tokens present", () => {
      const result = transformConfigForResponse({
        github_token_encrypted: "v1:encrypted:data",
        openrouter_key_encrypted: "v1:encrypted:data",
      });

      expect(result.hasGithubToken).toBe(true);
      expect(result.hasOpenrouterKey).toBe(true);
    });

    it("should indicate only GitHub token present", () => {
      const result = transformConfigForResponse({
        github_token_encrypted: "v1:encrypted:data",
        openrouter_key_encrypted: null,
      });

      expect(result.hasGithubToken).toBe(true);
      expect(result.hasOpenrouterKey).toBe(false);
    });

    it("should indicate only OpenRouter key present", () => {
      const result = transformConfigForResponse({
        github_token_encrypted: null,
        openrouter_key_encrypted: "v1:encrypted:data",
      });

      expect(result.hasGithubToken).toBe(false);
      expect(result.hasOpenrouterKey).toBe(true);
    });

    it("should indicate no tokens present", () => {
      const result = transformConfigForResponse({
        github_token_encrypted: null,
        openrouter_key_encrypted: null,
      });

      expect(result.hasGithubToken).toBe(false);
      expect(result.hasOpenrouterKey).toBe(false);
    });

    it("should handle empty string as falsy (no token)", () => {
      const result = transformConfigForResponse({
        github_token_encrypted: "",
        openrouter_key_encrypted: "",
      });

      expect(result.hasGithubToken).toBe(false);
      expect(result.hasOpenrouterKey).toBe(false);
    });

    it("should handle plaintext tokens (migration scenario)", () => {
      // During migration, tokens might be plaintext
      const result = transformConfigForResponse({
        github_token_encrypted: "ghp_plaintext_legacy",
        openrouter_key_encrypted: "sk-or-plaintext",
      });

      // Boolean check still works - token exists
      expect(result.hasGithubToken).toBe(true);
      expect(result.hasOpenrouterKey).toBe(true);
    });
  });

  describe("End-to-End Admin Flow", () => {
    it("should encrypt on save, indicate presence on load", async () => {
      // Step 1: Admin saves new tokens via form
      const saveResult = await processAdminFormTokens(
        "ghp_new_github_token",
        "sk-or-new-openrouter-key",
        TEST_KEY,
      );

      expect(saveResult.warnings).toHaveLength(0);
      expect(isEncryptedToken(saveResult.githubTokenEncrypted!)).toBe(true);
      expect(isEncryptedToken(saveResult.openrouterKeyEncrypted!)).toBe(true);

      // Step 2: Simulate DB storage and retrieval
      const mockDbRow = {
        github_token_encrypted: saveResult.githubTokenEncrypted,
        openrouter_key_encrypted: saveResult.openrouterKeyEncrypted,
      };

      // Step 3: Admin loads page - should see tokens are configured
      const loadResult = transformConfigForResponse(mockDbRow);

      expect(loadResult.hasGithubToken).toBe(true);
      expect(loadResult.hasOpenrouterKey).toBe(true);
    });

    it("should preserve existing tokens when form fields are empty", async () => {
      // Existing encrypted token in DB
      const existingEncrypted = await encryptToken(
        "ghp_existing_token",
        TEST_KEY,
      );

      // Admin submits form without token field (preserve existing)
      const saveResult = await processAdminFormTokens(null, null, TEST_KEY);

      // New values are null (will trigger COALESCE in SQL to preserve existing)
      expect(saveResult.githubTokenEncrypted).toBeNull();
      expect(saveResult.openrouterKeyEncrypted).toBeNull();

      // After SQL COALESCE, existing token preserved
      const mockDbRow = {
        github_token_encrypted:
          saveResult.githubTokenEncrypted ?? existingEncrypted,
        openrouter_key_encrypted: saveResult.openrouterKeyEncrypted,
      };

      const loadResult = transformConfigForResponse(mockDbRow);
      expect(loadResult.hasGithubToken).toBe(true);
      expect(loadResult.hasOpenrouterKey).toBe(false);
    });
  });
});
