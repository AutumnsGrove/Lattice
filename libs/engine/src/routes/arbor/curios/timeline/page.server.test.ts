/**
 * Admin UI Token Encryption Tests
 *
 * Tests verify that the admin page server actions correctly:
 * 1. Encrypt tokens before database storage
 * 2. Indicate token presence without exposing values
 * 3. Handle missing encryption keys gracefully
 * 4. Support CLEAR_TOKEN_VALUE for explicit token deletion
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, isEncryptedToken } from "$lib/server/encryption";

// Valid 256-bit test key
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Sentinel value for clearing tokens (matches $lib/curios/timeline)
const CLEAR_TOKEN_VALUE = "__CLEAR__";

/**
 * Simulates the admin page's token processing logic from +page.server.ts
 * This mirrors the 3-state token handling: set/preserve/clear
 */
async function processAdminFormTokens(
  githubToken: string | null,
  openrouterKey: string | null,
  encryptionKey: string | undefined,
): Promise<{
  githubTokenForDb: string | null;
  openrouterKeyForDb: string | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Determine token values: CLEAR_TOKEN_VALUE -> "", actual token -> encrypt, empty -> null (preserve)
  let githubTokenForDb: string | null = null;
  let openrouterKeyForDb: string | null = null;

  if (githubToken === CLEAR_TOKEN_VALUE) {
    // Explicit clear request - use empty string to trigger CASE NULL
    githubTokenForDb = "";
  } else if (githubToken?.trim()) {
    // New token value - encrypt it
    const rawToken = githubToken.trim();
    githubTokenForDb = encryptionKey
      ? await encryptToken(rawToken, encryptionKey)
      : rawToken;
  }
  // else: null/undefined/empty = preserve existing (COALESCE handles this)

  if (openrouterKey === CLEAR_TOKEN_VALUE) {
    // Explicit clear request
    openrouterKeyForDb = "";
  } else if (openrouterKey?.trim()) {
    // New token value - encrypt it
    const rawKey = openrouterKey.trim();
    openrouterKeyForDb = encryptionKey
      ? await encryptToken(rawKey, encryptionKey)
      : rawKey;
  }

  if (!encryptionKey && (githubToken?.trim() || openrouterKey?.trim())) {
    warnings.push(
      "TOKEN_ENCRYPTION_KEY not set - tokens will be stored unencrypted",
    );
  }

  return { githubTokenForDb, openrouterKeyForDb, warnings };
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

      expect(result.githubTokenForDb).not.toBeNull();
      expect(result.openrouterKeyForDb).not.toBeNull();
      expect(isEncryptedToken(result.githubTokenForDb!)).toBe(true);
      expect(isEncryptedToken(result.openrouterKeyForDb!)).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should encrypt only GitHub token when OpenRouter is empty", async () => {
      const result = await processAdminFormTokens(
        "ghp_github_token_12345",
        null,
        TEST_KEY,
      );

      expect(result.githubTokenForDb).not.toBeNull();
      expect(isEncryptedToken(result.githubTokenForDb!)).toBe(true);
      expect(result.openrouterKeyForDb).toBeNull();
      expect(result.warnings).toHaveLength(0);
    });

    it("should encrypt only OpenRouter key when GitHub is empty", async () => {
      const result = await processAdminFormTokens(
        null,
        "sk-or-openrouter-key",
        TEST_KEY,
      );

      expect(result.githubTokenForDb).toBeNull();
      expect(result.openrouterKeyForDb).not.toBeNull();
      expect(isEncryptedToken(result.openrouterKeyForDb!)).toBe(true);
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
      expect(result.githubTokenForDb).toBe(githubToken);
      expect(result.openrouterKeyForDb).toBe(openrouterKey);
      expect(isEncryptedToken(result.githubTokenForDb!)).toBe(false);
      expect(isEncryptedToken(result.openrouterKeyForDb!)).toBe(false);

      // Warning should be generated
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("TOKEN_ENCRYPTION_KEY not set");
    });

    it("should not warn when no tokens are provided", async () => {
      const result = await processAdminFormTokens(null, null, undefined);

      expect(result.githubTokenForDb).toBeNull();
      expect(result.openrouterKeyForDb).toBeNull();
      expect(result.warnings).toHaveLength(0);
    });

    it("should trim whitespace from tokens before encrypting", async () => {
      const result = await processAdminFormTokens(
        "  ghp_with_spaces  ",
        "  sk-or-with-spaces  ",
        TEST_KEY,
      );

      expect(result.githubTokenForDb).not.toBeNull();
      expect(result.openrouterKeyForDb).not.toBeNull();

      // Both should be encrypted (trimmed values are non-empty)
      expect(isEncryptedToken(result.githubTokenForDb!)).toBe(true);
      expect(isEncryptedToken(result.openrouterKeyForDb!)).toBe(true);
    });

    it("should treat whitespace-only tokens as null", async () => {
      const result = await processAdminFormTokens("   ", "   ", TEST_KEY);

      expect(result.githubTokenForDb).toBeNull();
      expect(result.openrouterKeyForDb).toBeNull();
    });

    it("should produce unique ciphertext for same token (random IV)", async () => {
      const token = "ghp_same_token";

      const result1 = await processAdminFormTokens(token, null, TEST_KEY);
      const result2 = await processAdminFormTokens(token, null, TEST_KEY);

      // Same token should produce different encrypted output
      expect(result1.githubTokenForDb).not.toBe(result2.githubTokenForDb);
    });

    it("should return empty string for CLEAR_TOKEN_VALUE (explicit clear)", async () => {
      const result = await processAdminFormTokens(
        CLEAR_TOKEN_VALUE,
        CLEAR_TOKEN_VALUE,
        TEST_KEY,
      );

      // Empty string triggers CASE NULL in SQL
      expect(result.githubTokenForDb).toBe("");
      expect(result.openrouterKeyForDb).toBe("");
      expect(result.warnings).toHaveLength(0);
    });

    it("should clear only GitHub token when OpenRouter is preserved", async () => {
      const result = await processAdminFormTokens(
        CLEAR_TOKEN_VALUE,
        null, // preserve existing
        TEST_KEY,
      );

      expect(result.githubTokenForDb).toBe(""); // clear
      expect(result.openrouterKeyForDb).toBeNull(); // preserve
    });

    it("should clear only OpenRouter when GitHub is set new", async () => {
      const result = await processAdminFormTokens(
        "ghp_new_token",
        CLEAR_TOKEN_VALUE,
        TEST_KEY,
      );

      expect(isEncryptedToken(result.githubTokenForDb!)).toBe(true); // new encrypted
      expect(result.openrouterKeyForDb).toBe(""); // clear
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
      expect(isEncryptedToken(saveResult.githubTokenForDb!)).toBe(true);
      expect(isEncryptedToken(saveResult.openrouterKeyForDb!)).toBe(true);

      // Step 2: Simulate DB storage and retrieval
      const mockDbRow = {
        github_token_encrypted: saveResult.githubTokenForDb,
        openrouter_key_encrypted: saveResult.openrouterKeyForDb,
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
      expect(saveResult.githubTokenForDb).toBeNull();
      expect(saveResult.openrouterKeyForDb).toBeNull();

      // After SQL COALESCE, existing token preserved
      const mockDbRow = {
        github_token_encrypted:
          saveResult.githubTokenForDb ?? existingEncrypted,
        openrouter_key_encrypted: saveResult.openrouterKeyForDb,
      };

      const loadResult = transformConfigForResponse(mockDbRow);
      expect(loadResult.hasGithubToken).toBe(true);
      expect(loadResult.hasOpenrouterKey).toBe(false);
    });

    it("should clear tokens via CLEAR_TOKEN_VALUE and show as not configured", async () => {
      // Step 1: Existing tokens in DB
      const existingGithub = await encryptToken("ghp_existing", TEST_KEY);
      const existingOpenrouter = await encryptToken("sk-or-existing", TEST_KEY);

      // Verify they exist initially
      const initialLoad = transformConfigForResponse({
        github_token_encrypted: existingGithub,
        openrouter_key_encrypted: existingOpenrouter,
      });
      expect(initialLoad.hasGithubToken).toBe(true);
      expect(initialLoad.hasOpenrouterKey).toBe(true);

      // Step 2: Admin explicitly clears tokens via form
      const clearResult = await processAdminFormTokens(
        CLEAR_TOKEN_VALUE,
        CLEAR_TOKEN_VALUE,
        TEST_KEY,
      );

      // Empty strings trigger CASE NULL in SQL
      expect(clearResult.githubTokenForDb).toBe("");
      expect(clearResult.openrouterKeyForDb).toBe("");

      // Step 3: Simulate SQL CASE expression behavior
      // CASE WHEN '' THEN NULL ELSE COALESCE(...) END
      const simulateCaseNull = (
        newVal: string | null,
        existing: string | null,
      ) => (newVal === "" ? null : (newVal ?? existing));

      const afterClearDb = {
        github_token_encrypted: simulateCaseNull(
          clearResult.githubTokenForDb,
          existingGithub,
        ),
        openrouter_key_encrypted: simulateCaseNull(
          clearResult.openrouterKeyForDb,
          existingOpenrouter,
        ),
      };

      // Step 4: Load shows tokens are gone
      const afterClearLoad = transformConfigForResponse(afterClearDb);
      expect(afterClearLoad.hasGithubToken).toBe(false);
      expect(afterClearLoad.hasOpenrouterKey).toBe(false);
    });
  });
});
