import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generatePollId,
  generateVoteId,
  generateOptionId,
  isPollClosed,
  isValidPollType,
  isValidResultsVisibility,
  sanitizeQuestion,
  sanitizeOptionText,
  parseOptions,
  parseSelectedOptions,
  calculateResults,
  POLL_TYPE_OPTIONS,
  RESULTS_VISIBILITY_OPTIONS,
  VALID_POLL_TYPES,
  VALID_RESULTS_VISIBILITY,
  MAX_QUESTION_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  MAX_OPTIONS,
  MIN_OPTIONS,
} from "./index";

// =============================================================================
// Constants
// =============================================================================

describe("Polls constants", () => {
  it("has poll type options", () => {
    expect(POLL_TYPE_OPTIONS).toHaveLength(2);
    expect(POLL_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      "single",
      "multiple",
    ]);
  });

  it("has results visibility options", () => {
    expect(RESULTS_VISIBILITY_OPTIONS).toHaveLength(4);
    expect(RESULTS_VISIBILITY_OPTIONS.map((o) => o.value)).toEqual([
      "always",
      "after-vote",
      "after-close",
      "admin-only",
    ]);
  });

  it("has valid poll types set", () => {
    expect(VALID_POLL_TYPES.has("single")).toBe(true);
    expect(VALID_POLL_TYPES.has("multiple")).toBe(true);
    expect(VALID_POLL_TYPES.has("ranked")).toBe(false);
  });

  it("has valid results visibility set", () => {
    expect(VALID_RESULTS_VISIBILITY.has("always")).toBe(true);
    expect(VALID_RESULTS_VISIBILITY.has("after-vote")).toBe(true);
    expect(VALID_RESULTS_VISIBILITY.has("after-close")).toBe(true);
    expect(VALID_RESULTS_VISIBILITY.has("admin-only")).toBe(true);
    expect(VALID_RESULTS_VISIBILITY.has("never")).toBe(false);
  });

  it("has correct limits", () => {
    expect(MAX_QUESTION_LENGTH).toBe(300);
    expect(MAX_OPTION_TEXT_LENGTH).toBe(200);
    expect(MAX_OPTIONS).toBe(20);
    expect(MIN_OPTIONS).toBe(2);
  });
});

// =============================================================================
// ID Generators
// =============================================================================

describe("generatePollId", () => {
  it("generates a poll_ prefixed ID", () => {
    const id = generatePollId();
    expect(id).toMatch(/^poll_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generatePollId()));
    expect(ids.size).toBe(20);
  });
});

describe("generateVoteId", () => {
  it("generates a pv_ prefixed ID", () => {
    const id = generateVoteId();
    expect(id).toMatch(/^pv_/);
  });
});

describe("generateOptionId", () => {
  it("generates an opt_ prefixed ID", () => {
    const id = generateOptionId();
    expect(id).toMatch(/^opt_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateOptionId()));
    expect(ids.size).toBe(20);
  });
});

// =============================================================================
// isPollClosed
// =============================================================================

describe("isPollClosed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for null close date", () => {
    expect(isPollClosed(null)).toBe(false);
  });

  it("returns true for past close date", () => {
    expect(isPollClosed("2025-06-14T00:00:00Z")).toBe(true);
  });

  it("returns false for future close date", () => {
    expect(isPollClosed("2025-06-16T00:00:00Z")).toBe(false);
  });
});

// =============================================================================
// Validators
// =============================================================================

describe("isValidPollType", () => {
  it("accepts single", () => {
    expect(isValidPollType("single")).toBe(true);
  });

  it("accepts multiple", () => {
    expect(isValidPollType("multiple")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(isValidPollType("ranked")).toBe(false);
    expect(isValidPollType("")).toBe(false);
  });
});

describe("isValidResultsVisibility", () => {
  it("accepts valid visibility values", () => {
    expect(isValidResultsVisibility("always")).toBe(true);
    expect(isValidResultsVisibility("after-vote")).toBe(true);
    expect(isValidResultsVisibility("after-close")).toBe(true);
    expect(isValidResultsVisibility("admin-only")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidResultsVisibility("never")).toBe(false);
    expect(isValidResultsVisibility("")).toBe(false);
  });
});

// =============================================================================
// Sanitizers
// =============================================================================

describe("sanitizeQuestion", () => {
  it("returns null for empty/null/undefined", () => {
    expect(sanitizeQuestion(null)).toBeNull();
    expect(sanitizeQuestion(undefined)).toBeNull();
    expect(sanitizeQuestion("")).toBeNull();
  });

  it("strips HTML tags", () => {
    expect(sanitizeQuestion("<b>Hello</b> world")).toBe("Hello world");
  });

  it("trims whitespace", () => {
    expect(sanitizeQuestion("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(500);
    const result = sanitizeQuestion(long);
    expect(result).toHaveLength(MAX_QUESTION_LENGTH);
  });

  it("returns null for whitespace-only after strip", () => {
    expect(sanitizeQuestion("<b></b>")).toBeNull();
  });
});

describe("sanitizeOptionText", () => {
  it("returns null for empty/null/undefined", () => {
    expect(sanitizeOptionText(null)).toBeNull();
    expect(sanitizeOptionText(undefined)).toBeNull();
    expect(sanitizeOptionText("")).toBeNull();
  });

  it("strips HTML tags", () => {
    expect(sanitizeOptionText("<em>Option A</em>")).toBe("Option A");
  });

  it("truncates to max length", () => {
    const long = "y".repeat(300);
    const result = sanitizeOptionText(long);
    expect(result).toHaveLength(MAX_OPTION_TEXT_LENGTH);
  });
});

// =============================================================================
// Parsers
// =============================================================================

describe("parseOptions", () => {
  it("parses valid JSON options", () => {
    const options = [
      { id: "opt_1", text: "Yes" },
      { id: "opt_2", text: "No" },
    ];
    const result = parseOptions(JSON.stringify(options));
    expect(result).toEqual(options);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseOptions("not json")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseOptions('{"key": "value"}')).toEqual([]);
  });

  it("filters out invalid option objects", () => {
    const mixed = [
      { id: "opt_1", text: "Valid" },
      { id: 123, text: "Invalid id type" },
      { text: "Missing id" },
      { id: "opt_2" },
      null,
      "string",
    ];
    const result = parseOptions(JSON.stringify(mixed));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("opt_1");
  });

  it("limits to MAX_OPTIONS", () => {
    const options = Array.from({ length: 30 }, (_, i) => ({
      id: `opt_${i}`,
      text: `Option ${i}`,
    }));
    const result = parseOptions(JSON.stringify(options));
    expect(result).toHaveLength(MAX_OPTIONS);
  });
});

describe("parseSelectedOptions", () => {
  it("parses valid JSON array of strings", () => {
    const result = parseSelectedOptions(JSON.stringify(["opt_1", "opt_2"]));
    expect(result).toEqual(["opt_1", "opt_2"]);
  });

  it("filters out non-strings", () => {
    const result = parseSelectedOptions(JSON.stringify(["opt_1", 123, null]));
    expect(result).toEqual(["opt_1"]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseSelectedOptions("bad")).toEqual([]);
  });

  it("returns empty array for non-array", () => {
    expect(parseSelectedOptions('"string"')).toEqual([]);
  });
});

// =============================================================================
// calculateResults
// =============================================================================

describe("calculateResults", () => {
  const options = [
    { id: "opt_a", text: "Option A" },
    { id: "opt_b", text: "Option B" },
    { id: "opt_c", text: "Option C" },
  ];

  it("calculates results with no votes", () => {
    const results = calculateResults(options, []);
    expect(results.totalVotes).toBe(0);
    expect(results.optionCounts).toEqual({
      opt_a: 0,
      opt_b: 0,
      opt_c: 0,
    });
  });

  it("calculates results with single choice votes", () => {
    const votes = [
      { selectedOptions: ["opt_a"] },
      { selectedOptions: ["opt_a"] },
      { selectedOptions: ["opt_b"] },
    ];
    const results = calculateResults(options, votes);
    expect(results.totalVotes).toBe(3);
    expect(results.optionCounts.opt_a).toBe(2);
    expect(results.optionCounts.opt_b).toBe(1);
    expect(results.optionCounts.opt_c).toBe(0);
  });

  it("calculates results with multiple choice votes", () => {
    const votes = [
      { selectedOptions: ["opt_a", "opt_b"] },
      { selectedOptions: ["opt_b", "opt_c"] },
    ];
    const results = calculateResults(options, votes);
    expect(results.totalVotes).toBe(2);
    expect(results.optionCounts.opt_a).toBe(1);
    expect(results.optionCounts.opt_b).toBe(2);
    expect(results.optionCounts.opt_c).toBe(1);
  });

  it("ignores invalid option IDs in votes", () => {
    const votes = [{ selectedOptions: ["opt_a", "opt_invalid"] }];
    const results = calculateResults(options, votes);
    expect(results.totalVotes).toBe(1);
    expect(results.optionCounts.opt_a).toBe(1);
  });
});
