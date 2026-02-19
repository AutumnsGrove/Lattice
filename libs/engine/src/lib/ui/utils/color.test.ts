/**
 * Color Utilities Tests
 *
 * Tests for Grove's HSL-based color manipulation utilities covering:
 * - Hex to HSL conversion
 * - HSL to Hex conversion
 * - Tier color generation for the Logo component
 * - Lightness and saturation adjustments
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  generateTierColors,
  adjustLightness,
  adjustSaturation,
  type HSLColor,
  type TierColors,
  type LogoTierColors,
} from "./color";

// =============================================================================
// HEX TO HSL CONVERSION TESTS
// =============================================================================

describe("hexToHsl", () => {
  describe("Primary Colors", () => {
    it("should convert pure red correctly", () => {
      const result = hexToHsl("#ff0000");
      expect(result.h).toBeCloseTo(0, 0);
      expect(result.s).toBeCloseTo(100, 0);
      expect(result.l).toBeCloseTo(50, 0);
    });

    it("should convert pure green correctly", () => {
      const result = hexToHsl("#00ff00");
      expect(result.h).toBeCloseTo(120, 0);
      expect(result.s).toBeCloseTo(100, 0);
      expect(result.l).toBeCloseTo(50, 0);
    });

    it("should convert pure blue correctly", () => {
      const result = hexToHsl("#0000ff");
      expect(result.h).toBeCloseTo(240, 0);
      expect(result.s).toBeCloseTo(100, 0);
      expect(result.l).toBeCloseTo(50, 0);
    });
  });

  describe("Grayscale", () => {
    it("should convert white correctly", () => {
      const result = hexToHsl("#ffffff");
      expect(result.s).toBe(0); // No saturation
      expect(result.l).toBeCloseTo(100, 0);
    });

    it("should convert black correctly", () => {
      const result = hexToHsl("#000000");
      expect(result.s).toBe(0);
      expect(result.l).toBe(0);
    });

    it("should convert mid-gray correctly", () => {
      const result = hexToHsl("#808080");
      expect(result.s).toBe(0);
      expect(result.l).toBeCloseTo(50, 0);
    });
  });

  describe("Grove Palette Colors", () => {
    it("should convert autumn red correctly", () => {
      const result = hexToHsl("#DC2626"); // Grove autumn red
      expect(result.h).toBeCloseTo(0, 0); // Red hue
      expect(result.s).toBeGreaterThan(70);
      expect(result.l).toBeGreaterThan(40);
      expect(result.l).toBeLessThan(60);
    });

    it("should convert summer green correctly", () => {
      const result = hexToHsl("#15803d"); // Grove summer green
      expect(result.h).toBeGreaterThan(130);
      expect(result.h).toBeLessThan(160);
      expect(result.s).toBeGreaterThan(60);
    });

    it("should convert midnight purple correctly", () => {
      const result = hexToHsl("#4c1d95"); // Grove midnight purple
      expect(result.h).toBeGreaterThan(250);
      expect(result.h).toBeLessThan(280);
    });
  });

  describe("Input Formats", () => {
    it("should handle hex with # prefix", () => {
      const result = hexToHsl("#ff0000");
      expect(result.h).toBeCloseTo(0, 0);
    });

    it("should handle hex without # prefix", () => {
      const result = hexToHsl("ff0000");
      expect(result.h).toBeCloseTo(0, 0);
    });

    it("should handle lowercase hex", () => {
      const result = hexToHsl("#aabbcc");
      expect(result.h).toBeDefined();
    });

    it("should handle uppercase hex", () => {
      const result = hexToHsl("#AABBCC");
      expect(result.h).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should return default for invalid hex", () => {
      const result = hexToHsl("invalid");
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.l).toBe(50);
    });

    it("should return default for empty string", () => {
      const result = hexToHsl("");
      expect(result.l).toBe(50);
    });

    it("should return default for short hex (3 chars)", () => {
      // Our implementation only handles 6-char hex
      const result = hexToHsl("#f00");
      expect(result.l).toBe(50); // Falls back to default
    });
  });
});

// =============================================================================
// HSL TO HEX CONVERSION TESTS
// =============================================================================

describe("hslToHex", () => {
  describe("Primary Colors", () => {
    it("should convert red HSL to hex", () => {
      const result = hslToHex(0, 100, 50);
      expect(result.toLowerCase()).toBe("#ff0000");
    });

    it("should convert green HSL to hex", () => {
      const result = hslToHex(120, 100, 50);
      expect(result.toLowerCase()).toBe("#00ff00");
    });

    it("should convert blue HSL to hex", () => {
      const result = hslToHex(240, 100, 50);
      expect(result.toLowerCase()).toBe("#0000ff");
    });
  });

  describe("Grayscale", () => {
    it("should convert white HSL to hex", () => {
      const result = hslToHex(0, 0, 100);
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("should convert black HSL to hex", () => {
      const result = hslToHex(0, 0, 0);
      expect(result.toLowerCase()).toBe("#000000");
    });

    it("should ignore hue when saturation is 0", () => {
      // All these should produce the same gray
      const gray1 = hslToHex(0, 0, 50);
      const gray2 = hslToHex(180, 0, 50);
      const gray3 = hslToHex(300, 0, 50);
      expect(gray1).toBe(gray2);
      expect(gray2).toBe(gray3);
    });
  });

  describe("Output Format", () => {
    it("should return 7-character hex string with #", () => {
      const result = hslToHex(0, 100, 50);
      expect(result).toHaveLength(7);
      expect(result[0]).toBe("#");
    });

    it("should return lowercase hex", () => {
      const result = hslToHex(210, 50, 50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("Roundtrip Conversion", () => {
    it("should roundtrip hex -> hsl -> hex for primary colors", () => {
      const colors = ["#ff0000", "#00ff00", "#0000ff"];
      colors.forEach((hex) => {
        const hsl = hexToHsl(hex);
        const result = hslToHex(hsl.h, hsl.s, hsl.l);
        expect(result.toLowerCase()).toBe(hex.toLowerCase());
      });
    });

    it("should roundtrip with acceptable precision for complex colors", () => {
      const hex = "#dc2626";
      const hsl = hexToHsl(hex);
      const result = hslToHex(hsl.h, hsl.s, hsl.l);
      // Allow small differences due to floating point
      expect(result.toLowerCase()).toBe(hex.toLowerCase());
    });
  });
});

// =============================================================================
// TIER COLOR GENERATION TESTS
// =============================================================================

describe("generateTierColors", () => {
  describe("Structure", () => {
    it("should return an object with tier1, tier2, tier3, and trunk", () => {
      const result = generateTierColors("#ff0000");
      expect(result).toHaveProperty("tier1");
      expect(result).toHaveProperty("tier2");
      expect(result).toHaveProperty("tier3");
      expect(result).toHaveProperty("trunk");
    });

    it("should return dark/light pairs for each tier", () => {
      const result = generateTierColors("#ff0000");
      expect(result.tier1).toHaveProperty("dark");
      expect(result.tier1).toHaveProperty("light");
      expect(result.tier2).toHaveProperty("dark");
      expect(result.tier2).toHaveProperty("light");
      expect(result.tier3).toHaveProperty("dark");
      expect(result.tier3).toHaveProperty("light");
      expect(result.trunk).toHaveProperty("dark");
      expect(result.trunk).toHaveProperty("light");
    });

    it("should return valid hex colors", () => {
      const result = generateTierColors("#dc2626");
      const hexPattern = /^#[0-9a-f]{6}$/i;

      expect(result.tier1.dark).toMatch(hexPattern);
      expect(result.tier1.light).toMatch(hexPattern);
      expect(result.tier2.dark).toMatch(hexPattern);
      expect(result.tier2.light).toMatch(hexPattern);
      expect(result.tier3.dark).toMatch(hexPattern);
      expect(result.tier3.light).toMatch(hexPattern);
    });
  });

  describe("Tier Hierarchy", () => {
    it("should make tier1 (top) the lightest", () => {
      const result = generateTierColors("#dc2626");
      const tier1Light = hexToHsl(result.tier1.light).l;
      const tier2Light = hexToHsl(result.tier2.light).l;
      const tier3Light = hexToHsl(result.tier3.light).l;

      expect(tier1Light).toBeGreaterThanOrEqual(tier2Light);
    });

    it("should make tier3 (bottom) the darkest", () => {
      const result = generateTierColors("#dc2626");
      const tier1Dark = hexToHsl(result.tier1.dark).l;
      const tier3Dark = hexToHsl(result.tier3.dark).l;

      expect(tier3Dark).toBeLessThanOrEqual(tier1Dark);
    });

    it("should create visual depth with light/dark contrast", () => {
      const result = generateTierColors("#15803d");

      // Each tier should have light side brighter than dark side
      const tier1DarkL = hexToHsl(result.tier1.dark).l;
      const tier1LightL = hexToHsl(result.tier1.light).l;

      expect(tier1LightL).toBeGreaterThan(tier1DarkL);
    });
  });

  describe("Trunk Colors", () => {
    it("should use consistent brown trunk colors", () => {
      const result1 = generateTierColors("#dc2626");
      const result2 = generateTierColors("#15803d");
      const result3 = generateTierColors("#4c1d95");

      // Trunk should be the same regardless of base color
      expect(result1.trunk).toEqual(result2.trunk);
      expect(result2.trunk).toEqual(result3.trunk);
    });

    it("should use warm brown tones for trunk", () => {
      const result = generateTierColors("#dc2626");
      const trunkHsl = hexToHsl(result.trunk.dark);

      // Brown hue is roughly 20-40
      expect(trunkHsl.h).toBeGreaterThan(15);
      expect(trunkHsl.h).toBeLessThan(45);
    });
  });

  describe("Hue Preservation", () => {
    it("should preserve the base hue in generated tiers", () => {
      const baseColor = "#dc2626"; // Red
      const baseHsl = hexToHsl(baseColor);
      const result = generateTierColors(baseColor);

      const tier1Hsl = hexToHsl(result.tier1.dark);
      const tier2Hsl = hexToHsl(result.tier2.dark);
      const tier3Hsl = hexToHsl(result.tier3.dark);

      // All tiers should have the same hue (within tolerance)
      expect(tier1Hsl.h).toBeCloseTo(baseHsl.h, 0);
      expect(tier2Hsl.h).toBeCloseTo(baseHsl.h, 0);
      expect(tier3Hsl.h).toBeCloseTo(baseHsl.h, 0);
    });
  });

  describe("Grove Seasonal Colors", () => {
    it("should generate appropriate tiers for autumn red", () => {
      const result = generateTierColors("#DC2626");
      // Should produce warm red variations
      expect(result.tier1.light).not.toBe(result.tier3.dark);
    });

    it("should generate appropriate tiers for summer green", () => {
      const result = generateTierColors("#15803d");
      const tier1Hsl = hexToHsl(result.tier1.dark);
      expect(tier1Hsl.h).toBeGreaterThan(100); // Green hue
    });

    it("should generate appropriate tiers for midnight purple", () => {
      const result = generateTierColors("#4c1d95");
      const tier1Hsl = hexToHsl(result.tier1.dark);
      expect(tier1Hsl.h).toBeGreaterThan(250); // Purple hue
    });
  });
});

// =============================================================================
// LIGHTNESS ADJUSTMENT TESTS
// =============================================================================

describe("adjustLightness", () => {
  it("should increase lightness with positive amount", () => {
    const result = adjustLightness("#808080", 20); // Mid gray + 20
    const resultHsl = hexToHsl(result);
    expect(resultHsl.l).toBeCloseTo(70, 0);
  });

  it("should decrease lightness with negative amount", () => {
    const result = adjustLightness("#808080", -20); // Mid gray - 20
    const resultHsl = hexToHsl(result);
    expect(resultHsl.l).toBeCloseTo(30, 0);
  });

  it("should clamp to 100 (white) when exceeding max", () => {
    const result = adjustLightness("#cccccc", 50); // Light gray + 50
    const resultHsl = hexToHsl(result);
    expect(resultHsl.l).toBeLessThanOrEqual(100);
  });

  it("should clamp to 0 (black) when below min", () => {
    const result = adjustLightness("#333333", -50); // Dark gray - 50
    const resultHsl = hexToHsl(result);
    expect(resultHsl.l).toBeGreaterThanOrEqual(0);
  });

  it("should preserve hue and saturation", () => {
    const original = "#dc2626";
    const originalHsl = hexToHsl(original);
    const result = adjustLightness(original, 10);
    const resultHsl = hexToHsl(result);

    expect(resultHsl.h).toBeCloseTo(originalHsl.h, 0);
    expect(resultHsl.s).toBeCloseTo(originalHsl.s, 0);
  });
});

// =============================================================================
// SATURATION ADJUSTMENT TESTS
// =============================================================================

describe("adjustSaturation", () => {
  it("should increase saturation with positive amount", () => {
    const result = adjustSaturation("#996666", 20); // Desaturated red + 20
    const resultHsl = hexToHsl(result);
    const originalHsl = hexToHsl("#996666");
    expect(resultHsl.s).toBeGreaterThan(originalHsl.s);
  });

  it("should decrease saturation with negative amount", () => {
    const result = adjustSaturation("#ff0000", -30); // Pure red - 30
    const resultHsl = hexToHsl(result);
    expect(resultHsl.s).toBeLessThan(100);
  });

  it("should clamp to 100 when exceeding max", () => {
    const result = adjustSaturation("#ff0000", 50); // Already 100%
    const resultHsl = hexToHsl(result);
    expect(resultHsl.s).toBeLessThanOrEqual(100);
  });

  it("should clamp to 0 when below min", () => {
    const result = adjustSaturation("#666666", -50); // Gray - 50
    const resultHsl = hexToHsl(result);
    expect(resultHsl.s).toBeGreaterThanOrEqual(0);
  });

  it("should preserve hue and lightness", () => {
    const original = "#dc2626";
    const originalHsl = hexToHsl(original);
    const result = adjustSaturation(original, -10);
    const resultHsl = hexToHsl(result);

    expect(resultHsl.h).toBeCloseTo(originalHsl.h, 0);
    expect(resultHsl.l).toBeCloseTo(originalHsl.l, 0);
  });
});

// =============================================================================
// TYPE EXPORTS TESTS
// =============================================================================

describe("Type Exports", () => {
  it("should export HSLColor type with correct shape", () => {
    const hsl: HSLColor = { h: 0, s: 100, l: 50 };
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it("should export TierColors type with correct shape", () => {
    const tier: TierColors = { dark: "#000000", light: "#ffffff" };
    expect(tier.dark).toBe("#000000");
    expect(tier.light).toBe("#ffffff");
  });

  it("should export LogoTierColors type with correct shape", () => {
    const colors: LogoTierColors = {
      tier1: { dark: "#000", light: "#fff" },
      tier2: { dark: "#000", light: "#fff" },
      tier3: { dark: "#000", light: "#fff" },
      trunk: { dark: "#000", light: "#fff" },
    };
    expect(colors.tier1).toBeDefined();
    expect(colors.tier2).toBeDefined();
    expect(colors.tier3).toBeDefined();
    expect(colors.trunk).toBeDefined();
  });
});
