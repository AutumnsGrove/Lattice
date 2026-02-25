/**
 * Blazes — Auto-blaze config and color palette.
 *
 * Every Tailwind class string is written as a static literal so the
 * JIT scanner sees it at build time. Never construct class names dynamically.
 */

import { Cherry, Feather } from "lucide-svelte";
import {
	Bell,
	UtensilsCrossed,
	Heart,
	GraduationCap,
	Hammer,
	Star,
	CloudSun,
	Megaphone,
	HelpCircle,
} from "lucide-svelte";
import type { AutoBlazeConfig, BlazeColorClasses, LucideIcon, PostType } from "./types.js";

/**
 * Static config for auto-blazes (Slot 1). Keyed by post_type.
 * Adding a new post type to PostType forces a compiler error here.
 */
export const BLAZE_CONFIG: Record<PostType, AutoBlazeConfig> = {
	bloom: {
		label: "Bloom",
		icon: Cherry,
		classes: "bg-grove-50 text-grove-700 dark:bg-grove-900/30 dark:text-grove-300",
	},
	note: {
		label: "Note",
		icon: Feather,
		classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
	},
};

/**
 * Blaze color palette. Every key here is a valid value for
 * blaze_definitions.color. Class strings are static literals
 * so Tailwind sees them at build time.
 */
export const BLAZE_COLORS: Record<string, BlazeColorClasses> = {
	grove: {
		classes: "bg-grove-50 text-grove-700 dark:bg-grove-900/30 dark:text-grove-300",
	},
	amber: {
		classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
	},
	rose: {
		classes: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
	},
	pink: {
		classes: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
	},
	sky: {
		classes: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
	},
	violet: {
		classes: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
	},
	yellow: {
		classes: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
	},
	slate: {
		classes: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
	},
};

/** Map of icon names to Lucide components for custom blazes */
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
	Bell,
	UtensilsCrossed,
	Heart,
	GraduationCap,
	Hammer,
	Star,
	CloudSun,
	Megaphone,
};

/** Resolve a Lucide icon name to a component. Falls back to HelpCircle. */
export function resolveLucideIcon(name: string): LucideIcon {
	return LUCIDE_ICON_MAP[name] ?? HelpCircle;
}

/** All valid color keys for validation */
export const VALID_BLAZE_COLORS = Object.keys(BLAZE_COLORS);

/** All valid icon names for validation */
export const VALID_BLAZE_ICONS = Object.keys(LUCIDE_ICON_MAP);

/**
 * The 8 global default blaze definitions (for seeding and reference).
 * These match the migration seed data.
 */
export const GLOBAL_BLAZE_DEFAULTS = [
	{ slug: "update", label: "Update", icon: "Bell", color: "sky" },
	{ slug: "food-review", label: "Food Review", icon: "UtensilsCrossed", color: "rose" },
	{ slug: "personal", label: "Personal", icon: "Heart", color: "pink" },
	{ slug: "tutorial", label: "Tutorial", icon: "GraduationCap", color: "violet" },
	{ slug: "project", label: "Project", icon: "Hammer", color: "amber" },
	{ slug: "review", label: "Review", icon: "Star", color: "yellow" },
	{ slug: "thought", label: "Thought", icon: "CloudSun", color: "slate" },
	{ slug: "announcement", label: "Announcement", icon: "Megaphone", color: "grove" },
] as const;
