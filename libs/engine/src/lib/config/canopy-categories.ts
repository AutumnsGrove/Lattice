/**
 * Canopy — Wanderer Directory Categories
 *
 * Predefined categories for the Canopy public directory.
 * These help wanderers discover others with similar interests.
 *
 * @module canopy-categories
 */

/**
 * Predefined category options for Canopy listings
 */
export const CANOPY_CATEGORIES = [
  "writing",
  "photography",
  "art",
  "code",
  "music",
  "poetry",
  "gaming",
  "food",
  "travel",
  "science",
  "queer",
  "journal",
  "other",
] as const;

/**
 * Type for valid Canopy category values
 */
export type CanopyCategory = (typeof CANOPY_CATEGORIES)[number];

/**
 * Display labels for categories (for UI presentation)
 */
export const CANOPY_CATEGORY_LABELS: Record<CanopyCategory, string> = {
  writing: "Writing",
  photography: "Photography",
  art: "Art",
  code: "Code",
  music: "Music",
  poetry: "Poetry",
  gaming: "Gaming",
  food: "Food",
  travel: "Travel",
  science: "Science",
  queer: "Queer",
  journal: "Journal",
  other: "Other",
};

/**
 * Validate that a category is in the predefined list
 */
export function isValidCanopyCategory(
  category: string,
): category is CanopyCategory {
  return CANOPY_CATEGORIES.includes(category as CanopyCategory);
}

/**
 * Parse and validate categories from a JSON string
 * Returns only valid categories, filters out invalid ones
 */
export function parseCanopyCategories(
  categoriesJson: string | null | undefined,
): CanopyCategory[] {
  if (!categoriesJson) return [];

  try {
    const parsed = JSON.parse(categoriesJson);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (c): c is CanopyCategory =>
        typeof c === "string" && isValidCanopyCategory(c),
    );
  } catch {
    return [];
  }
}

/**
 * Canopy setting keys used in site_settings table
 */
export const CANOPY_SETTING_KEYS = {
  VISIBLE: "canopy_visible",
  BANNER: "canopy_banner",
  CATEGORIES: "canopy_categories",
  SHOW_FORESTS: "canopy_show_forests",
} as const;

/**
 * Validation schema for Canopy settings
 */
export const CANOPY_SETTINGS_SCHEMA = {
  [CANOPY_SETTING_KEYS.VISIBLE]: {
    type: "boolean" as const,
    default: "false",
  },
  [CANOPY_SETTING_KEYS.BANNER]: {
    type: "string" as const,
    maxLength: 160,
    default: "",
  },
  [CANOPY_SETTING_KEYS.CATEGORIES]: {
    type: "json" as const,
    default: "[]",
  },
  [CANOPY_SETTING_KEYS.SHOW_FORESTS]: {
    type: "boolean" as const,
    default: "true",
  },
};
