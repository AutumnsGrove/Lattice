/**
 * Shared Gutter Utilities
 *
 * This module provides common utilities for gutter content positioning
 * and anchor resolution. Used by ContentWithGutter component and related
 * functionality across the site.
 */
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
/** Gutter item with anchor */
export interface GutterItem {
    anchor?: string;
    type?: string;
    content?: string;
    src?: string;
    [key: string]: unknown;
}
/**
 * Parse anchor string to determine anchor type and value
 * @param anchor - The anchor string from manifest
 * @returns Object with type and value properties
 */
export declare function parseAnchor(anchor: string | undefined | null): ParsedAnchor;
/**
 * Generate a unique key for an anchor (used for grouping and positioning)
 * @param anchor - The anchor string
 * @param headers - Array of header objects with id and text
 * @returns A unique key for the anchor
 */
export declare function getAnchorKey(anchor: string, headers?: Header[]): string;
/**
 * Get all unique anchors from items (preserving order)
 * @param items - Array of gutter items
 * @returns Array of unique anchor strings
 */
export declare function getUniqueAnchors(items: GutterItem[] | undefined | null): string[];
/**
 * Get display label for an anchor (used in overflow section)
 * @param anchor - The anchor string
 * @returns Human-readable label for the anchor
 */
export declare function getAnchorLabel(anchor: string): string;
/**
 * Get items that match a specific anchor
 * @param items - Array of gutter items
 * @param anchor - The anchor to match
 * @returns Items matching the anchor
 */
export declare function getItemsForAnchor(items: GutterItem[] | undefined | null, anchor: string): GutterItem[];
/**
 * Get items that don't have a valid anchor (orphan items shown at top)
 * @param items - Array of gutter items
 * @param headers - Array of header objects
 * @returns Items without valid anchors
 */
export declare function getOrphanItems(items: GutterItem[] | undefined | null, headers?: Header[]): GutterItem[];
/**
 * Find the DOM element for an anchor within a content element
 * @param anchor - The anchor string
 * @param contentEl - The content container element
 * @param headers - Array of header objects
 * @returns The DOM element or null if not found
 */
export declare function findAnchorElement(anchor: string, contentEl: HTMLElement | null, headers?: Header[]): HTMLElement | null;
