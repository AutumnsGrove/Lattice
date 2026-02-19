import { describe, it, expect, vi } from "vitest";
import { THRESHOLD_ERRORS, logThresholdError } from "./errors.js";

describe("Threshold errors", () => {
  it("has unique error codes", () => {
    const codes = Object.values(THRESHOLD_ERRORS).map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("all codes follow GROVE-THRESHOLD-XXX format", () => {
    for (const [key, err] of Object.entries(THRESHOLD_ERRORS)) {
      expect(err.code).toMatch(
        /^GROVE-THRESHOLD-\d{3}$/,
        `${key} has invalid code format: ${err.code}`,
      );
    }
  });

  it("all entries have required fields", () => {
    for (const [key, err] of Object.entries(THRESHOLD_ERRORS)) {
      expect(err.category, `${key} missing category`).toBeDefined();
      expect(err.userMessage, `${key} missing userMessage`).toBeTruthy();
      expect(err.adminMessage, `${key} missing adminMessage`).toBeTruthy();
    }
  });

  it("categories are valid", () => {
    const validCategories = ["user", "admin", "bug"];
    for (const [key, err] of Object.entries(THRESHOLD_ERRORS)) {
      expect(
        validCategories,
        `${key} has invalid category: ${err.category}`,
      ).toContain(err.category);
    }
  });

  it("logThresholdError delegates to logGroveError", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logThresholdError(THRESHOLD_ERRORS.RATE_LIMITED, { endpoint: "/api/test" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
