/**
 * Shared UI Presets
 *
 * Unified color and design presets used across the Grove ecosystem.
 * This ensures consistency between Plant signup and Arbor admin panel.
 */

export interface ColorPreset {
  /** Display name */
  name: string;
  /** Hex color value (e.g., "#16a34a") */
  hex: string;
  /** HSL values as string (e.g., "142 76% 36%") - used for CSS custom properties */
  hsl: string;
}

/**
 * Grove Nature Color Palette
 *
 * A curated set of colors inspired by nature, designed to feel
 * warm and organic. These appear in the signup flow and settings panel.
 */
export const COLOR_PRESETS: ColorPreset[] = [
  // Greens - The Grove
  { name: "Grove Green", hex: "#16a34a", hsl: "142 76% 36%" },
  { name: "Meadow Green", hex: "#22c55e", hsl: "142 76% 45%" },

  // Blues - Water
  { name: "Ocean Blue", hex: "#0284c7", hsl: "200 90% 40%" },

  // Purples - Twilight
  { name: "Deep Plum", hex: "#581c87", hsl: "274 79% 32%" },
  { name: "Violet Purple", hex: "#8b5cf6", hsl: "271 76% 53%" },
  { name: "Lavender", hex: "#a78bfa", hsl: "271 50% 68%" },

  // Pinks - Blossoms
  { name: "Cherry Blossom", hex: "#ec4899", hsl: "330 81% 60%" },
  { name: "Tulip Pink", hex: "#f9a8d4", hsl: "330 71% 79%" },

  // Warm - Autumn & Ember
  { name: "Sunset Ember", hex: "#c2410c", hsl: "20 86% 42%" },
  { name: "Golden Amber", hex: "#d97706", hsl: "38 92% 50%" },
  { name: "Autumn Gold", hex: "#eab308", hsl: "43 96% 56%" },

  // Red - Cardinal
  { name: "Cardinal Red", hex: "#dc2626", hsl: "0 75% 51%" },
];

/**
 * Default accent color (Grove Green)
 */
export const DEFAULT_ACCENT_COLOR = "#16a34a";

/**
 * Font presets - imported from the canonical source in fonts.ts
 * This ensures consistency across the entire application
 */
export {
  fontPresets as FONT_PRESETS,
  DEFAULT_FONT,
  fontMap,
  validFontIds,
  getFontStack as getFontFamily,
  type FontPreset,
} from "$lib/ui/tokens/fonts";
