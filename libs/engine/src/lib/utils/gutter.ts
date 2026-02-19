/**
 * Shared Gutter Utilities
 *
 * This module provides common utilities for gutter content positioning
 * and anchor resolution. Used by ContentWithGutter component and related
 * functionality across the site.
 */

import type { GutterItem as MarkdownGutterItem } from "./markdown.js";

// Re-export the GutterItem type from markdown.ts for consistency
export type GutterItem = MarkdownGutterItem;

/** Anchor types supported by the gutter system */
export type AnchorType = "none" | "paragraph" | "tag" | "header";

/** Parsed anchor result */
export interface ParsedAnchor {
  type: AnchorType;
  value: string | number | null;
}

/** Header object from markdown parsing */
export interface Header {
  id: string;
  text: string;
  level?: number;
}

/**
 * Parse anchor string to determine anchor type and value
 * @param anchor - The anchor string from manifest
 * @returns Object with type and value properties
 */
export function parseAnchor(anchor: string | undefined | null): ParsedAnchor {
  if (!anchor) {
    return { type: "none", value: null };
  }

  // Check for paragraph anchor: "paragraph:N"
  const paragraphMatch = anchor.match(/^paragraph:(\d+)$/);
  if (paragraphMatch) {
    return { type: "paragraph", value: parseInt(paragraphMatch[1], 10) };
  }

  // Check for tag anchor: "anchor:tagname" (supports alphanumeric, underscores, and hyphens)
  const tagMatch = anchor.match(/^anchor:([\w-]+)$/);
  if (tagMatch) {
    return { type: "tag", value: tagMatch[1] };
  }

  // Check for header anchor: "## Header Text"
  const headerMatch = anchor.match(/^(#{1,6})\s+(.+)$/);
  if (headerMatch) {
    return { type: "header", value: anchor };
  }

  // Unknown format - treat as header for backwards compatibility
  return { type: "header", value: anchor };
}

/**
 * Generate a unique key for an anchor (used for grouping and positioning)
 * @param anchor - The anchor string
 * @param headers - Array of header objects with id and text
 * @returns A unique key for the anchor
 */
export function getAnchorKey(anchor: string, headers: Header[] = []): string {
  const parsed = parseAnchor(anchor);
  switch (parsed.type) {
    case "header": {
      const headerText = anchor.replace(/^#+\s*/, "");
      const header = headers.find((h) => h.text === headerText);
      return header ? `header:${header.id}` : `header:${anchor}`;
    }
    case "paragraph":
      return `paragraph:${parsed.value}`;
    case "tag":
      return `tag:${parsed.value}`;
    default:
      return `unknown:${anchor}`;
  }
}

/**
 * Get all unique anchors from items (preserving order)
 * @param items - Array of gutter items
 * @returns Array of unique anchor strings
 */
export function getUniqueAnchors(
  items: GutterItem[] | undefined | null,
): string[] {
  if (!items) return [];
  const seen = new Set<string>();
  const anchors: string[] = [];
  for (const item of items) {
    if (item.anchor && !seen.has(item.anchor)) {
      seen.add(item.anchor);
      anchors.push(item.anchor);
    }
  }
  return anchors;
}

/**
 * Get display label for an anchor (used in overflow section)
 * @param anchor - The anchor string
 * @returns Human-readable label for the anchor
 */
export function getAnchorLabel(anchor: string): string {
  const parsed = parseAnchor(anchor);
  switch (parsed.type) {
    case "header":
      return anchor.replace(/^#+\s*/, "");
    case "paragraph":
      return `Paragraph ${parsed.value}`;
    case "tag":
      return `Tag: ${parsed.value}`;
    default:
      return anchor;
  }
}

/**
 * Get items that match a specific anchor
 * @param items - Array of gutter items
 * @param anchor - The anchor to match
 * @returns Items matching the anchor
 */
export function getItemsForAnchor(
  items: GutterItem[] | undefined | null,
  anchor: string,
): GutterItem[] {
  if (!items) return [];
  return items.filter((item) => item.anchor === anchor);
}

/**
 * Get items that don't have a valid anchor (orphan items shown at top)
 * @param items - Array of gutter items
 * @param headers - Array of header objects
 * @returns Items without valid anchors
 */
export function getOrphanItems(
  items: GutterItem[] | undefined | null,
  headers: Header[] = [],
): GutterItem[] {
  if (!items) return [];
  return items.filter((item) => {
    if (!item.anchor) return true;
    const parsed = parseAnchor(item.anchor);
    if (parsed.type === "header") {
      const headerText = item.anchor.replace(/^#+\s*/, "");
      return !headers.find((h) => h.text === headerText);
    }
    // Paragraph and tag anchors are valid if they have values
    return parsed.type === "none";
  });
}

/**
 * Find the DOM element for an anchor within a content element
 * @param anchor - The anchor string
 * @param contentEl - The content container element
 * @param headers - Array of header objects
 * @returns The DOM element or null if not found
 */
export function findAnchorElement(
  anchor: string,
  contentEl: HTMLElement | null,
  headers: Header[] = [],
): HTMLElement | null {
  if (!contentEl) return null;

  const parsed = parseAnchor(anchor);

  switch (parsed.type) {
    case "header": {
      const headerText = anchor.replace(/^#+\s*/, "");
      const header = headers.find((h) => h.text === headerText);
      if (header) {
        return document.getElementById(header.id);
      }
      return null;
    }
    case "paragraph": {
      // Select only direct child paragraphs to avoid counting paragraphs
      // inside blockquotes, list items, etc.
      const paragraphs = contentEl.querySelectorAll(":scope > p");
      const index = (parsed.value as number) - 1; // Convert to 0-based index
      if (index >= 0 && index < paragraphs.length) {
        return paragraphs[index] as HTMLElement;
      }
      return null;
    }
    case "tag": {
      return contentEl.querySelector(`[data-anchor="${parsed.value}"]`);
    }
    default:
      return null;
  }
}
