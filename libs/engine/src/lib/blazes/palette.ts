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
	// Expanded icon set for custom blazes
	BookOpen,
	Camera,
	Coffee,
	Compass,
	Crown,
	Flame,
	Flower2,
	Gift,
	Globe,
	Headphones,
	Key,
	Leaf,
	Lightbulb,
	MapPin,
	MessageCircle,
	Moon,
	Music,
	Palette,
	PenLine,
	Plane,
	Rocket,
	Sparkles,
	Sprout,
	Sun,
	Tag,
	TreeDeciduous,
	Umbrella,
	Zap,
	ChefHat,
	Laptop,
	Briefcase,
	Footprints,
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
	red: {
		classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
	},
	orange: {
		classes: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
	},
	teal: {
		classes: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
	},
	emerald: {
		classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
	},
	cyan: {
		classes: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
	},
	indigo: {
		classes: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
	},
	fuchsia: {
		classes: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
	},
	lime: {
		classes: "bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
	},
};

/**
 * Hex swatches for each named color — used by the settings color picker.
 * These are the "representative" hex value for visual display.
 */
export const BLAZE_COLOR_HEX: Record<string, string> = {
	grove: "#22c55e",
	amber: "#f59e0b",
	rose: "#f43f5e",
	pink: "#ec4899",
	sky: "#0ea5e9",
	violet: "#8b5cf6",
	yellow: "#eab308",
	slate: "#64748b",
	red: "#ef4444",
	orange: "#f97316",
	teal: "#14b8a6",
	emerald: "#10b981",
	cyan: "#06b6d4",
	indigo: "#6366f1",
	fuchsia: "#d946ef",
	lime: "#84cc16",
};

/**
 * Map of icon names to Lucide components for custom blazes.
 * Curated set of ~35 expressive icons suitable for content markers.
 */
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
	// Original 8 (used by defaults)
	Bell,
	UtensilsCrossed,
	Heart,
	GraduationCap,
	Hammer,
	Star,
	CloudSun,
	Megaphone,
	// Creative & Writing
	BookOpen,
	PenLine,
	Lightbulb,
	Sparkles,
	Palette,
	// Nature & Growth
	Leaf,
	Flower2,
	Sprout,
	TreeDeciduous,
	Flame,
	Sun,
	Moon,
	// Travel & Exploration
	Compass,
	MapPin,
	Globe,
	Plane,
	Footprints,
	// Lifestyle
	Camera,
	Coffee,
	Music,
	Headphones,
	ChefHat,
	Gift,
	Umbrella,
	// Tech & Work
	Laptop,
	Briefcase,
	Rocket,
	Zap,
	Tag,
	MessageCircle,
	Crown,
	Key,
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
 * Validate a hex color string (#rgb or #rrggbb).
 * Used for custom blaze colors.
 */
export function isValidBlazeHexColor(color: string): boolean {
	return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

/**
 * Check if a color value is a valid blaze color (either a named key or a hex string).
 */
export function isValidBlazeColor(color: string): boolean {
	return VALID_BLAZE_COLORS.includes(color) || isValidBlazeHexColor(color);
}

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
