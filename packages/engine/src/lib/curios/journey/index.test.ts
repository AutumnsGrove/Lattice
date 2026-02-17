import { describe, it, expect } from "vitest";
import {
  isValidGithubRepoUrl,
  safeParseInt,
  toSqliteBoolean,
  GITHUB_REPO_PATTERN,
  DEFAULT_SNAPSHOT_LIMIT,
  MAX_SNAPSHOT_LIMIT,
  DEFAULT_MILESTONE_LIMIT,
  MAX_MILESTONE_LIMIT,
  CLEAR_TOKEN_VALUE,
} from "./index";
import { safeParseJson } from "$lib/utils/json";

describe("Journey Curio utilities", () => {
  // ============================================================================
  // safeParseJson Tests
  // ============================================================================

  describe("safeParseJson", () => {
    it("returns fallback for null input", () => {
      expect(safeParseJson(null, {})).toEqual({});
      expect(safeParseJson(null, [])).toEqual([]);
      expect(safeParseJson(null, "default")).toBe("default");
    });

    it("returns fallback for empty string", () => {
      expect(safeParseJson("", {})).toEqual({});
      expect(safeParseJson("", [])).toEqual([]);
    });

    it("parses valid JSON correctly", () => {
      expect(safeParseJson('{"key": "value"}', {})).toEqual({ key: "value" });
      expect(safeParseJson("[1, 2, 3]", [])).toEqual([1, 2, 3]);
      expect(safeParseJson('"string"', "")).toBe("string");
      expect(safeParseJson("42", 0)).toBe(42);
      expect(safeParseJson("true", false)).toBe(true);
    });

    it("returns fallback for malformed JSON", () => {
      expect(safeParseJson("{invalid}", {})).toEqual({});
      expect(safeParseJson("[1, 2, 3", [])).toEqual([]);
      expect(safeParseJson("undefined", null)).toBe(null);
      expect(safeParseJson("not json at all", "fallback")).toBe("fallback");
    });

    it("handles complex nested JSON", () => {
      const complexJson = JSON.stringify({
        svelte: { lines: 1234, pct: 45.2 },
        typescript: { lines: 5678, pct: 30.1 },
      });
      const result = safeParseJson<
        Record<string, { lines: number; pct: number }>
      >(complexJson, {});
      expect(result.svelte?.lines).toBe(1234);
      expect(result.typescript?.pct).toBe(30.1);
    });

    it("handles JSON with special characters", () => {
      const jsonWithEscapes = JSON.stringify({ message: 'Hello "World"' });
      expect(safeParseJson(jsonWithEscapes, {})).toEqual({
        message: 'Hello "World"',
      });
    });

    it("returns fallback for truncated JSON (database corruption scenario)", () => {
      expect(safeParseJson('{"key": "val', {})).toEqual({});
      expect(safeParseJson('["item1", "item2', [])).toEqual([]);
    });
  });

  // ============================================================================
  // isValidGithubRepoUrl Tests
  // ============================================================================

  describe("isValidGithubRepoUrl", () => {
    it("accepts valid owner/repo format", () => {
      expect(isValidGithubRepoUrl("owner/repo")).toBe(true);
      expect(isValidGithubRepoUrl("AutumnsGrove/Lattice")).toBe(true);
      expect(isValidGithubRepoUrl("user123/my-repo")).toBe(true);
      expect(isValidGithubRepoUrl("org_name/repo_name")).toBe(true);
    });

    it("accepts repos with dots and dashes", () => {
      expect(isValidGithubRepoUrl("owner/repo.js")).toBe(true);
      expect(isValidGithubRepoUrl("owner/my-awesome-repo")).toBe(true);
      expect(isValidGithubRepoUrl("my.org/repo-name")).toBe(true);
    });

    it("accepts repos with numbers", () => {
      expect(isValidGithubRepoUrl("user123/repo456")).toBe(true);
      expect(isValidGithubRepoUrl("123org/123repo")).toBe(true);
    });

    it("rejects full URLs", () => {
      expect(isValidGithubRepoUrl("https://github.com/owner/repo")).toBe(false);
      expect(isValidGithubRepoUrl("http://github.com/owner/repo")).toBe(false);
      expect(isValidGithubRepoUrl("github.com/owner/repo")).toBe(false);
    });

    it("rejects paths with extra segments", () => {
      expect(isValidGithubRepoUrl("owner/repo/extra")).toBe(false);
      expect(isValidGithubRepoUrl("owner/repo/tree/main")).toBe(false);
    });

    it("rejects just owner or just repo", () => {
      expect(isValidGithubRepoUrl("owner")).toBe(false);
      expect(isValidGithubRepoUrl("repo")).toBe(false);
    });

    it("rejects empty strings", () => {
      expect(isValidGithubRepoUrl("")).toBe(false);
      expect(isValidGithubRepoUrl("   ")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(isValidGithubRepoUrl("owner/repo@v1")).toBe(false);
      expect(isValidGithubRepoUrl("owner/repo#main")).toBe(false);
      expect(isValidGithubRepoUrl("owner/repo?ref=main")).toBe(false);
    });

    it("handles whitespace in input (trimmed)", () => {
      expect(isValidGithubRepoUrl("  owner/repo  ")).toBe(true);
      expect(isValidGithubRepoUrl("\towner/repo\n")).toBe(true);
    });

    it.each([
      ["owner/repo", true],
      ["AutumnsGrove/Lattice", true],
      ["my-org/my-repo.js", true],
      ["https://github.com/owner/repo", false],
      ["owner", false],
      ["owner/repo/extra", false],
      ["", false],
    ])("validates %s as %s", (input, expected) => {
      expect(isValidGithubRepoUrl(input)).toBe(expected);
    });
  });

  // ============================================================================
  // toSqliteBoolean Tests
  // ============================================================================

  describe("toSqliteBoolean", () => {
    it("returns 1 for true values", () => {
      expect(toSqliteBoolean(true, false)).toBe(1);
      expect(toSqliteBoolean(true, true)).toBe(1);
    });

    it("returns 0 for false values", () => {
      expect(toSqliteBoolean(false, true)).toBe(0);
      expect(toSqliteBoolean(false, false)).toBe(0);
    });

    it("uses default when value is undefined", () => {
      expect(toSqliteBoolean(undefined, true)).toBe(1);
      expect(toSqliteBoolean(undefined, false)).toBe(0);
    });

    it("prioritizes explicit value over default", () => {
      expect(toSqliteBoolean(true, false)).toBe(1);
      expect(toSqliteBoolean(false, true)).toBe(0);
    });
  });

  // ============================================================================
  // safeParseInt Tests
  // ============================================================================

  describe("safeParseInt", () => {
    it("parses valid integers", () => {
      expect(safeParseInt("10", 5)).toBe(10);
      expect(safeParseInt("0", 5)).toBe(0);
      expect(safeParseInt("100", 5)).toBe(100);
    });

    it("returns default for null input", () => {
      expect(safeParseInt(null, 20)).toBe(20);
    });

    it("returns default for invalid input", () => {
      expect(safeParseInt("abc", 20)).toBe(20);
      expect(safeParseInt("", 20)).toBe(20);
      expect(safeParseInt("NaN", 20)).toBe(20);
      expect(safeParseInt("12.5", 20)).toBe(12); // parseInt truncates
    });

    it("respects min constraint", () => {
      expect(safeParseInt("-5", 10, 0)).toBe(0);
      expect(safeParseInt("0", 10, 1)).toBe(1);
      expect(safeParseInt("5", 10, 10)).toBe(10);
    });

    it("respects max constraint", () => {
      expect(safeParseInt("150", 20, 0, 100)).toBe(100);
      expect(safeParseInt("50", 20, 0, 100)).toBe(50);
    });

    it("handles min and max together", () => {
      expect(safeParseInt("5", 10, 1, 100)).toBe(5);
      expect(safeParseInt("-5", 10, 1, 100)).toBe(1);
      expect(safeParseInt("150", 10, 1, 100)).toBe(100);
    });

    it("handles edge cases for pagination", () => {
      // Simulate ?limit=abc -> should return default
      expect(safeParseInt("abc", 20, 1, 100)).toBe(20);
      // Simulate ?offset=-1 -> should clamp to 0
      expect(safeParseInt("-1", 0, 0)).toBe(0);
      // Simulate ?limit=0 -> should clamp to min of 1
      expect(safeParseInt("0", 20, 1, 100)).toBe(1);
    });
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("constants", () => {
    it("has reasonable snapshot limits", () => {
      expect(DEFAULT_SNAPSHOT_LIMIT).toBe(20);
      expect(MAX_SNAPSHOT_LIMIT).toBe(100);
      expect(DEFAULT_SNAPSHOT_LIMIT).toBeLessThan(MAX_SNAPSHOT_LIMIT);
    });

    it("has reasonable milestone limits", () => {
      expect(DEFAULT_MILESTONE_LIMIT).toBe(10);
      expect(MAX_MILESTONE_LIMIT).toBe(50);
      expect(DEFAULT_MILESTONE_LIMIT).toBeLessThan(MAX_MILESTONE_LIMIT);
    });

    it("exports GITHUB_REPO_PATTERN as a regex", () => {
      expect(GITHUB_REPO_PATTERN).toBeInstanceOf(RegExp);
      expect(GITHUB_REPO_PATTERN.test("owner/repo")).toBe(true);
    });

    it("exports CLEAR_TOKEN_VALUE for token deletion", () => {
      expect(CLEAR_TOKEN_VALUE).toBe("__CLEAR__");
      expect(typeof CLEAR_TOKEN_VALUE).toBe("string");
    });
  });
});
