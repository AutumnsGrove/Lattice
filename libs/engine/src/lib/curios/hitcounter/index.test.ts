/**
 * Hit Counter Curio - Tests
 *
 * Tests for hit counter utilities: ID generation, count formatting,
 * digit splitting, label sanitization, and display transformation.
 */

import { describe, it, expect } from "vitest";
import {
  generateHitCounterId,
  formatCount,
  toDigits,
  sanitizeLabel,
  formatSinceDate,
  toDisplayCounter,
  DEFAULT_HIT_COUNTER_CONFIG,
  DEFAULT_LABEL,
  MAX_LABEL_LENGTH,
  MIN_DISPLAY_DIGITS,
  HIT_COUNTER_STYLE_OPTIONS,
  type HitCounterConfig,
} from "./index";

// =============================================================================
// generateHitCounterId
// =============================================================================

describe("generateHitCounterId", () => {
  it("generates ID with correct prefix", () => {
    const id = generateHitCounterId();
    expect(id).toMatch(/^hc_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateHitCounterId());
    }
    expect(ids.size).toBe(100);
  });
});

// =============================================================================
// formatCount — Number formatting with commas
// =============================================================================

describe("formatCount", () => {
  it("formats small numbers", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("formats thousands with commas", () => {
    expect(formatCount(1000)).toBe("1,000");
    expect(formatCount(1247)).toBe("1,247");
    expect(formatCount(12345)).toBe("12,345");
  });

  it("formats millions with commas", () => {
    expect(formatCount(1000000)).toBe("1,000,000");
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

// =============================================================================
// toDigits — Split count into individual digit strings
// =============================================================================

describe("toDigits", () => {
  it("zero-pads to minimum display digits", () => {
    const digits = toDigits(0);
    expect(digits).toEqual(["0", "0", "0", "0", "0", "0"]);
    expect(digits.length).toBe(MIN_DISPLAY_DIGITS);
  });

  it("zero-pads small numbers", () => {
    expect(toDigits(42)).toEqual(["0", "0", "0", "0", "4", "2"]);
  });

  it("does not truncate numbers larger than minimum digits", () => {
    expect(toDigits(1234567)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("handles negative numbers as zero", () => {
    const digits = toDigits(-5);
    expect(digits).toEqual(["0", "0", "0", "0", "0", "0"]);
  });

  it("floors floating point numbers", () => {
    expect(toDigits(42.9)).toEqual(["0", "0", "0", "0", "4", "2"]);
  });
});

// =============================================================================
// sanitizeLabel — Label input sanitization
// =============================================================================

describe("sanitizeLabel", () => {
  it("returns default label for null input", () => {
    expect(sanitizeLabel(null)).toBe(DEFAULT_LABEL);
  });

  it("returns default label for undefined input", () => {
    expect(sanitizeLabel(undefined)).toBe(DEFAULT_LABEL);
  });

  it("returns default label for empty string", () => {
    expect(sanitizeLabel("")).toBe(DEFAULT_LABEL);
  });

  it("trims whitespace", () => {
    expect(sanitizeLabel("  Visitors  ")).toBe("Visitors");
  });

  it("truncates long labels", () => {
    const longLabel = "A".repeat(200);
    const result = sanitizeLabel(longLabel);
    expect(result.length).toBe(MAX_LABEL_LENGTH);
  });

  it("strips HTML tags", () => {
    expect(sanitizeLabel("<b>Bold</b> text")).toBe("Bold text");
    expect(sanitizeLabel("<script>alert(1)</script>")).toBe("alert(1)");
  });

  it("preserves normal labels", () => {
    expect(sanitizeLabel("You are visitor")).toBe("You are visitor");
    expect(sanitizeLabel("Total page views:")).toBe("Total page views:");
  });
});

// =============================================================================
// formatSinceDate — Date formatting
// =============================================================================

describe("formatSinceDate", () => {
  it("formats a date with since prefix", () => {
    const result = formatSinceDate("2026-01-15T12:00:00Z");
    expect(result).toContain("since");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

// =============================================================================
// toDisplayCounter — Transform config to display data
// =============================================================================

describe("toDisplayCounter", () => {
  const createConfig = (
    overrides: Partial<HitCounterConfig> = {},
  ): HitCounterConfig => ({
    id: "hc_123",
    tenantId: "tenant_1",
    pagePath: "/",
    count: 1247,
    style: "classic",
    label: "You are visitor",
    showSinceDate: true,
    startedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  it("includes formatted count", () => {
    const display = toDisplayCounter(createConfig());
    expect(display.formattedCount).toBe("1,247");
  });

  it("includes digits array", () => {
    const display = toDisplayCounter(createConfig());
    expect(display.digits).toEqual(["0", "0", "1", "2", "4", "7"]);
  });

  it("preserves style and label", () => {
    const display = toDisplayCounter(createConfig({ style: "lcd" }));
    expect(display.style).toBe("lcd");
    expect(display.label).toBe("You are visitor");
  });

  it("preserves since date flag", () => {
    const display = toDisplayCounter(createConfig({ showSinceDate: false }));
    expect(display.showSinceDate).toBe(false);
  });
});

// =============================================================================
// Constants validation
// =============================================================================

describe("Constants", () => {
  describe("DEFAULT_HIT_COUNTER_CONFIG", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_HIT_COUNTER_CONFIG.style).toBe("classic");
      expect(DEFAULT_HIT_COUNTER_CONFIG.count).toBe(0);
      expect(DEFAULT_HIT_COUNTER_CONFIG.label).toBe("You are visitor");
      expect(DEFAULT_HIT_COUNTER_CONFIG.showSinceDate).toBe(true);
    });
  });

  describe("HIT_COUNTER_STYLE_OPTIONS", () => {
    it("has 4 style options", () => {
      expect(HIT_COUNTER_STYLE_OPTIONS).toHaveLength(4);
    });

    it("includes all style values", () => {
      const values = HIT_COUNTER_STYLE_OPTIONS.map((o) => o.value);
      expect(values).toContain("classic");
      expect(values).toContain("odometer");
      expect(values).toContain("minimal");
      expect(values).toContain("lcd");
    });
  });

  describe("MIN_DISPLAY_DIGITS", () => {
    it("is at least 6 for visual consistency", () => {
      expect(MIN_DISPLAY_DIGITS).toBeGreaterThanOrEqual(6);
    });
  });
});
