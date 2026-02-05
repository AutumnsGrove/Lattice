/**
 * Markdown-it GroveTerm Plugin
 *
 * Transforms [[term]] and [[term|display]] syntax in markdown content
 * into HTML spans with data attributes for tooltip functionality.
 *
 * Unlike the rehype plugin (for unified pipelines), this works directly
 * with markdown-it and outputs plain HTML that works with @html rendering.
 *
 * Output format:
 *   [[bloom]] → <abbr class="grove-term" title="Your Writing — A bloom is...">Bloom</abbr>
 *   [[wanderer|visitors]] → <abbr class="grove-term" title="...">visitors</abbr>
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Type for manifest entries
interface GroveTermEntry {
  slug: string;
  term: string;
  category: string;
  tagline?: string;
  definition?: string;
  usageExample?: string;
  seeAlso?: string[];
}

type GroveTermManifest = Record<string, GroveTermEntry>;

// Load manifest at module initialization (runs at build time)
// Path from packages/landing to packages/engine
const manifestPath = resolve(
  process.cwd(),
  "..",
  "engine",
  "src",
  "lib",
  "data",
  "grove-term-manifest.json",
);

let manifest: GroveTermManifest;
try {
  const manifestContent = readFileSync(manifestPath, "utf-8");
  manifest = JSON.parse(manifestContent) as GroveTermManifest;
} catch (error) {
  console.warn(
    `[GroveTerm] Could not load manifest from ${manifestPath}:`,
    error,
  );
  manifest = {};
}

/**
 * Regex pattern for GroveTerm syntax.
 * Matches: [[term]] or [[term|display text]]
 */
const GROVETERM_PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(?:\|([^\]]*))?\]\]/g;

/**
 * Normalize a term slug to lowercase for manifest lookup.
 */
function normalizeSlug(term: string): string {
  return term.toLowerCase().trim();
}

/**
 * Capitalize the first letter of a term for display.
 */
function capitalizeFirst(term: string): string {
  if (!term) return term;
  return term.charAt(0).toUpperCase() + term.slice(1);
}

/**
 * Look up a term in the manifest with common variations.
 */
function findInManifest(slug: string): { found: boolean; actualSlug: string } {
  // Direct match
  if (slug in manifest) {
    return { found: true, actualSlug: slug };
  }

  // Try with "your-" prefix (grove → your-grove)
  const withYour = `your-${slug}`;
  if (withYour in manifest) {
    return { found: true, actualSlug: withYour };
  }

  // Try plural
  const plural = `${slug}s`;
  if (plural in manifest) {
    return { found: true, actualSlug: plural };
  }

  // Try singular (if ends in 's')
  if (slug.endsWith("s")) {
    const singular = slug.slice(0, -1);
    if (singular in manifest) {
      return { found: true, actualSlug: singular };
    }
  }

  return { found: false, actualSlug: slug };
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Process GroveTerm syntax in markdown content.
 *
 * This is a pre-processor that runs BEFORE markdown-it rendering.
 * It transforms [[term]] patterns into <abbr> tags with tooltips.
 *
 * @param content - Markdown content with [[term]] patterns
 * @returns Content with [[term]] replaced by <abbr> tags
 */
export function processGroveTerms(content: string): string {
  return content.replace(
    GROVETERM_PATTERN,
    (fullMatch, rawTerm: string, rawDisplay: string | undefined) => {
      // Handle empty term
      if (!rawTerm || !rawTerm.trim()) {
        return fullMatch;
      }

      const slug = normalizeSlug(rawTerm);
      const { found, actualSlug } = findInManifest(slug);

      if (!found) {
        // Unknown term: warn and return display text only
        console.warn(`[GroveTerm] Unknown term: "${slug}"`);
        const displayText =
          rawDisplay !== undefined && rawDisplay.trim() !== ""
            ? rawDisplay.trim()
            : capitalizeFirst(slug);
        return displayText;
      }

      // Get term data from manifest
      const termData = manifest[actualSlug];
      const displayText =
        rawDisplay !== undefined && rawDisplay.trim() !== ""
          ? rawDisplay.trim()
          : termData.term || capitalizeFirst(actualSlug);

      // Build tooltip content: "Tagline — Definition"
      const tooltipParts: string[] = [];
      if (termData.tagline) {
        tooltipParts.push(termData.tagline);
      }
      if (termData.definition) {
        // Truncate long definitions for tooltip
        const shortDef =
          termData.definition.length > 150
            ? termData.definition.substring(0, 147) + "..."
            : termData.definition;
        tooltipParts.push(shortDef);
      }
      const tooltip = tooltipParts.join(" — ");

      // Build the abbr tag
      const escapedDisplay = escapeHtml(displayText);
      const escapedTooltip = escapeHtml(tooltip);
      const escapedSlug = escapeHtml(actualSlug);

      return `<abbr class="grove-term" data-term="${escapedSlug}" title="${escapedTooltip}">${escapedDisplay}</abbr>`;
    },
  );
}

export default processGroveTerms;
