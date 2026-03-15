// @autumnsgrove/prism — Icon type definitions
//
// Pure types for the icon manifest system. Zero runtime, zero dependencies.

import type { Component } from "svelte";

/**
 * The 12 semantic icon groups in the Prism manifest.
 * Each group describes an icon's role, not where it's used.
 */
export type IconGroupName =
	| "nav"
	| "state"
	| "nature"
	| "season"
	| "action"
	| "feature"
	| "auth"
	| "metric"
	| "phase"
	| "tool"
	| "blaze"
	| "chrome";

/**
 * A single group in the manifest: maps semantic aliases to icon pack names.
 * Keys are canonical lowercase aliases; values are the icon pack component name
 * (e.g., "CheckCircle" for lucide-svelte).
 */
export type IconGroupManifest = Record<string, string>;

/**
 * The complete icon manifest — all 12 groups.
 */
export type IconManifest = Record<IconGroupName, IconGroupManifest>;

/**
 * A resolved icon map: semantic aliases to actual Svelte components.
 * This is what the adapter produces from a manifest group.
 */
export type ResolvedIconMap<T extends IconGroupManifest> = {
	[K in keyof T]: Component;
};

/**
 * Options for resolveIcon() — the safe boundary resolver.
 */
export interface ResolveIconOptions {
	/** The semantic group to look in */
	group: IconGroupName;
	/** The key to resolve (normalized automatically) */
	key: string;
	/** Fallback component if key is invalid */
	fallback?: Component;
}
