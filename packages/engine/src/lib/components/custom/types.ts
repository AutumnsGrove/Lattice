/**
 * Shared types for Table of Contents components
 * Used by both TableOfContents and MobileTOC
 */

import type { Component } from 'svelte';

/**
 * Header item for the table of contents
 */
export interface TOCHeader {
	/** Unique ID matching the section's id attribute */
	id: string;
	/** Display text for the TOC item */
	text: string;
	/** Header level (1-6) for indentation */
	level: number;
	/** Optional Svelte component to render as an icon */
	icon?: Component<{ class?: string }>;
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
export function isValidIcon(icon: unknown): icon is Component<{ class?: string }> {
	if (icon === null || icon === undefined) return false;
	// Svelte components are either functions or objects with render capabilities
	// We can't easily check for 'render' without coupling to Svelte internals
	return typeof icon === 'function' || (typeof icon === 'object' && Object.keys(icon).length > 0);
}
