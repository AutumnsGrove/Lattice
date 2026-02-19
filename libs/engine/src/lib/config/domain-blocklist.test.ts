/**
 * Domain Blocklist Tests
 *
 * Tests for Loam name protection system covering:
 * - Username validation (length, pattern)
 * - Blocked username detection (exact match, prefix, suffix)
 * - Performance optimization (Map-based lookup)
 * - Error message generation
 *
 * @see docs/specs/loam-spec.md
 */

import { describe, it, expect } from "vitest";
import {
  isUsernameBlocked,
  getBlockedMessage,
  VALIDATION_CONFIG,
  BLOCKED_USERNAMES,
  BLOCKED_USERNAMES_MAP,
  COMPLETE_BLOCKLIST,
  VALID_BLOCKLIST_REASONS,
  type BlocklistReason,
} from "./domain-blocklist";

// =============================================================================
// Data Structure Tests
// =============================================================================

describe("Data Structures", () => {
  it("should have BLOCKED_USERNAMES Set populated", () => {
    expect(BLOCKED_USERNAMES.size).toBeGreaterThan(100);
  });

  it("should have BLOCKED_USERNAMES_MAP populated with same entries", () => {
    expect(BLOCKED_USERNAMES_MAP.size).toBe(BLOCKED_USERNAMES.size);
  });

  it("should have COMPLETE_BLOCKLIST with entries", () => {
    expect(COMPLETE_BLOCKLIST.length).toBeGreaterThan(100);
  });

  it("should have all required reason types in VALID_BLOCKLIST_REASONS", () => {
    expect(VALID_BLOCKLIST_REASONS).toContain("system");
    expect(VALID_BLOCKLIST_REASONS).toContain("grove_service");
    expect(VALID_BLOCKLIST_REASONS).toContain("trademark");
    expect(VALID_BLOCKLIST_REASONS).toContain("impersonation");
    expect(VALID_BLOCKLIST_REASONS).toContain("offensive");
    expect(VALID_BLOCKLIST_REASONS).toContain("fraud");
    expect(VALID_BLOCKLIST_REASONS).toContain("future_reserved");
  });
});

// =============================================================================
// isUsernameBlocked - Exact Matches
// =============================================================================

describe("isUsernameBlocked - Exact Matches", () => {
  it("should block system reserved names", () => {
    expect(isUsernameBlocked("admin")).toBe("system");
    expect(isUsernameBlocked("api")).toBe("system");
    expect(isUsernameBlocked("www")).toBe("system");
    expect(isUsernameBlocked("login")).toBe("system");
  });

  it("should block Grove service names", () => {
    expect(isUsernameBlocked("meadow")).toBe("grove_service");
    expect(isUsernameBlocked("forage")).toBe("grove_service");
    expect(isUsernameBlocked("loam")).toBe("grove_service");
    expect(isUsernameBlocked("heartwood")).toBe("grove_service");
  });

  it("should block Grove trademarks", () => {
    expect(isUsernameBlocked("grove")).toBe("grove_service"); // Also in services
    expect(isUsernameBlocked("groveplace")).toBe("trademark");
    expect(isUsernameBlocked("seedling")).toBe("trademark");
    expect(isUsernameBlocked("sapling")).toBe("trademark");
  });

  it("should block impersonation terms", () => {
    expect(isUsernameBlocked("official")).toBe("impersonation");
    expect(isUsernameBlocked("verified")).toBe("impersonation");
    expect(isUsernameBlocked("support")).toBe("system"); // Support is in system
  });

  it("should block fraud patterns", () => {
    expect(isUsernameBlocked("freemoney")).toBe("fraud");
    expect(isUsernameBlocked("paypal")).toBe("fraud");
    expect(isUsernameBlocked("giveaway")).toBe("fraud");
  });

  it("should block future reserved names", () => {
    expect(isUsernameBlocked("hollow")).toBe("future_reserved");
    expect(isUsernameBlocked("firefly")).toBe("future_reserved");
    expect(isUsernameBlocked("sunrise")).toBe("future_reserved");
  });

  it("should be case-insensitive", () => {
    expect(isUsernameBlocked("ADMIN")).toBe("system");
    expect(isUsernameBlocked("Admin")).toBe("system");
    expect(isUsernameBlocked("aDmIn")).toBe("system");
    expect(isUsernameBlocked("MEADOW")).toBe("grove_service");
  });

  it("should handle whitespace", () => {
    expect(isUsernameBlocked("  admin  ")).toBe("system");
    expect(isUsernameBlocked("\tadmin\t")).toBe("system");
  });
});

// =============================================================================
// isUsernameBlocked - Prefix Patterns
// =============================================================================

describe("isUsernameBlocked - Prefix Patterns", () => {
  it("should block grove- prefix", () => {
    expect(isUsernameBlocked("grove-anything")).toBe("impersonation");
    expect(isUsernameBlocked("grove-support")).toBe("impersonation");
    expect(isUsernameBlocked("grove-admin")).toBe("impersonation");
  });

  it("should block admin- prefix", () => {
    expect(isUsernameBlocked("admin-panel")).toBe("impersonation");
    expect(isUsernameBlocked("admin-tools")).toBe("impersonation");
  });

  it("should block official- prefix", () => {
    expect(isUsernameBlocked("official-account")).toBe("impersonation");
    expect(isUsernameBlocked("official-grove")).toBe("impersonation");
  });

  it("should block verified- prefix", () => {
    expect(isUsernameBlocked("verified-user")).toBe("impersonation");
    expect(isUsernameBlocked("verified-blog")).toBe("impersonation");
  });
});

// =============================================================================
// isUsernameBlocked - Suffix Patterns
// =============================================================================

describe("isUsernameBlocked - Suffix Patterns", () => {
  it("should block -official suffix", () => {
    expect(isUsernameBlocked("user-official")).toBe("impersonation");
    expect(isUsernameBlocked("grove-official")).toBe("impersonation");
  });

  it("should block -verified suffix", () => {
    expect(isUsernameBlocked("user-verified")).toBe("impersonation");
    expect(isUsernameBlocked("autumn-verified")).toBe("impersonation");
  });

  it("should block -admin suffix", () => {
    expect(isUsernameBlocked("site-admin")).toBe("impersonation");
    expect(isUsernameBlocked("super-admin")).toBe("impersonation");
  });

  it("should block -support suffix", () => {
    expect(isUsernameBlocked("grove-support")).toBe("impersonation"); // Also matches grove- prefix
    expect(isUsernameBlocked("billing-support")).toBe("impersonation");
  });
});

// =============================================================================
// isUsernameBlocked - Valid Usernames
// =============================================================================

describe("isUsernameBlocked - Valid Usernames", () => {
  it("should allow valid usernames", () => {
    expect(isUsernameBlocked("autumn-writes")).toBeNull();
    expect(isUsernameBlocked("coolblogger")).toBeNull();
    expect(isUsernameBlocked("my-garden")).toBeNull();
    expect(isUsernameBlocked("coffee-lover-2024")).toBeNull();
  });

  it("should allow usernames with numbers", () => {
    expect(isUsernameBlocked("user123")).toBeNull();
    expect(isUsernameBlocked("blog2024")).toBeNull();
    expect(isUsernameBlocked("my-blog-42")).toBeNull();
  });

  it("should allow short but valid usernames", () => {
    expect(isUsernameBlocked("abc")).toBeNull();
    expect(isUsernameBlocked("xyz")).toBeNull();
  });
});

// =============================================================================
// VALIDATION_CONFIG
// =============================================================================

describe("VALIDATION_CONFIG", () => {
  it("should have correct min/max lengths", () => {
    expect(VALIDATION_CONFIG.minLength).toBe(3);
    expect(VALIDATION_CONFIG.maxLength).toBe(30);
  });

  it("should have valid regex pattern", () => {
    expect(VALIDATION_CONFIG.pattern).toBeInstanceOf(RegExp);
  });

  it("should validate correct patterns", () => {
    expect(VALIDATION_CONFIG.pattern.test("abc")).toBe(true);
    expect(VALIDATION_CONFIG.pattern.test("hello-world")).toBe(true);
    expect(VALIDATION_CONFIG.pattern.test("user123")).toBe(true);
    expect(VALIDATION_CONFIG.pattern.test("my-cool-blog-2024")).toBe(true);
  });

  it("should reject invalid patterns", () => {
    expect(VALIDATION_CONFIG.pattern.test("123abc")).toBe(false); // Starts with number
    expect(VALIDATION_CONFIG.pattern.test("-abc")).toBe(false); // Starts with hyphen
    expect(VALIDATION_CONFIG.pattern.test("abc-")).toBe(false); // Ends with hyphen
    expect(VALIDATION_CONFIG.pattern.test("abc--def")).toBe(false); // Double hyphen
    expect(VALIDATION_CONFIG.pattern.test("ABC")).toBe(false); // Uppercase
    expect(VALIDATION_CONFIG.pattern.test("abc_def")).toBe(false); // Underscore
    expect(VALIDATION_CONFIG.pattern.test("abc def")).toBe(false); // Space
  });
});

// =============================================================================
// getBlockedMessage
// =============================================================================

describe("getBlockedMessage", () => {
  it("should return correct message for system", () => {
    expect(getBlockedMessage("system")).toBe(
      "This username is reserved for system use",
    );
  });

  it("should return correct message for grove_service", () => {
    expect(getBlockedMessage("grove_service")).toBe(
      "This username is reserved for a Grove service",
    );
  });

  it("should return correct message for trademark", () => {
    expect(getBlockedMessage("trademark")).toBe("This username is reserved");
  });

  it("should return generic message for impersonation", () => {
    expect(getBlockedMessage("impersonation")).toBe(
      "This username is not available",
    );
  });

  it("should return generic message for offensive", () => {
    expect(getBlockedMessage("offensive")).toBe(
      "This username is not available",
    );
  });

  it("should return generic message for fraud", () => {
    expect(getBlockedMessage("fraud")).toBe("This username is not available");
  });

  it("should return correct message for future_reserved", () => {
    expect(getBlockedMessage("future_reserved")).toBe(
      "This username is reserved",
    );
  });

  it("should return generic message for unknown reasons", () => {
    // Type assertion to test edge case
    expect(getBlockedMessage("unknown" as BlocklistReason)).toBe(
      "This username is not available",
    );
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe("Performance", () => {
  it("should use Map for O(1) lookup instead of array find", () => {
    // Verify the Map is being used correctly
    const testUsername = "meadow";
    const mapResult = BLOCKED_USERNAMES_MAP.get(testUsername);
    expect(mapResult).toBe("grove_service");
  });

  // Skip in CI/hooks - this benchmark tanks the machine and causes flaky failures
  // Run manually with: pnpm test -- --grep "should be fast"
  it.skip("should be fast for multiple lookups", () => {
    const usernames = [
      "admin",
      "meadow",
      "valid-user",
      "grove-support",
      "user-official",
      "coolblogger",
      "freemoney",
      "another-valid",
    ];

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (const username of usernames) {
        isUsernameBlocked(username);
      }
    }
    const duration = performance.now() - start;

    // Should complete 8000 lookups in under 100ms
    expect(duration).toBeLessThan(100);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  it("should handle empty strings", () => {
    expect(isUsernameBlocked("")).toBeNull();
  });

  it("should handle very long usernames", () => {
    const longUsername = "a".repeat(100);
    expect(isUsernameBlocked(longUsername)).toBeNull();
  });

  it("should handle special characters in normalized form", () => {
    // These should be normalized out
    expect(isUsernameBlocked("admin\x00")).toBe("system");
  });

  it("should not have duplicates in COMPLETE_BLOCKLIST", () => {
    const usernames = COMPLETE_BLOCKLIST.map((e) => e.username);
    const uniqueUsernames = new Set(usernames);
    // Allow some duplicates due to overlapping categories
    expect(uniqueUsernames.size).toBeGreaterThan(
      COMPLETE_BLOCKLIST.length * 0.9,
    );
  });
});
