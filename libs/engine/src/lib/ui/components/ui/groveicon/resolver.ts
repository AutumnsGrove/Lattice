/**
 * Icon Resolver
 *
 * Maps icon name strings from the manifest to actual Lucide Svelte components.
 * This is the bridge between the serializable manifest and runtime rendering.
 *
 * Similar to blazes/palette.ts LUCIDE_ICON_MAP pattern, but scoped to
 * the service icons used across Grove.
 */

import {
	// Core Platform
	Trees,
	Flower2,
	Key,
	// Content & Community
	Users,
	MessageCircle,
	MessageSquareDot,
	// Media & Storage
	HardDrive,
	Sparkles,
	// Theming
	Palette,
	// AI & Intelligence
	Leaf,
	// Communication
	Mail,
	Cable,
	// Safety
	ShieldCheck,
	// Infrastructure
	Activity,
	// Tools
	SearchCode,
	Footprints,
	Sprout,
	TreeDeciduous,
	Crown,
	// Navigation & Actions
	HelpCircle,
	PenLine,
	Send,
	Mic,
	// Additional service icons
	Wind,
	Store,
} from "@lucide/svelte";

// These icons aren't in the engine's existing lucide.ts registry
// but are used by services in the landing toolIcons map.
// We import them here so the resolver can find them.
import {
	Amphora,
	Frame,
	FileBox,
	Gauge,
	SolarPanel,
	Vault,
	PencilRuler,
	Eclipse,
	Lamp,
	LampCeiling,
	Fan,
	Blinds,
	SwatchBook,
	SplinePointer,
	DraftingCompass,
	Highlighter,
	Kayak,
	Earth,
	Flower,
} from "@lucide/svelte";

import type { IconComponent } from "./types";

/**
 * Master icon lookup table.
 * Maps Lucide icon names (PascalCase) to their Svelte components.
 */
const ICON_COMPONENTS: Record<string, IconComponent> = {
	// Core
	Trees,
	Flower,
	Flower2,
	Key,
	PenLine,
	Store,
	// Content & Community
	Users,
	MessageCircle,
	MessageSquareDot,
	Amphora,
	Frame,
	// Media
	HardDrive,
	Sparkles,
	// Theming
	Palette,
	SwatchBook,
	// AI
	LampCeiling,
	Lamp,
	Eclipse,
	Leaf,
	Wind,
	// Communication
	Mail,
	Cable,
	Send,
	// Safety
	ShieldCheck,
	Fan,
	Blinds,
	// Infrastructure
	FileBox,
	Gauge,
	Activity,
	SolarPanel,
	Vault,
	// Tools
	SearchCode,
	PencilRuler,
	SplinePointer,
	DraftingCompass,
	Mic,
	Highlighter,
	Kayak,
	Earth,
	Footprints,
	// Tiers
	Sprout,
	TreeDeciduous,
	Crown,
	// Fallback
	HelpCircle,
};

/**
 * Resolve an icon name string to its Svelte component.
 * Returns HelpCircle as fallback for unknown names.
 */
export function resolveIcon(name: string): IconComponent {
	return ICON_COMPONENTS[name] ?? HelpCircle;
}

/**
 * Check if an icon name is known to the resolver.
 */
export function hasIcon(name: string): boolean {
	return name in ICON_COMPONENTS;
}
