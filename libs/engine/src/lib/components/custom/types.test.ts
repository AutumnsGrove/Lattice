import { describe, it, expect } from "vitest";
import { isValidIcon, DEFAULT_SCROLL_OFFSET } from "./types.js";

describe("TOC Types", () => {
  describe("DEFAULT_SCROLL_OFFSET", () => {
    it("is a number", () => {
      expect(typeof DEFAULT_SCROLL_OFFSET).toBe("number");
    });

    it("is a reasonable offset value (between 40 and 200)", () => {
      expect(DEFAULT_SCROLL_OFFSET).toBeGreaterThanOrEqual(40);
      expect(DEFAULT_SCROLL_OFFSET).toBeLessThanOrEqual(200);
    });
  });

  describe("isValidIcon", () => {
    it("returns false for null", () => {
      expect(isValidIcon(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isValidIcon(undefined)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isValidIcon({})).toBe(false);
    });

    it("returns true for function", () => {
      const mockComponent = () => {};
      expect(isValidIcon(mockComponent)).toBe(true);
    });

    it("returns true for non-empty object (compiled component)", () => {
      const mockCompiledComponent = { render: () => {} };
      expect(isValidIcon(mockCompiledComponent)).toBe(true);
    });

    it("returns false for primitives", () => {
      expect(isValidIcon("string")).toBe(false);
      expect(isValidIcon(123)).toBe(false);
      expect(isValidIcon(true)).toBe(false);
    });

    it("returns false for array", () => {
      expect(isValidIcon([])).toBe(false);
    });

    it("returns true for class-like function", () => {
      class MockComponent {
        render() {}
      }
      expect(isValidIcon(MockComponent)).toBe(true);
    });
  });
});
