/**
 * GroveIcon Types
 *
 * Types for the manifest-driven icon swap system.
 * Mirrors GroveTerm's manifest pattern but for icons instead of text.
 */

/**
 * A Lucide icon component type.
 * Uses typeof import to match the actual component class that lucide-svelte exports.
 * Same pattern as blazes/types.ts LucideIcon.
 */
export type IconComponent = typeof import("lucide-svelte").Cherry;

/**
 * A single entry in a service icon manifest.
 */
export interface GroveIconEntry {
	/** Lucide icon name (e.g., "PenLine", "LampCeiling") */
	icon: string;
	/** Human-readable label for the service */
	label?: string;
}

/**
 * An icon suite — a complete mapping of service slugs to icon assignments.
 * Each suite represents a cohesive visual identity for all Grove services.
 */
export type GroveIconSuite = Record<string, GroveIconEntry>;

/**
 * Collection of named icon suites that can be swapped at runtime.
 */
export type GroveIconManifest = Record<string, GroveIconSuite>;

/**
 * Resolved icon ready for rendering — the icon name has been
 * mapped to an actual Svelte component.
 */
export interface ResolvedIcon {
	component: IconComponent;
	label?: string;
}
