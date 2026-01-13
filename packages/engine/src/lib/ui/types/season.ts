/**
 * Season Types & Configuration
 *
 * Grove's seasonal theming system with 5 seasons:
 * - spring, summer, autumn, winter (regular cycle)
 * - midnight (special easter egg season)
 *
 * The header logo cycles through the 4 regular seasons.
 * Midnight is activated via the season indicator in the footer.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** All supported seasons including the midnight easter egg */
export type Season = "spring" | "summer" | "autumn" | "winter" | "midnight";

/** The four regular seasons (midnight is special) */
export type RegularSeason = "spring" | "summer" | "autumn" | "winter";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Regular season cycle order (midnight is not in this cycle) */
export const REGULAR_SEASONS: readonly RegularSeason[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
] as const;

/** All seasons including midnight */
export const ALL_SEASONS: readonly Season[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "midnight",
] as const;

/** Default season for first-time visitors */
export const DEFAULT_SEASON: RegularSeason = "autumn";

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY LABELS
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable labels for each season */
export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  midnight: "Midnight",
} as const;

/** Short labels for compact displays */
export const SEASON_LABELS_SHORT: Record<Season, string> = {
  spring: "Spr",
  summer: "Sum",
  autumn: "Aut",
  winter: "Win",
  midnight: "Mid",
} as const;

/** Emoji icons for each season */
export const SEASON_ICONS: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
  midnight: "🌙",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Check if a season is a regular season (not midnight) */
export function isRegularSeason(season: Season): season is RegularSeason {
  return season !== "midnight";
}

/** Check if a season is the midnight easter egg */
export function isMidnightSeason(season: Season): boolean {
  return season === "midnight";
}

/** Get the next season in the regular cycle */
export function getNextRegularSeason(current: Season): RegularSeason {
  if (current === "midnight") {
    // If in midnight, return to the default
    return DEFAULT_SEASON;
  }
  const currentIndex = REGULAR_SEASONS.indexOf(current as RegularSeason);
  const nextIndex = (currentIndex + 1) % REGULAR_SEASONS.length;
  return REGULAR_SEASONS[nextIndex];
}

/** Validate if a string is a valid season */
export function isValidSeason(value: string): value is Season {
  return ALL_SEASONS.includes(value as Season);
}

/** Validate if a string is a valid regular season */
export function isValidRegularSeason(value: string): value is RegularSeason {
  return REGULAR_SEASONS.includes(value as RegularSeason);
}
