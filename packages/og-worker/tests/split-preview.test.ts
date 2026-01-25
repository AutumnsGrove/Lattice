/**
 * Tests for splitPreviewIntoLines - word-aware text splitting for OG images
 *
 * This is the new code added in this PR. Tests serve as regression tests
 * for the bug fix (overlong words weren't being truncated when moved to a new line).
 */
import { describe, it, expect } from "vitest";
import { splitPreviewIntoLines } from "../src/pure-functions";
import type { LineSplit } from "../src/pure-functions";

describe("splitPreviewIntoLines", () => {
  describe("empty/null/undefined input handling", () => {
    it("should return empty lines for null input", () => {
      const result = splitPreviewIntoLines(null);
      expect(result).toEqual({ line1: "", line2: "", line3: "", line4: "" });
    });

    it("should return empty lines for undefined input", () => {
      const result = splitPreviewIntoLines(undefined);
      expect(result).toEqual({ line1: "", line2: "", line3: "", line4: "" });
    });

    it("should return empty lines for empty string", () => {
      const result = splitPreviewIntoLines("");
      expect(result).toEqual({ line1: "", line2: "", line3: "", line4: "" });
    });

    it("should return empty lines for whitespace-only input", () => {
      const result = splitPreviewIntoLines("   \t\n  ");
      expect(result).toEqual({ line1: "", line2: "", line3: "", line4: "" });
    });
  });

  describe("word boundary respect", () => {
    it("should not split words in the middle", () => {
      const text = "Hello world this is a test";
      const result = splitPreviewIntoLines(text, [10, 10, 10, 10]);

      // "Hello world" is 11 chars, too long for 10
      // Should split to "Hello" on line 1, "world" on line 2
      expect(result.line1).toBe("Hello");
      expect(result.line2).toBe("world this");
    });

    it("should fit multiple words on a line when they fit", () => {
      const text = "One two three";
      const result = splitPreviewIntoLines(text, [20, 20, 20, 20]);

      expect(result.line1).toBe("One two three");
      expect(result.line2).toBe("");
    });
  });

  describe("long word truncation", () => {
    it("should truncate a single overlong word with ellipsis", () => {
      const text = "Supercalifragilisticexpialidocious";
      const result = splitPreviewIntoLines(text, [15, 15, 15, 15]);

      // Truncation: word.slice(0, 15-3) + "..." = 12 chars + 3 = 15 total
      expect(result.line1).toBe("Supercalifra...");
      expect(result.line1.length).toBeLessThanOrEqual(15);
    });

    it("should truncate overlong words when moving to next line (regression test)", () => {
      // This was the bug: words moving from a full line weren't being truncated
      const text = "Some text verylongwordthatexceedsthirtyfivecharacterslimit";
      const result = splitPreviewIntoLines(text, [10, 10, 10, 35]);

      // "Some text" fits on line 1 (9 chars)
      // "verylongwordthatexceedsthirtyfivecharacterslimit" should move to line 2
      // Line 2 has max 10, so it should be truncated
      expect(result.line1).toBe("Some text");
      expect(result.line2.length).toBeLessThanOrEqual(10);
      expect(result.line2).toMatch(/\.\.\.$/);
    });

    it("should truncate words on line 4 with its shorter limit", () => {
      // Default limits: [55, 55, 45, 35] - line 4 is shortest
      const text =
        "A B C superlongwordthatdefinitelyexceedsthirtyfivecharacterslimit";
      const result = splitPreviewIntoLines(text, [2, 2, 2, 35]);

      // Force words to spill to line 4
      expect(result.line4.length).toBeLessThanOrEqual(35);
      if (result.line4.length > 0) {
        // If there's content on line 4, any long word should be truncated
        expect(result.line4.length).toBeLessThanOrEqual(35);
      }
    });
  });

  describe("line length limits", () => {
    it("should respect default line limits [55, 55, 45, 35]", () => {
      const longText = "A".repeat(200);
      const result = splitPreviewIntoLines(longText);

      // Single word gets truncated on line 1
      expect(result.line1.length).toBeLessThanOrEqual(55);
      expect(result.line1).toMatch(/\.\.\.$/);
    });

    it("should respect custom line limits", () => {
      const text = "Word1 Word2 Word3 Word4 Word5";
      const result = splitPreviewIntoLines(text, [5, 5, 5, 5]);

      expect(result.line1).toBe("Word1");
      expect(result.line2).toBe("Word2");
      expect(result.line3).toBe("Word3");
      expect(result.line4).toBe("Word4");
      // Word5 is dropped (only 4 lines)
    });
  });

  describe("whitespace normalization", () => {
    it("should collapse multiple spaces to single space", () => {
      const text = "Hello    world";
      const result = splitPreviewIntoLines(text, [50, 50, 50, 50]);

      expect(result.line1).toBe("Hello world");
    });

    it("should handle tabs and newlines as spaces", () => {
      const text = "Hello\tworld\nnew line";
      const result = splitPreviewIntoLines(text, [50, 50, 50, 50]);

      expect(result.line1).toBe("Hello world new line");
    });

    it("should trim leading and trailing whitespace", () => {
      const text = "  Hello world  ";
      const result = splitPreviewIntoLines(text, [50, 50, 50, 50]);

      expect(result.line1).toBe("Hello world");
    });
  });

  describe("stop at 4 lines", () => {
    it("should not produce more than 4 lines", () => {
      const text = "One two three four five six seven eight nine ten";
      const result = splitPreviewIntoLines(text, [5, 5, 5, 5]);

      // Each word is 3-5 chars, fits one per line
      expect(result.line1).toBe("One");
      expect(result.line2).toBe("two");
      expect(result.line3).toBe("three");
      expect(result.line4).toBe("four");
      // Remaining words are dropped
    });

    it("should return exactly 4 line properties even if fewer lines needed", () => {
      const text = "Short";
      const result = splitPreviewIntoLines(text, [50, 50, 50, 50]);

      expect(Object.keys(result)).toHaveLength(4);
      expect(result).toHaveProperty("line1");
      expect(result).toHaveProperty("line2");
      expect(result).toHaveProperty("line3");
      expect(result).toHaveProperty("line4");
    });
  });

  describe("progressive line length limits (OG image fade effect)", () => {
    it("should work with decreasing line lengths", () => {
      // This simulates the actual OG image layout where lines get shorter
      // to accommodate the fade effect on the glass panel
      const text =
        "This is a longer text that will be split across multiple lines with decreasing lengths to create a fade effect";
      const result = splitPreviewIntoLines(text, [55, 55, 45, 35]);

      expect(result.line1.length).toBeLessThanOrEqual(55);
      expect(result.line2.length).toBeLessThanOrEqual(55);
      expect(result.line3.length).toBeLessThanOrEqual(45);
      expect(result.line4.length).toBeLessThanOrEqual(35);
    });
  });
});
