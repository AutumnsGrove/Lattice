/**
 * Shared types for Table of Contents components
 * Used by TableOfContents, MobileTOC, and CategoryNav
 */

import type { Component } from "svelte";

// =============================================================================
// CategoryNav Types
// =============================================================================

/**
 * A navigation section for CategoryNav (e.g., a help section, spec category, or exhibit wing)
 */
export interface CategoryNavSection {
  /** Unique identifier for this section */
  id: string;
  /** Display name shown in tooltips and mobile menu */
  name: string;
  /** Icon component to render (validated at runtime via isValidIcon) */
  icon?: IconComponent;
  /** Number of items in this section (shown as badge; if items prop used, derived automatically) */
  itemCount?: number;
}

/**
 * An individual item within a section (shown on hover in desktop view)
 */
export interface CategoryNavItem {
  /** Unique identifier for the item (often a slug) */
  id: string;
  /** Display title (truncated for chip display) */
  title: string;
  /** Icon component for the item chip */
  icon?: IconComponent;
  /** Description shown as tooltip on hover */
  description?: string;
}

// =============================================================================
// TOC Types
// =============================================================================

/**
 * Flexible icon type that accepts any Svelte component or lucide-svelte icon.
 * Uses `unknown` to avoid strict type checking issues with different icon libraries.
 * Runtime validation is handled by `isValidIcon()`.
 */
 
export type IconComponent =
  | Component<{ class?: string }>
  | (new (...args: any[]) => any)
  | unknown;

/**
 * Header item for the table of contents
 */
export interface TOCHeader {
  /** Unique ID matching the section's id attribute */
  id: string;
  /** Display text for the TOC item */
  text: string;
  /** Header level (1-6) for indentation. Defaults to 2 if not provided */
  level?: number;
  /** Optional Svelte component to render as an icon. Validated at runtime via isValidIcon() */
  icon?: IconComponent;
}

/**
 * Default scroll offset in pixels to account for sticky headers.
 * Used by both TableOfContents (sidebar) and MobileTOC (floating menu)
 * to ensure consistent scroll behavior across all TOC entry points.
 *
 * This value accounts for:
 * - Grove header height (~64px)
 * - Additional breathing room (~16px)
 */
export const DEFAULT_SCROLL_OFFSET = 80;

/**
 * Type guard to validate that an icon is a renderable Svelte component.
 *
 * This is a runtime check that verifies the icon prop is either:
 * - A function (Svelte component constructor)
 * - A non-null object (compiled Svelte component)
 *
 * Note: This is a permissive check. For stricter validation, you could
 * check for specific Svelte component properties, but this adds coupling
 * to Svelte's internal implementation details.
 */
export function isValidIcon(
  icon: unknown,
): icon is Component<{ class?: string }> {
  if (icon === null || icon === undefined) return false;
  // Svelte components are either functions or objects with render capabilities
  // We can't easily check for 'render' without coupling to Svelte internals
  return (
    typeof icon === "function" ||
    (typeof icon === "object" && Object.keys(icon).length > 0)
  );
}
