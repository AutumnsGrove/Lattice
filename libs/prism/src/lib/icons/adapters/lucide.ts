// @autumnsgrove/prism/icons/lucide
//
// THE adapter — the ONE file that imports from @lucide/svelte.
// Resolves manifest semantic aliases to actual Svelte components.
//
// Swapping icon packs = replacing this file.
//
// import { navIcons, stateIcons, resolveIcon } from '@autumnsgrove/prism/icons/lucide'

import type { Component } from "svelte";
import * as Lucide from "@lucide/svelte";
import { ICON_MANIFEST, normalize, isGroupKey } from "../manifest.js";
import type { IconGroupManifest, IconGroupName } from "../types.js";

// ---------------------------------------------------------------------------
// Internal Lucide component lookup
// ---------------------------------------------------------------------------

const _lucideMap = new Map<string, Component>();
for (const [name, component] of Object.entries(Lucide)) {
	if (typeof component === "function" || (typeof component === "object" && component !== null)) {
		_lucideMap.set(name, component as Component);
	}
}

// ---------------------------------------------------------------------------
// Lazy Proxy-based forgiving lookups
// ---------------------------------------------------------------------------

/**
 * Build a normalized lookup map from a manifest group.
 * Maps normalized aliases to their Lucide components.
 */
function buildNormalizedMap(group: IconGroupManifest): Map<string, Component> {
	const map = new Map<string, Component>();
	for (const [alias, lucideName] of Object.entries(group)) {
		const component = _lucideMap.get(lucideName);
		if (component) {
			map.set(normalize(alias), component);
		}
	}
	return map;
}

/**
 * Create a Proxy-wrapped icon map for a manifest group.
 *
 * Resolution is LAZY — the normalized map is built on first property access,
 * not at import time. This means the manifest can be populated at any time
 * before the first icon lookup (important for the Phase 0a → 0b split).
 *
 * Property access is case/delimiter insensitive:
 *   stateIcons.checkCircle === stateIcons.CHECK_CIRCLE === stateIcons['check-circle']
 */
function resolveGroup(group: IconGroupManifest): Record<string, Component> {
	let _resolved: Map<string, Component> | null = null;

	function ensureResolved(): Map<string, Component> {
		if (!_resolved) {
			_resolved = buildNormalizedMap(group);
		}
		return _resolved;
	}

	const base: Record<string, Component> = {};

	return new Proxy(base, {
		get(target, prop, receiver) {
			if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
			const resolved = ensureResolved();
			const component = resolved.get(normalize(prop));
			if (component) return component;
			return Reflect.get(target, prop, receiver);
		},
		has(target, prop) {
			if (typeof prop === "symbol") return Reflect.has(target, prop);
			return ensureResolved().has(normalize(prop));
		},
		ownKeys() {
			// Return canonical keys from the manifest group
			const resolved = ensureResolved();
			const keys: string[] = [];
			for (const alias of Object.keys(group)) {
				if (resolved.has(normalize(alias))) {
					keys.push(alias);
				}
			}
			return keys;
		},
		getOwnPropertyDescriptor(_target, prop) {
			if (typeof prop === "symbol") return undefined;
			const resolved = ensureResolved();
			const component = resolved.get(normalize(prop));
			if (component) {
				return { configurable: true, enumerable: true, value: component, writable: false };
			}
			return undefined;
		},
	});
}

// ---------------------------------------------------------------------------
// Resolved semantic icon maps — one per group (lazily resolved)
// ---------------------------------------------------------------------------

export const navIcons = resolveGroup(ICON_MANIFEST.nav);
export const stateIcons = resolveGroup(ICON_MANIFEST.state);
export const natureIcons = resolveGroup(ICON_MANIFEST.nature);
export const seasonIcons = resolveGroup(ICON_MANIFEST.season);
export const actionIcons = resolveGroup(ICON_MANIFEST.action);
export const featureIcons = resolveGroup(ICON_MANIFEST.feature);
export const authIcons = resolveGroup(ICON_MANIFEST.auth);
export const metricIcons = resolveGroup(ICON_MANIFEST.metric);
export const phaseIcons = resolveGroup(ICON_MANIFEST.phase);
export const toolIcons = resolveGroup(ICON_MANIFEST.tool);
export const blazeIcons = resolveGroup(ICON_MANIFEST.blaze);
export const chromeIcons = resolveGroup(ICON_MANIFEST.chrome);

// ---------------------------------------------------------------------------
// Group name → resolved map lookup (used by resolveIcon and allIcons)
// ---------------------------------------------------------------------------

const _groupMaps: Record<IconGroupName, Record<string, Component>> = {
	nav: navIcons,
	state: stateIcons,
	nature: natureIcons,
	season: seasonIcons,
	action: actionIcons,
	feature: featureIcons,
	auth: authIcons,
	metric: metricIcons,
	phase: phaseIcons,
	tool: toolIcons,
	blaze: blazeIcons,
	chrome: chromeIcons,
};

/**
 * Flat map of ALL icons across all groups.
 * Later groups override earlier ones if aliases collide.
 * Also lazily resolved — reads manifest at first access.
 */
export const allIcons: Record<string, Component> = new Proxy({} as Record<string, Component>, {
	get(_target, prop, _receiver) {
		if (typeof prop === "symbol") return undefined;
		for (const groupName of Object.keys(_groupMaps) as IconGroupName[]) {
			const component = _groupMaps[groupName][prop];
			if (component) return component;
		}
		return undefined;
	},
	has(_target, prop) {
		if (typeof prop === "symbol") return false;
		for (const groupName of Object.keys(_groupMaps) as IconGroupName[]) {
			if (prop in _groupMaps[groupName]) return true;
		}
		return false;
	},
	ownKeys() {
		const keys = new Set<string>();
		for (const groupName of Object.keys(_groupMaps) as IconGroupName[]) {
			for (const key of Object.keys(_groupMaps[groupName])) {
				keys.add(key);
			}
		}
		return [...keys];
	},
	getOwnPropertyDescriptor(_target, prop) {
		if (typeof prop === "symbol") return undefined;
		for (const groupName of Object.keys(_groupMaps) as IconGroupName[]) {
			const component = _groupMaps[groupName][prop];
			if (component) {
				return { configurable: true, enumerable: true, value: component, writable: false };
			}
		}
		return undefined;
	},
});

// ---------------------------------------------------------------------------
// Lookup utilities
// ---------------------------------------------------------------------------

/**
 * Get an icon from a specific resolved map by key (forgiving lookup).
 * Returns undefined if not found.
 */
export function getIcon(map: Record<string, Component>, key: string): Component | undefined {
	return map[key]; // Proxy handles normalization
}

/**
 * Get an icon from the flat allIcons map by key (forgiving lookup).
 * Returns undefined if not found.
 */
export function getIconFromAll(key: string): Component | undefined {
	return allIcons[key]; // Proxy handles normalization
}

// ---------------------------------------------------------------------------
// Safe resolver — the icon trust boundary (Rootwork-inspired)
// ---------------------------------------------------------------------------

/**
 * Validate + normalize + resolve an icon in one step.
 * Returns the component or the fallback — never throws, never casts.
 *
 * This is the icon equivalent of Rootwork's `safeJsonParse()`.
 * Use at trust boundaries where icon keys arrive as raw strings
 * (database rows, API responses, static data objects).
 *
 * @example
 * const icon = resolveIcon('tool', feature.icon, stateIcons.circle);
 */
export function resolveIcon(
	group: IconGroupName,
	key: string,
	fallback?: Component,
): Component | undefined {
	if (!key || typeof key !== "string") return fallback;
	if (!isGroupKey(group, key)) return fallback;

	const map = _groupMaps[group];
	if (!map) return fallback;

	const component = map[key]; // Proxy normalizes
	return component ?? fallback;
}

/**
 * Resolve an icon from ANY group by key.
 * Searches all groups via the flat allIcons map.
 * Returns the component or the fallback.
 */
export function resolveAnyIcon(key: string, fallback?: Component): Component | undefined {
	if (!key || typeof key !== "string") return fallback;
	const component = allIcons[key]; // Proxy normalizes
	return component ?? fallback;
}

// ---------------------------------------------------------------------------
// Re-export manifest utilities for convenience
// ---------------------------------------------------------------------------

export { ICON_MANIFEST, normalize, isIconKey, isGroupKey } from "../manifest.js";
export type { IconGroupName, IconGroupManifest, ResolveIconOptions } from "../types.js";
