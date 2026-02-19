/**
 * Rehype GroveTerm Plugin
 *
 * Transforms [[term]] and [[term|display]] syntax in markdown content
 * into interactive GroveTerm component markup.
 *
 * Uses remark for parsing, then rehype for HTML output to properly handle
 * inline HTML nodes within paragraphs.
 *
 * Syntax:
 *   [[bloom]]                    → <GroveTerm term="bloom">Bloom</GroveTerm>
 *   [[wanderer|visitors]]        → <GroveTerm term="wanderer">visitors</GroveTerm>
 *   [[bloom|my latest writings]] → <GroveTerm term="bloom">my latest writings</GroveTerm>
 *
 * Unknown terms gracefully fall back to plain text with a build-time warning.
 *
 * @module rehype-groveterm
 */

import { visit, SKIP } from "unist-util-visit";
import type { Root, Text, Html, Parent, RootContent } from "mdast";
import type { Plugin } from "unified";
import type { GroveTermManifest } from "$lib/ui/components/ui/groveterm/types";

// Import manifest for validation
import manifestData from "$lib/data/grove-term-manifest.json";

const manifest = manifestData as GroveTermManifest;

/** Node types that can be inserted into the AST */
type ReplacementNode = Text | Html;

/**
 * Regex pattern for GroveTerm syntax.
 *
 * Matches: [[term]] or [[term|display text]]
 * - Term: starts with letter, then letters/numbers/hyphens (slug format)
 * - Optional pipe and display text (any characters except closing brackets)
 */
const GROVETERM_PATTERN = /\[\[([a-zA-Z][a-zA-Z0-9-]*)(?:\|([^\]]*))?\]\]/g;

/**
 * Options for the rehypeGroveTerm plugin.
 */
export interface RehypeGroveTermOptions {
  /** Custom manifest for testing (defaults to built-in manifest) */
  manifest?: GroveTermManifest;
  /** Whether to log warnings for unknown terms (default: true) */
  warnOnUnknown?: boolean;
}

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
 *
 * Tries:
 * 1. Direct slug match
 * 2. With "your-" prefix (for grove → your-grove)
 * 3. Plural form
 * 4. Singular form (if ends in 's')
 */
function findInManifest(
  slug: string,
  m: GroveTermManifest,
): { found: boolean; actualSlug: string } {
  // Direct match
  if (slug in m) {
    return { found: true, actualSlug: slug };
  }

  // Try with "your-" prefix (grove → your-grove)
  const withYour = `your-${slug}`;
  if (withYour in m) {
    return { found: true, actualSlug: withYour };
  }

  // Try plural
  const plural = `${slug}s`;
  if (plural in m) {
    return { found: true, actualSlug: plural };
  }

  // Try singular (if ends in 's')
  if (slug.endsWith("s")) {
    const singular = slug.slice(0, -1);
    if (singular in m) {
      return { found: true, actualSlug: singular };
    }
  }

  return { found: false, actualSlug: slug };
}

/**
 * Escape HTML special characters to prevent XSS.
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
 * Process a text node and split it into text and HTML nodes.
 *
 * Returns an array of nodes where [[term]] patterns are replaced
 * with HTML nodes containing GroveTerm markup.
 */
function processTextNode(
  text: string,
  options: RehypeGroveTermOptions,
): Array<Text | Html> {
  const m = options.manifest || manifest;
  const warnOnUnknown = options.warnOnUnknown ?? true;
  const nodes: Array<Text | Html> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  GROVETERM_PATTERN.lastIndex = 0;

  while ((match = GROVETERM_PATTERN.exec(text)) !== null) {
    const [fullMatch, rawTerm, rawDisplay] = match;
    const matchStart = match.index;

    // Add text before the match
    if (matchStart > lastIndex) {
      nodes.push({
        type: "text",
        value: text.slice(lastIndex, matchStart),
      });
    }

    // Handle empty term - keep as-is
    if (!rawTerm || !rawTerm.trim()) {
      nodes.push({
        type: "text",
        value: fullMatch,
      });
      lastIndex = matchStart + fullMatch.length;
      continue;
    }

    const slug = normalizeSlug(rawTerm);

    // Handle display text (use term name if empty)
    const displayText =
      rawDisplay !== undefined && rawDisplay.trim() !== ""
        ? rawDisplay.trim()
        : capitalizeFirst(slug);

    // Look up in manifest
    const { found, actualSlug } = findInManifest(slug, m);

    if (!found) {
      // Unknown term: warn and render as plain text
      if (warnOnUnknown) {
        console.warn(`[GroveTerm] Unknown term: "${slug}"`);
      }
      nodes.push({
        type: "text",
        value: displayText,
      });
    } else {
      // Known term: render as GroveTerm HTML
      const escapedSlug = escapeHtml(actualSlug);
      const escapedDisplay = escapeHtml(displayText);

      nodes.push({
        type: "html",
        value: `<GroveTerm term="${escapedSlug}">${escapedDisplay}</GroveTerm>`,
      });
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    nodes.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return nodes;
}

/**
 * Rehype-compatible GroveTerm plugin for unified pipelines.
 *
 * Transforms [[term]] and [[term|display]] patterns in text nodes
 * into HTML nodes containing GroveTerm component markup.
 *
 * This is a remark plugin that should be used with rehype for proper
 * HTML output. Rehype handles inline HTML nodes correctly, unlike remark-html.
 *
 * @example
 * ```typescript
 * import { unified } from 'unified';
 * import remarkParse from 'remark-parse';
 * import remarkRehype from 'remark-rehype';
 * import rehypeRaw from 'rehype-raw';
 * import rehypeStringify from 'rehype-stringify';
 * import { rehypeGroveTerm } from '@autumnsgrove/lattice/utils';
 *
 * const result = await unified()
 *   .use(remarkParse)
 *   .use(rehypeGroveTerm)
 *   .use(remarkRehype, { allowDangerousHtml: true })
 *   .use(rehypeRaw)
 *   .use(rehypeStringify)
 *   .process('Welcome [[wanderer|traveler]]!');
 *
 * // Result: <p>Welcome <groveterm term="wanderer">traveler</groveterm>!</p>
 * ```
 *
 * @example With mdsvex
 * ```javascript
 * // svelte.config.js
 * import { rehypeGroveTerm } from '@autumnsgrove/lattice/utils';
 *
 * const mdsvexConfig = {
 *   remarkPlugins: [rehypeGroveTerm],
 * };
 * ```
 */
export const rehypeGroveTerm: Plugin<[RehypeGroveTermOptions?], Root> =
  function (options: RehypeGroveTermOptions = {}) {
    return (tree: Root) => {
      // Collect replacements first, then apply them
      // This avoids issues with modifying the tree during traversal
      const replacements: Array<{
        parent: Parent;
        index: number;
        newNodes: ReplacementNode[];
      }> = [];

      visit(tree, "text", (node: Text, index, parent) => {
        // Skip if no parent or index (parent can be null or undefined)
        if (!parent || index === null || index === undefined) return;

        // Skip if no GroveTerm patterns in this text
        if (!node.value.includes("[[")) return;

        // Process the text node
        const newNodes = processTextNode(node.value, options);

        // If unchanged, skip
        if (
          newNodes.length === 1 &&
          newNodes[0].type === "text" &&
          (newNodes[0] as Text).value === node.value
        ) {
          return;
        }

        // Queue the replacement
        replacements.push({ parent, index, newNodes });

        // Skip this node (we'll replace it later)
        return SKIP;
      });

      // Apply replacements in reverse order to preserve indices
      for (let i = replacements.length - 1; i >= 0; i--) {
        const { parent, index, newNodes } = replacements[i];
        // Cast to RootContent[] since that's what parent.children expects
        parent.children.splice(index, 1, ...(newNodes as RootContent[]));
      }
    };
  };

/**
 * Standalone function to process GroveTerm syntax in a string.
 *
 * Use this for simple string transformations without the full unified pipeline.
 * Note: This doesn't handle code blocks - use the plugin for full markdown.
 *
 * @param text - Text containing [[term]] patterns
 * @param options - Processing options
 * @returns Text with [[term]] replaced by GroveTerm HTML
 */
export function processGroveTerms(
  text: string,
  options: RehypeGroveTermOptions = {},
): string {
  const m = options.manifest || manifest;
  const warnOnUnknown = options.warnOnUnknown ?? true;

  return text.replace(
    GROVETERM_PATTERN,
    (fullMatch, rawTerm: string, rawDisplay: string | undefined) => {
      // Handle empty term
      if (!rawTerm || !rawTerm.trim()) {
        return fullMatch;
      }

      const slug = normalizeSlug(rawTerm);
      const displayText =
        rawDisplay !== undefined && rawDisplay.trim() !== ""
          ? rawDisplay.trim()
          : capitalizeFirst(slug);

      const { found, actualSlug } = findInManifest(slug, m);

      if (!found) {
        if (warnOnUnknown) {
          console.warn(`[GroveTerm] Unknown term: "${slug}"`);
        }
        return displayText;
      }

      const escapedSlug = escapeHtml(actualSlug);
      const escapedDisplay = escapeHtml(displayText);

      return `<GroveTerm term="${escapedSlug}">${escapedDisplay}</GroveTerm>`;
    },
  );
}

// Default export for convenient usage
export default rehypeGroveTerm;
