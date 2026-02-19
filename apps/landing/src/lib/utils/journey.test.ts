import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatBytes,
  safeParseInt,
  parseTimestampToDate,
  getGrowthIcon,
} from "./journey";

describe("journey.ts", () => {
  describe("formatNumber", () => {
    it("should format small numbers without separators", () => {
      expect(formatNumber(123)).toBe("123");
    });

    it("should format large numbers with locale separators", () => {
      // Note: locale may vary (comma vs period), but should have separators
      const result = formatNumber(1234567);
      expect(result).toMatch(/1[,.]?234[,.]?567/);
    });

    it("should handle zero", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("should handle negative numbers", () => {
      const result = formatNumber(-1234);
      expect(result).toContain("1");
      expect(result).toContain("234");
    });
  });

  describe("formatBytes", () => {
    it('should return "Not Published" for 0 bytes', () => {
      expect(formatBytes(0)).toBe("Not Published");
    });

    it('should return "Not Published" for falsy values', () => {
      expect(formatBytes(null as unknown as number)).toBe("Not Published");
      expect(formatBytes(undefined as unknown as number)).toBe("Not Published");
    });

    it('should return "Not Published" for negative values', () => {
      expect(formatBytes(-1)).toBe("Not Published");
      expect(formatBytes(-1000)).toBe("Not Published");
      expect(formatBytes(-1048576)).toBe("Not Published");
    });

    it("should format bytes under 1KB", () => {
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1)).toBe("1 B");
      expect(formatBytes(1023)).toBe("1023 B");
    });

    it("should format bytes as KB", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(10240)).toBe("10.0 KB");
    });

    it("should format bytes as MB", () => {
      expect(formatBytes(1048576)).toBe("1.00 MB");
      expect(formatBytes(1572864)).toBe("1.50 MB");
      expect(formatBytes(7346971)).toBe("7.01 MB"); // Real package size
    });

    it("should handle edge case at KB/MB boundary", () => {
      expect(formatBytes(1024 * 1024 - 1)).toBe("1024.0 KB");
      expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    });

    it("should handle very large sizes", () => {
      expect(formatBytes(1024 * 1024 * 100)).toBe("100.00 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1024.00 MB");
    });
  });

  describe("safeParseInt", () => {
    it("should parse valid integers", () => {
      expect(safeParseInt("123")).toBe(123);
      expect(safeParseInt("0")).toBe(0);
      expect(safeParseInt("-456")).toBe(-456);
    });

    it("should return 0 for undefined", () => {
      expect(safeParseInt(undefined)).toBe(0);
    });

    it("should return 0 for empty string", () => {
      expect(safeParseInt("")).toBe(0);
    });

    it("should return 0 for non-numeric strings", () => {
      expect(safeParseInt("abc")).toBe(0);
      expect(safeParseInt("12.34")).toBe(12); // parseInt truncates
    });

    it("should handle strings with leading zeros", () => {
      expect(safeParseInt("007")).toBe(7);
    });

    it("should handle whitespace", () => {
      expect(safeParseInt("  42  ")).toBe(42);
    });
  });

  describe("parseTimestampToDate", () => {
    it("should parse valid timestamp format", () => {
      const result = parseTimestampToDate("2024-01-15_12-30-00");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should parse dates with different months", () => {
      expect(parseTimestampToDate("2024-06-01_00-00-00")).toBe("Jun 1, 2024");
      expect(parseTimestampToDate("2024-12-31_23-59-59")).toBe("Dec 31, 2024");
    });

    it('should return "Unknown date" for empty string', () => {
      expect(parseTimestampToDate("")).toBe("Unknown date");
    });

    it('should return "Unknown date" for missing underscore', () => {
      expect(parseTimestampToDate("2024-01-15")).toBe("Unknown date");
    });

    it('should return "Unknown date" for invalid date parts', () => {
      expect(parseTimestampToDate("invalid_12-30-00")).toBe("Unknown date");
      expect(parseTimestampToDate("2024-13-01_12-30-00")).toBe("Unknown date"); // Invalid month
      expect(parseTimestampToDate("2024-01-32_12-30-00")).toBe("Unknown date"); // Invalid day
    });

    it('should return "Unknown date" for year before 2000', () => {
      expect(parseTimestampToDate("1999-01-15_12-30-00")).toBe("Unknown date");
    });

    it("should handle month 0 as invalid", () => {
      expect(parseTimestampToDate("2024-00-15_12-30-00")).toBe("Unknown date");
    });
  });

  describe("getGrowthIcon", () => {
    it("should return up arrow for positive values", () => {
      expect(getGrowthIcon(1)).toBe("↑");
      expect(getGrowthIcon(100)).toBe("↑");
      expect(getGrowthIcon(0.1)).toBe("↑");
    });

    it("should return down arrow for negative values", () => {
      expect(getGrowthIcon(-1)).toBe("↓");
      expect(getGrowthIcon(-100)).toBe("↓");
      expect(getGrowthIcon(-0.1)).toBe("↓");
    });

    it("should return right arrow for zero", () => {
      expect(getGrowthIcon(0)).toBe("→");
    });
  });
});
