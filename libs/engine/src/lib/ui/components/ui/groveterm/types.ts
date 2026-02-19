/**
 * GroveTerm Types
 *
 * Types for the GroveTerm component that displays interactive Grove terminology
 * with definitions in a popup, styled with category-specific colors.
 */

/**
 * Category for Grove terminology.
 * Each category has its own color scheme for visual distinction.
 */
export type GroveTermCategory =
  | "foundational" // grove, garden, bloom, wanderer, rooted, pathfinder, wayfinder
  | "platform" // heartwood, arbor, plant, amber, foliage, etc.
  | "content" // wisp, reeds, meadow, forests, etc.
  | "tools" // ivy, verge, forage, trove, etc.
  | "operations"; // lumen, zephyr, vista, patina, etc.

/**
 * A single Grove term entry with its definition and metadata.
 */
export interface GroveTermEntry {
  /** URL-safe identifier (lowercase, hyphenated) */
  slug: string;
  /** Display name for the term */
  term: string;
  /** Category for color coding */
  category: GroveTermCategory;
  /** One-line descriptor (e.g., "Your Space", "Authentication") */
  tagline: string;
  /** Main definition text, may contain HTML */
  definition: string;
  /** Optional blockquote usage example */
  usageExample?: string;
  /** Related term slugs for "See also" links */
  seeAlso?: string[];
  /** Standard/familiar equivalent shown when Grove Mode is OFF */
  standardTerm?: string;
  /** If true, always show the Grove term regardless of mode */
  alwaysGrove?: boolean;
}

/**
 * Manifest of all Grove terms, keyed by slug.
 * Generated at build time from grove-naming.md.
 */
export type GroveTermManifest = Record<string, GroveTermEntry>;

/**
 * Client-side cache for Grove term lookups.
 * Uses a simple Map for session-level caching.
 */
export interface GroveTermCache {
  get(slug: string): GroveTermEntry | undefined;
  set(slug: string, entry: GroveTermEntry): void;
  has(slug: string): boolean;
}

/**
 * Create a new GroveTerm cache instance.
 */
export function createGroveTermCache(): GroveTermCache {
  const cache = new Map<string, GroveTermEntry>();
  return {
    get: (slug) => cache.get(slug),
    set: (slug, entry) => cache.set(slug, entry),
    has: (slug) => cache.has(slug),
  };
}

/**
 * Category color tokens for use in CSS.
 * Light mode values; dark mode values are defined in the component.
 */
/**
 * Category color tokens for badge backgrounds.
 * All colors tested for WCAG AA contrast (4.5:1) with white text.
 */
export const GROVE_TERM_COLORS: Record<
  GroveTermCategory,
  { light: string; dark: string }
> = {
  foundational: { light: "#b45309", dark: "#d97706" }, // Amber-700/600 (darker for contrast)
  platform: { light: "#15803d", dark: "#16a34a" }, // Green-700/600
  content: { light: "#7c3aed", dark: "#8b5cf6" }, // Violet-600/500
  tools: { light: "#b45309", dark: "#d97706" }, // Amber-700/600
  operations: { light: "#475569", dark: "#64748b" }, // Slate-600/500 (darker for contrast)
};

/**
 * Human-readable labels for categories.
 */
export const GROVE_TERM_CATEGORY_LABELS: Record<GroveTermCategory, string> = {
  foundational: "Foundational",
  platform: "Platform",
  content: "Content & Community",
  tools: "Standalone Tools",
  operations: "Operations",
};
