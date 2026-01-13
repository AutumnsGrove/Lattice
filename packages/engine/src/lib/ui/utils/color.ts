/**
 * Color Utilities for Grove Design System
 *
 * HSL-based color manipulation for generating seasonal themes,
 * tier colors for the 3D logo, and other color variations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** HSL color representation */
export interface HSLColor {
  h: number; // hue (0-360)
  s: number; // saturation (0-100)
  l: number; // lightness (0-100)
}

/** Color pair for a branch tier (dark side / light side) */
export interface TierColors {
  dark: string;
  light: string;
}

/** Complete tier color set for the Logo component */
export interface LogoTierColors {
  tier1: TierColors;
  tier2: TierColors;
  tier3: TierColors;
  trunk: TierColors;
}

// ─────────────────────────────────────────────────────────────────────────────
// HSL CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a hex color to HSL values
 *
 * @param hex - Hex color string (with or without #)
 * @returns HSL values { h: 0-360, s: 0-100, l: 0-100 }
 */
export function hexToHsl(hex: string): HSLColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL values to a hex color string
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string with # prefix
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER COLOR GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tier color adjustment constants
 *
 * These values control how the 3D depth effect is generated from a base color.
 * The dark side simulates shadow (lower lightness, higher saturation for richness),
 * while the light side simulates illumination (higher lightness, lower saturation
 * to mimic light washing out color).
 */
const TIER_ADJUSTMENTS = {
  // Tier 1 (top branches): Most ethereal, catches the most light
  tier1: {
    dark: { saturation: 5, lightness: -8 }, // Slightly richer shadow
    light: { saturation: -10, lightness: 25 }, // Bright, washed-out highlight
  },
  // Tier 2 (middle branches): Moderate depth
  tier2: {
    dark: { saturation: 0, lightness: -12 }, // Deeper shadow
    light: { saturation: -5, lightness: 18 }, // Softer highlight
  },
  // Tier 3 (bottom branches): Most grounded, deepest shadows
  tier3: {
    dark: { saturation: 10, lightness: -18 }, // Rich, deep shadow
    light: { saturation: 0, lightness: 10 }, // Subtle highlight
  },
  // Lightness caps prevent pure white (95) or overly bright (90, 85) highlights
  maxLightness: { tier1: 95, tier2: 90, tier3: 85 },
} as const;

/**
 * Generate tier colors from a base color for the Logo component
 *
 * Creates light/dark variants for the 3D tree effect:
 * - tier1 (top): lighter, more ethereal
 * - tier2 (middle): base color variations
 * - tier3 (bottom): darker, more grounded
 * - trunk: warm brown tones (consistent across all base colors)
 *
 * @param baseColor - Hex color to generate tiers from
 * @returns Complete tier color set for Logo component
 */
export function generateTierColors(baseColor: string): LogoTierColors {
  const hsl = hexToHsl(baseColor);
  const adj = TIER_ADJUSTMENTS;

  // tier1 (top branches): lighter, more ethereal
  const tier1: TierColors = {
    dark: hslToHex(
      hsl.h,
      Math.min(hsl.s + adj.tier1.dark.saturation, 100),
      Math.max(hsl.l + adj.tier1.dark.lightness, 0),
    ),
    light: hslToHex(
      hsl.h,
      Math.max(hsl.s + adj.tier1.light.saturation, 0),
      Math.min(hsl.l + adj.tier1.light.lightness, adj.maxLightness.tier1),
    ),
  };

  // tier2 (middle branches): base color variations
  const tier2: TierColors = {
    dark: hslToHex(
      hsl.h,
      hsl.s + adj.tier2.dark.saturation,
      Math.max(hsl.l + adj.tier2.dark.lightness, 0),
    ),
    light: hslToHex(
      hsl.h,
      Math.max(hsl.s + adj.tier2.light.saturation, 0),
      Math.min(hsl.l + adj.tier2.light.lightness, adj.maxLightness.tier2),
    ),
  };

  // tier3 (bottom branches): darker, more grounded
  const tier3: TierColors = {
    dark: hslToHex(
      hsl.h,
      Math.min(hsl.s + adj.tier3.dark.saturation, 100),
      Math.max(hsl.l + adj.tier3.dark.lightness, 0),
    ),
    light: hslToHex(
      hsl.h,
      hsl.s + adj.tier3.light.saturation,
      Math.min(hsl.l + adj.tier3.light.lightness, adj.maxLightness.tier3),
    ),
  };

  // trunk: warm brown tones (consistent for natural look)
  const trunk: TierColors = {
    dark: "#3d2914",
    light: "#5a3f30",
  };

  return { tier1, tier2, tier3, trunk };
}

/**
 * Adjust the lightness of a hex color
 *
 * @param hex - Hex color to adjust
 * @param amount - Amount to adjust lightness (-100 to 100)
 * @returns Adjusted hex color
 */
export function adjustLightness(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  const newL = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl.h, hsl.s, newL);
}

/**
 * Adjust the saturation of a hex color
 *
 * @param hex - Hex color to adjust
 * @param amount - Amount to adjust saturation (-100 to 100)
 * @returns Adjusted hex color
 */
export function adjustSaturation(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  const newS = Math.max(0, Math.min(100, hsl.s + amount));
  return hslToHex(hsl.h, newS, hsl.l);
}
