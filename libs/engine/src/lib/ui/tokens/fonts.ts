/**
 * Grove Design System - Font Tokens
 *
 * Complete font catalog with metadata, CDN URLs, and helper utilities.
 * All fonts are served from cdn.grove.place for optimal performance.
 */

/** CDN base URL for all font assets */
export const FONT_CDN_BASE = "https://cdn.grove.place/fonts";

/** Font category for organizing fonts */
export type FontCategory =
  | "default"
  | "accessibility"
  | "sans-serif"
  | "monospace"
  | "display";

/** Font format for @font-face src declarations */
export type FontFormat = "truetype" | "opentype";

/** Complete font definition with metadata */
export interface FontDefinition {
  /** Unique identifier used in database and fontMap */
  id: string;
  /** Display name shown to users */
  name: string;
  /** Font file name on CDN */
  file: string;
  /** Font format (truetype or opentype) */
  format: FontFormat;
  /** CSS font-family name (may include spaces) */
  fontFamily: string;
  /** Category for organizing fonts */
  category: FontCategory;
  /** Brief description of the font's purpose/style */
  description: string;
  /** CSS fallback stack */
  fallback: string[];
}

/**
 * Complete catalog of available fonts
 * These fonts are served from cdn.grove.place
 */
export const fonts: readonly FontDefinition[] = [
  // Default
  {
    id: "lexend",
    name: "Lexend",
    file: "Lexend-Regular.ttf",
    format: "truetype",
    fontFamily: "Lexend",
    category: "default",
    description: "Modern, highly readable sans-serif. Grove default.",
    fallback: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
  },

  // Accessibility fonts
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    file: "AtkinsonHyperlegible-Regular.ttf",
    format: "truetype",
    fontFamily: "Atkinson Hyperlegible",
    category: "accessibility",
    description:
      "Designed for low vision readers. Maximum character distinction.",
    fallback: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
  },
  {
    id: "opendyslexic",
    name: "OpenDyslexic",
    file: "OpenDyslexic-Regular.otf",
    format: "opentype",
    fontFamily: "OpenDyslexic",
    category: "accessibility",
    description:
      "Weighted bottoms reduce letter confusion for dyslexic readers.",
    fallback: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
  },

  // Modern sans-serif fonts
  {
    id: "quicksand",
    name: "Quicksand",
    file: "Quicksand-Regular.ttf",
    format: "truetype",
    fontFamily: "Quicksand",
    category: "sans-serif",
    description: "Geometric sans with rounded terminals. Light and modern.",
    fallback: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    file: "PlusJakartaSans-Regular.ttf",
    format: "truetype",
    fontFamily: "Plus Jakarta Sans",
    category: "sans-serif",
    description: "Contemporary geometric sans. Balanced and versatile.",
    fallback: [
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
  },

  // Monospace fonts
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    file: "IBMPlexMono-Regular.ttf",
    format: "truetype",
    fontFamily: "IBM Plex Mono",
    category: "monospace",
    description: "Corporate monospace with human warmth. Great for code.",
    fallback: ["Courier New", "Consolas", "monospace"],
  },
  {
    id: "cozette",
    name: "Cozette",
    file: "CozetteVector.ttf",
    format: "truetype",
    fontFamily: "Cozette",
    category: "monospace",
    description: "Bitmap-style vector font. Retro terminal aesthetic.",
    fallback: ["Courier New", "Consolas", "monospace"],
  },

  // Display/special fonts
  {
    id: "alagard",
    name: "Alagard",
    file: "alagard.ttf",
    format: "truetype",
    fontFamily: "Alagard",
    category: "display",
    description: "Pixel art medieval display font. Fantasy and gaming.",
    fallback: ["fantasy", "cursive"],
  },
  {
    id: "calistoga",
    name: "Calistoga",
    file: "Calistoga-Regular.ttf",
    format: "truetype",
    fontFamily: "Calistoga",
    category: "display",
    description: "Casual brush serif. Friendly headlines.",
    fallback: ["Georgia", "serif"],
  },
  {
    id: "caveat",
    name: "Caveat",
    file: "Caveat-Regular.ttf",
    format: "truetype",
    fontFamily: "Caveat",
    category: "display",
    description: "Handwritten script. Personal and informal.",
    fallback: ["cursive", "sans-serif"],
  },
] as const;

/** All valid font IDs */
export type FontId = (typeof fonts)[number]["id"];

/** Map of font IDs to their definitions */
export const fontById: Record<FontId, FontDefinition> = Object.fromEntries(
  fonts.map((font) => [font.id, font]),
) as Record<FontId, FontDefinition>;

/** Get fonts by category */
export function getFontsByCategory(category: FontCategory): FontDefinition[] {
  return fonts.filter((font) => font.category === category);
}

/** Get CDN URL for a font */
export function getFontUrl(fontIdOrFile: string): string {
  // If it's a font ID, look up the file
  const font = fonts.find((f) => f.id === fontIdOrFile);
  const file = font ? font.file : fontIdOrFile;
  return `${FONT_CDN_BASE}/${file}`;
}

/** Get complete CSS font-family value with fallbacks */
export function getFontStack(fontId: FontId): string {
  const font = fontById[fontId];
  if (!font) return fontById.lexend.fallback.join(", ");

  const primary = font.fontFamily.includes(" ")
    ? `'${font.fontFamily}'`
    : font.fontFamily;

  return [primary, ...font.fallback].join(", ");
}

/**
 * Generate @font-face CSS for a single font
 * @param fontId - Font ID to generate CSS for
 * @returns CSS @font-face declaration string
 */
export function generateFontFace(fontId: FontId): string {
  const font = fontById[fontId];
  if (!font) return "";

  return `@font-face {
  font-family: '${font.fontFamily}';
  src: url('${getFontUrl(font.file)}') format('${font.format}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;
}

/**
 * Generate @font-face CSS for multiple fonts
 * @param fontIds - Array of font IDs (defaults to all fonts)
 * @returns CSS string with all @font-face declarations
 */
export function generateAllFontFaces(fontIds?: FontId[]): string {
  const ids = fontIds ?? fonts.map((f) => f.id as FontId);
  return ids.map(generateFontFace).filter(Boolean).join("\n\n");
}

/**
 * Font map matching the format used in +layout.svelte
 * Maps font IDs to their complete CSS font-family values
 */
export const fontMap: Record<FontId, string> = Object.fromEntries(
  fonts.map((font) => [font.id, getFontStack(font.id as FontId)]),
) as Record<FontId, string>;

/** Default font ID */
export const DEFAULT_FONT: FontId = "lexend";

/** Total number of available fonts */
export const FONT_COUNT = fonts.length;

/** Font categories with human-readable labels */
export const fontCategoryLabels: Record<FontCategory, string> = {
  default: "Default",
  accessibility: "Accessibility",
  "sans-serif": "Sans-Serif",
  monospace: "Monospace",
  display: "Display & Special",
};

/**
 * Array of valid font IDs for API validation
 * Use this in server-side validation to ensure only valid fonts are accepted
 */
export const validFontIds: readonly string[] = fonts.map((f) => f.id);

/**
 * Font preset format for settings UI
 * Compatible with the FONT_PRESETS format used in presets.ts
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
  category: FontCategory;
}

/**
 * Font presets for settings UI
 * Derived from the canonical fonts array - use this instead of maintaining a separate list
 */
export const fontPresets: readonly FontPreset[] = fonts.map((f) => ({
  id: f.id,
  name: f.name,
  family: getFontStack(f.id as FontId),
  description: f.description,
  category: f.category,
}));
