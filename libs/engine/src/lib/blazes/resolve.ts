/**
 * Blazes — Client-side resolution utility.
 *
 * Resolves a blaze slug to a display definition using:
 *   1. Server-hydrated definition (if available)
 *   2. Global defaults map
 *   3. Humanized slug fallback (grey HelpCircle)
 *
 * Used by garden pages, arbor table, and meadow post detail.
 */

import { GLOBAL_BLAZE_DEFAULTS } from "./palette.js";

/** Minimal definition needed for the Blaze component */
export interface BlazeDisplayDef {
	label: string;
	icon: string;
	color: string;
}

/** Pre-built slug → definition map from global defaults */
const BLAZE_SLUG_MAP: Record<string, BlazeDisplayDef> = Object.fromEntries(
	GLOBAL_BLAZE_DEFAULTS.map((b) => [b.slug, { label: b.label, icon: b.icon, color: b.color }]),
);

/**
 * Resolve a custom blaze slug to a display definition.
 *
 * @param blazeSlug - The blaze slug from the post (may be null)
 * @param serverDef - Server-hydrated definition from LEFT JOIN (preferred)
 * @returns Resolved definition or null if no blaze
 */
export function resolveBlaze(
	blazeSlug: string | null | undefined,
	serverDef?: BlazeDisplayDef | null,
): BlazeDisplayDef | null {
	if (!blazeSlug) return null;

	// Prefer server-hydrated definition (includes tenant custom blazes)
	if (serverDef) return serverDef;

	// Fall back to global defaults
	const global = BLAZE_SLUG_MAP[blazeSlug];
	if (global) return global;

	// Last resort: humanize the slug
	const label = blazeSlug
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
	return { label, icon: "HelpCircle", color: "slate" };
}
