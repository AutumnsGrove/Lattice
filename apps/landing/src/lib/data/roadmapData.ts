/**
 * Roadmap feature data and phase styling.
 *
 * Single source of truth for:
 * - Phase configuration (order, titles, seasons, features)
 * - Phase visual styles (li classes, text colors, icon defaults)
 * - Per-feature color/border overrides
 *
 * Separated from the template to keep +page.svelte focused on layout
 * and nature scene decoration.
 */

import type { Season } from "@autumnsgrove/lattice/ui/nature";

// =============================================================================
// TYPES
// =============================================================================

export type PhaseKey =
	| "first-frost"
	| "thaw"
	| "first-buds"
	| "full-bloom"
	| "golden-hour"
	| "midnight-bloom";

export type Feature = {
	name: string;
	description: string;
	done: boolean;
	icon?: string;
	internal?: boolean;
	major?: boolean;
	dream?: boolean;
	articleSlug?: string;
	termSlug?: string;
};

export type PhaseData = {
	title: string;
	subtitle: string;
	season: Season;
	description: string;
	features: Feature[];
};

/**
 * Visual style contract for RoadmapFeatureItem.
 * Each phase defines one of these to control how its feature list renders.
 */
export type PhaseStyle = {
	/** Classes applied to the <li> element */
	li: string;
	/** Default icon color class (used when no per-feature override exists) */
	iconColor: string;
	/** Text color for feature name */
	nameColor: string;
	/** Text color for feature description */
	descColor: string;
	/** FeatureStar variant — 'midnight' for dark backgrounds */
	featureStar: "default" | "midnight";
	/** First Frost: always shows Check instead of feature-specific icon */
	useCheckIcon: boolean;
	/** Only Thaw shows the "Internal" badge on internal features */
	showInternalBadge: boolean;
};

// =============================================================================
// PHASE ORDER & CURRENT PHASE
// =============================================================================

export const PHASE_ORDER = [
	"first-frost",
	"thaw",
	"first-buds",
	"full-bloom",
	"golden-hour",
	"midnight-bloom",
] as const;

/**
 * HOWTO: Update this constant as Grove reaches new phases.
 * This controls the "You are here" indicator and phase status styling.
 */
export const currentPhase: PhaseKey = "thaw";

// =============================================================================
// FEATURE DATA
// =============================================================================

export const phases: Record<PhaseKey, PhaseData> = {
	"first-frost": {
		title: "First Frost",
		subtitle: "The quiet before dawn",
		season: "winter" as Season,
		description: "The groundwork has been laid. Foundations built in stillness.",
		features: [
			{
				name: "Lattice",
				description: "Core engine — powers the grove",
				done: true,
				major: true,
				articleSlug: "what-is-lattice",
				termSlug: "lattice",
			},
			{
				name: "Heartwood",
				description: "Authentication — keeps you safe",
				done: true,
				major: true,
				articleSlug: "what-is-heartwood",
				termSlug: "heartwood",
			},
			{ name: "Landing Site", description: "grove.place welcomes visitors", done: true },
			{
				name: "Clearing",
				description: "Status page — transparent platform health",
				done: true,
				icon: "clearing",
				articleSlug: "what-is-clearing",
				termSlug: "clearing",
			},
			{
				name: "Patina",
				description: "Nightly backups — age as armor",
				done: true,
				icon: "database",
				internal: true,
				termSlug: "patina",
			},
			{
				name: "Petal",
				description: "Image moderation — protection without surveillance",
				done: false,
				icon: "petal",
				major: true,
				articleSlug: "what-is-petal",
				termSlug: "petal",
			},
			{
				name: "Forage",
				description: "Domain discovery — AI-powered name hunting",
				done: true,
				icon: "forage",
				articleSlug: "what-is-forage",
				termSlug: "forage",
			},
			{ name: "Email Waitlist", description: "67 seeds, waiting to sprout", done: true },
		],
	},
	thaw: {
		title: "Thaw",
		subtitle: "February 2026 — The ice begins to crack",
		season: "winter" as Season,
		description: "Grove opens its doors. The first trees take root.",
		features: [
			{
				name: "Wanderer Tier",
				description: "Free forever — your space on the web",
				done: true,
				icon: "footprints",
				major: true,
				termSlug: "wanderer",
			},
			{
				name: "Seedling Tier",
				description: "$8/month — your corner of the grove",
				done: true,
				icon: "sprout",
				major: true,
				termSlug: "seedling",
			},
			{
				name: "Sign Up",
				description: "Google, email, or Hub account",
				done: true,
				icon: "userplus",
			},
			{ name: "Your Blog", description: "username.grove.place", done: true, icon: "globe" },
			{
				name: "Markdown Writing",
				description: "Write beautifully, simply",
				done: true,
				icon: "penline",
			},
			{ name: "Image Hosting", description: "Upload, we optimize", done: true, icon: "imageplus" },
			{ name: "RSS Feed", description: "Built-in, because it should be", done: true, icon: "rss" },
			{
				name: "Data Export",
				description: "Your words, always portable — a core feature",
				done: true,
				icon: "download",
				major: true,
			},
			{
				name: "Waystone",
				description: "Contextual help — guidance where you need it",
				done: true,
				icon: "signpost",
				articleSlug: "what-are-waystones",
				termSlug: "waystone",
			},
			{
				name: "Shade",
				description: "AI content protection — crawlers blocked at the gate",
				done: true,
				icon: "shieldcheck",
				major: true,
				articleSlug: "what-is-shade",
				termSlug: "shade",
			},
		],
	},
	"first-buds": {
		title: "First Buds",
		subtitle: "Early Spring — Green emerging through snow",
		season: "spring" as Season,
		description: "New growth appears. The grove finds its voice.",
		features: [
			{
				name: "Sapling Tier",
				description: "More space, more themes",
				done: false,
				icon: "tree",
				major: true,
				termSlug: "sapling",
			},
			{
				name: "Forests",
				description: "Community groves — find your people",
				done: false,
				icon: "forests",
				major: true,
				termSlug: "forests",
			},
			{
				name: "Wisp",
				description: "Writing assistant — a helper, not a writer",
				done: false,
				icon: "wisp",
				major: true,
				articleSlug: "what-is-wisp",
				termSlug: "wisp",
			},
			{
				name: "Foliage",
				description: "Theme library — more color for your corner",
				done: false,
				icon: "swatchbook",
				major: true,
				articleSlug: "what-is-foliage",
				termSlug: "foliage",
			},
			{
				name: "Amber",
				description: "Storage dashboard — see and manage your files",
				done: false,
				icon: "amber",
				major: true,
				articleSlug: "what-is-amber",
				termSlug: "amber",
			},
			{
				name: "Ivy",
				description: "Email at @grove.place — your words, your inbox",
				done: false,
				icon: "ivy",
				articleSlug: "what-is-ivy",
				termSlug: "ivy",
			},
			{
				name: "Trails",
				description: "Personal roadmaps — share your journey",
				done: false,
				icon: "trails",
				articleSlug: "what-is-trails",
				termSlug: "trails",
			},
			{
				name: "Porch",
				description: "Support conversations — come sit and talk",
				done: false,
				icon: "porch",
				articleSlug: "what-is-porch",
				termSlug: "porch",
			},
			{
				name: "Centennial",
				description: "100-year preservation — your words outlive you",
				done: false,
				icon: "centennial",
				major: true,
				articleSlug: "what-is-centennial",
				termSlug: "centennial",
			},
		],
	},
	"full-bloom": {
		title: "Full Bloom",
		subtitle: "Spring into Summer — Petals everywhere",
		season: "summer" as Season,
		description: "The grove becomes a community. Roots intertwine.",
		features: [
			{
				name: "Meadow",
				description: "Social feed — connection without competition",
				done: false,
				major: true,
				icon: "meadow",
				articleSlug: "what-is-meadow",
				termSlug: "meadow",
			},
			{
				name: "Chronological Feed",
				description: "No algorithms, just friends",
				done: false,
				icon: "clock",
			},
			{
				name: "Private Reactions",
				description: "Encouragement only the author sees",
				done: false,
				icon: "heart",
			},
			{
				name: "Reeds",
				description: "Comments — replies and thoughtful discussions",
				done: false,
				icon: "message",
				termSlug: "reeds",
			},
			{
				name: "Rings",
				description: "Private analytics — your growth, reflected",
				done: false,
				icon: "trending",
				articleSlug: "what-is-rings",
				termSlug: "rings",
			},
			{
				name: "Thorn",
				description: "Content moderation — keeping the grove safe",
				done: false,
				icon: "shield",
				articleSlug: "what-is-thorn",
				termSlug: "thorn",
			},
			{
				name: "Oak & Evergreen Tiers",
				description: "Custom domains, full control",
				done: false,
				icon: "crown",
				major: true,
			},
			{
				name: "Foliage",
				description: "Theme customizer — make it truly yours",
				done: false,
				icon: "paintbrush",
				articleSlug: "what-is-foliage",
				termSlug: "foliage",
			},
			{
				name: "Community Themes",
				description: "Share what you create",
				done: false,
				icon: "users",
			},
			{
				name: "Terrarium",
				description: "Creative canvas — compose scenes for your blog",
				done: false,
				major: true,
				icon: "terrarium",
				articleSlug: "what-is-terrarium",
				termSlug: "terrarium",
			},
			{
				name: "Curios",
				description: "Cabinet of wonders — guestbooks, shrines, old-web magic",
				done: false,
				icon: "curios",
				major: true,
				termSlug: "curios",
			},
			{
				name: "Weave",
				description: "Visual composition — animations and diagrams",
				done: false,
				icon: "weave",
				articleSlug: "what-is-weave",
				termSlug: "weave",
			},
			{
				name: "Outpost",
				description: "Community Minecraft — a server that waits for you",
				done: false,
				icon: "outpost",
				termSlug: "outpost",
			},
		],
	},
	"golden-hour": {
		title: "Golden Hour",
		subtitle: "Autumn — Warm light through the canopy",
		season: "autumn" as Season,
		description: "The grove settles into itself. A time for refinement.",
		features: [
			{
				name: "Wander",
				description: "Immersive discovery — walk through the forest",
				done: false,
				major: true,
				icon: "wander",
				termSlug: "wander",
			},
			{
				name: "Polish",
				description: "Attention to every detail",
				done: false,
				icon: "gem",
				major: true,
			},
			{ name: "Performance", description: "Fast everywhere, always", done: false, icon: "zap" },
			{
				name: "Accessibility",
				description: "Grove for everyone",
				done: false,
				icon: "accessibility",
			},
			{
				name: "Mobile Experience",
				description: "Beautiful on every screen",
				done: false,
				icon: "smartphone",
			},
			{
				name: "Edge Cases",
				description: "The small things that matter",
				done: false,
				icon: "puzzle",
			},
		],
	},
	"midnight-bloom": {
		title: "Midnight Bloom",
		subtitle: "The far horizon — A dream taking shape",
		season: "winter" as Season,
		description: "Where digital roots meet physical ground.",
		features: [
			{
				name: "The Café",
				description: "A late-night tea shop for the sleepless and searching",
				done: false,
				dream: true,
				icon: "coffee",
			},
			{
				name: "Community Boards",
				description: "QR codes linking physical to digital",
				done: false,
				dream: true,
				icon: "qrcode",
			},
			{
				name: "Local Zines",
				description: "Grove blogs printed and shared",
				done: false,
				dream: true,
				icon: "bookopen",
			},
			{
				name: "A Third Place",
				description: "That becomes a first home",
				done: false,
				dream: true,
				icon: "home",
				major: true,
			},
		],
	},
};

// =============================================================================
// PHASE STYLES
// =============================================================================

export const phaseStyles: Record<PhaseKey, PhaseStyle> = {
	"first-frost": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-success",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: true,
		showInternalBadge: false,
	},
	thaw: {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm border-l-4 border-accent shadow-sm",
		iconColor: "text-accent",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: true,
	},
	"first-buds": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-bark-400",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"full-bloom": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-bark-400",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"golden-hour": {
		li: "bg-white/70 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm border-l-4 border-warning",
		iconColor: "text-warning",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"midnight-bloom": {
		li: "bg-surface-subtle backdrop-blur-sm border border-border",
		iconColor: "text-warning",
		nameColor: "text-white",
		descColor: "text-foreground-subtle",
		featureStar: "midnight",
		useCheckIcon: false,
		showInternalBadge: false,
	},
};

// =============================================================================
// PER-FEATURE COLOR/BORDER OVERRIDES
// =============================================================================

/** Per-feature icon color overrides for phases that need them */
export const featureColorMaps: Partial<Record<PhaseKey, Record<string, string>>> = {
	"first-buds": {
		ivy: "text-success",
		amber: "text-warning",
		trails: "text-accent",
		tree: "text-success",
		swatchbook: "text-accent-subtle",
		wisp: "text-info",
		forests: "text-success",
		porch: "text-warning",
		terminal: "text-success",
		centennial: "text-accent",
	},
	"full-bloom": {
		meadow: "text-success",
		clock: "text-info",
		message: "text-info",
		heart: "text-accent-subtle",
		trending: "text-success",
		crown: "text-warning",
		paintbrush: "text-accent-subtle",
		users: "text-accent",
		shield: "text-foreground-muted",
		curios: "text-warning",
		terrarium: "text-success",
		weave: "text-info",
		outpost: "text-accent",
	},
	"golden-hour": {
		gem: "text-warning",
		zap: "text-warning",
		accessibility: "text-info",
		smartphone: "text-foreground-muted",
		puzzle: "text-accent",
		wander: "text-accent",
	},
	"midnight-bloom": {
		coffee: "text-warning",
		qrcode: "text-accent",
		bookopen: "text-foreground-subtle",
		home: "text-warning",
	},
};

/** Per-feature border overrides (only First Buds uses per-feature borders) */
export const featureBorderMaps: Partial<Record<PhaseKey, Record<string, string>>> = {
	"first-buds": {
		ivy: "border-l-4 border-success",
		amber: "border-l-4 border-warning",
		trails: "border-l-4 border-accent",
		tree: "border-l-4 border-success",
		swatchbook: "border-l-4 border-accent-subtle",
		wisp: "border-l-4 border-info",
		forests: "border-l-4 border-success",
		porch: "border-l-4 border-warning",
		terminal: "border-l-4 border-success",
		centennial: "border-l-4 border-accent",
	},
};

// =============================================================================
// HELPERS
// =============================================================================

/** Get the status of a phase relative to the current phase */
export function getPhaseStatus(phaseKey: PhaseKey): "past" | "current" | "future" {
	const currentIndex = PHASE_ORDER.indexOf(currentPhase);
	const thisIndex = PHASE_ORDER.indexOf(phaseKey);

	if (thisIndex < currentIndex) return "past";
	if (thisIndex === currentIndex) return "current";
	return "future";
}

/** Pre-computed status for each phase */
export const phaseStatus: Record<PhaseKey, "past" | "current" | "future"> = {
	"first-frost": getPhaseStatus("first-frost"),
	thaw: getPhaseStatus("thaw"),
	"first-buds": getPhaseStatus("first-buds"),
	"full-bloom": getPhaseStatus("full-bloom"),
	"golden-hour": getPhaseStatus("golden-hour"),
	"midnight-bloom": getPhaseStatus("midnight-bloom"),
};

/** Table of Contents headers derived from phase data */
export const tocHeaders = PHASE_ORDER.map((key) => ({
	id: key,
	text: phases[key].title,
	level: 2,
}));

/** Resolve the icon color for a feature within a phase */
export function getFeatureIconColor(phaseKey: PhaseKey, featureIcon?: string): string {
	if (!featureIcon) return phaseStyles[phaseKey].iconColor;
	return featureColorMaps[phaseKey]?.[featureIcon] ?? phaseStyles[phaseKey].iconColor;
}

/** Resolve the border class for a feature within a phase */
export function getFeatureBorderClass(phaseKey: PhaseKey, featureIcon?: string): string {
	if (!featureIcon) return "";
	return featureBorderMaps[phaseKey]?.[featureIcon] ?? "";
}
