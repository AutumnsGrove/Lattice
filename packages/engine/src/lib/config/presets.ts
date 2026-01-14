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
 * Font presets with display info
 */
export interface FontPreset {
  /** Internal ID used in database */
  id: string;
  /** Display name */
  name: string;
  /** CSS font-family stack */
  family: string;
  /** Description for settings UI */
  description: string;
  /** Category for grouping */
  category: "accessibility" | "sans-serif" | "monospace" | "display";
}

export const FONT_PRESETS: FontPreset[] = [
  // Accessibility fonts
  {
    id: "lexend",
    name: "Lexend",
    family:
      "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Modern accessibility font for reading fluency (default)",
    category: "accessibility",
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    family:
      "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Accessibility font for low vision readers",
    category: "accessibility",
  },
  {
    id: "opendyslexic",
    name: "OpenDyslexic",
    family:
      "'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Accessibility font for dyslexia",
    category: "accessibility",
  },

  // Sans-serif
  {
    id: "quicksand",
    name: "Quicksand",
    family:
      "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Rounded, friendly geometric sans-serif",
    category: "sans-serif",
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    family:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    description: "Contemporary geometric sans, balanced and versatile",
    category: "sans-serif",
  },

  // Monospace
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    family: "'IBM Plex Mono', 'Courier New', Consolas, monospace",
    description: "Clean, highly readable code font",
    category: "monospace",
  },
  {
    id: "cozette",
    name: "Cozette",
    family: "'Cozette', 'Courier New', Consolas, monospace",
    description: "Bitmap-style programming font, retro aesthetic",
    category: "monospace",
  },

  // Display/Special
  {
    id: "alagard",
    name: "Alagard",
    family: "'Alagard', fantasy, cursive",
    description: "Medieval pixel font for fantasy vibes",
    category: "display",
  },
  {
    id: "calistoga",
    name: "Calistoga",
    family: "'Calistoga', Georgia, serif",
    description: "Casual brush serif, warm and friendly",
    category: "display",
  },
  {
    id: "caveat",
    name: "Caveat",
    family: "'Caveat', cursive, sans-serif",
    description: "Handwritten script, personal and informal",
    category: "display",
  },
];

export const DEFAULT_FONT = "lexend";

/**
 * Get font family by ID
 */
export function getFontFamily(id: string): string {
  const font = FONT_PRESETS.find((f) => f.id === id);
  return font?.family ?? FONT_PRESETS[0].family;
}
