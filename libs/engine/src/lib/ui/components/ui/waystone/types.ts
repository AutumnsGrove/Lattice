/**
 * Waystone Excerpt Types
 *
 * Types for the Waystone popup system that displays in-context help
 * without navigating away from the current page.
 */

/**
 * Excerpt data for a Waystone popup.
 * This is the minimal data needed to render a help popup.
 */
export interface WaystoneExcerpt {
  /** URL-safe identifier matching the KB article slug */
  slug: string;
  /** Article title from frontmatter */
  title: string;
  /** One-sentence description from frontmatter */
  description: string;
  /** First section content (intro to first ## heading), rendered as HTML */
  firstSection: string;
  /** Estimated reading time for the full article (minutes) */
  readingTime: number;
  /** Whether the excerpt contains images */
  hasMedia: boolean;
}

/**
 * Manifest of all Waystone excerpts, keyed by slug.
 * Generated at build time and imported statically.
 */
export type WaystoneManifest = Record<string, WaystoneExcerpt>;

/**
 * Client-side cache for Waystone excerpts.
 * Uses a simple Map for session-level caching.
 */
export interface WaystoneCache {
  get(slug: string): WaystoneExcerpt | undefined;
  set(slug: string, excerpt: WaystoneExcerpt): void;
  has(slug: string): boolean;
}

/**
 * Create a new Waystone cache instance.
 */
export function createWaystoneCache(): WaystoneCache {
  const cache = new Map<string, WaystoneExcerpt>();

  return {
    get: (slug) => cache.get(slug),
    set: (slug, excerpt) => cache.set(slug, excerpt),
    has: (slug) => cache.has(slug),
  };
}
