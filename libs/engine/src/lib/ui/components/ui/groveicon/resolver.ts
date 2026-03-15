/**
 * Icon Resolver
 *
 * Maps icon name strings from the manifest to actual Svelte components.
 * Delegates to Prism's icon gateway — the SSOT for all icon identity.
 */

import type { Component } from "svelte";
import { resolveAnyIcon, stateIcons } from "@autumnsgrove/prism/icons";
import type { IconComponent } from "./types";

/**
 * Resolve an icon name string to its Svelte component.
 * Returns HelpCircle as fallback for unknown names.
 */
export function resolveIcon(name: string): IconComponent {
	return (resolveAnyIcon(name, stateIcons.help) ?? stateIcons.help) as IconComponent;
}

/**
 * Check if an icon name is known to the resolver.
 */
export function hasIcon(name: string): boolean {
	return resolveAnyIcon(name) !== undefined;
}
