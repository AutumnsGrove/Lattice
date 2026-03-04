/**
 * Artifacts Curio — A Personal Cabinet of Curiosities
 *
 * 20 interactive artifacts organized into five categories:
 * Mystical, Interactive, Classic Web, Nature, and Whimsical.
 * Each artifact is a self-contained object with its own visual
 * style, interaction pattern, and optional glass card container.
 *
 * Features:
 * - Self-contained interactive artifacts with unique visuals
 * - Daily draws seeded by date (consistent per day per tenant)
 * - Zone-based placement (sidebar, header, footer, inline, floating, hidden)
 * - Discovery mechanics (visibility rules, reveal animations)
 * - Keyboard-accessible with reduced motion fallbacks
 * - Dark mode aware
 */

import type { Component } from "svelte";

// =============================================================================
// Types
// =============================================================================

/**
 * Artifact type — the kind of interactive object
 */
export type ArtifactType =
	| "magic8ball"
	| "fortunecookie"
	| "tarotcard"
	| "crystalball"
	| "glasscathedral"
	| "diceroller"
	| "coinflip"
	| "wishingwell"
	| "snowglobe"
	| "marqueetext"
	| "blinkingnew"
	| "rainbowdivider"
	| "emailbutton"
	| "moodcandle"
	| "windchime"
	| "hourglass"
	| "potionbottle"
	| "musicbox"
	| "compassrose"
	| "terrariumglobe";

/**
 * Artifact category for grouping in the picker
 */
export type ArtifactCategory = "mystical" | "interactive" | "classic" | "nature" | "whimsical";

/**
 * Zone-based placement system
 */
export type ArtifactPlacement = "sidebar" | "header" | "footer" | "inline" | "floating" | "hidden";

/**
 * Visibility mode for discovery mechanics
 */
export type ArtifactVisibility = "always" | "hidden" | "easter-egg";

/**
 * Reveal animation when a hidden artifact becomes visible
 */
export type RevealAnimation = "fade" | "sparkle" | "slide" | "grow" | "flicker";

/**
 * Container style — bare (default) or wrapped in glass card
 */
export type ArtifactContainer = "none" | "glass-card";

/**
 * Discovery rule condition types
 */
export type DiscoveryConditionType =
	| "time-of-day"
	| "day-of-week"
	| "season"
	| "specific-date"
	| "dark-mode"
	| "scroll-depth"
	| "pages-visited"
	| "time-on-site"
	| "random-chance";

/**
 * A single discovery rule condition
 */
export interface DiscoveryCondition {
	type: DiscoveryConditionType;
	value: string | number;
}

/**
 * Artifact record stored in database
 */
export interface ArtifactRecord {
	id: string;
	tenantId: string;
	name: string;
	artifactType: ArtifactType;
	placement: ArtifactPlacement;
	config: Record<string, unknown>;
	sortOrder: number;
	visibility: ArtifactVisibility;
	discoveryRules: DiscoveryCondition[];
	revealAnimation: RevealAnimation;
	container: ArtifactContainer;
	positionX: number | null;
	positionY: number | null;
	zIndex: number;
	fallbackZone: ArtifactPlacement;
	createdAt: string;
}

/**
 * Artifact for public display
 */
export interface ArtifactDisplay {
	id: string;
	name: string;
	artifactType: ArtifactType;
	placement: ArtifactPlacement;
	config: Record<string, unknown>;
	visibility: ArtifactVisibility;
	discoveryRules: DiscoveryCondition[];
	revealAnimation: RevealAnimation;
	container: ArtifactContainer;
	positionX: number | null;
	positionY: number | null;
	zIndex: number;
	fallbackZone: ArtifactPlacement;
}

// =============================================================================
// Component Types (renderer trust boundary)
// =============================================================================

/**
 * Common props accepted by all artifact components.
 * The ArtifactRenderer passes these at the trust boundary;
 * each component narrows `config` to its own typed interface internally.
 */
export interface ArtifactComponentProps {
	config: Record<string, unknown>;
	tenantId?: string;
	artifactId?: string;
}

/**
 * Component type for the artifact renderer's dispatch map.
 * Follows the rootwork pattern: validate at the boundary, trust inside.
 */
export type ArtifactComponentType = Component<ArtifactComponentProps>;

// =============================================================================
// Config Interfaces (per artifact type)
// =============================================================================

export interface Magic8BallConfig {
	customAnswers?: string[];
}

export interface FortuneCookieConfig {
	customFortunes?: string[];
}

export interface TarotCardConfig {
	showMeaning?: boolean;
}

export interface CrystalBallConfig {
	mistColor?: "purple" | "green" | "blue" | "rose" | "amber";
}

export interface GlassCathedralConfig {
	panelCount?: number;
	baseColor?: string;
	transition?: "fade" | "slide" | "dissolve";
}

export interface DiceRollerConfig {
	diceType?: "d4" | "d6" | "d8" | "d12" | "d20";
}

export interface CoinFlipConfig {
	headsLabel?: string;
	tailsLabel?: string;
}

export interface WishingWellConfig {
	placeholder?: string;
}

export interface SnowGlobeConfig {
	particles?: "snow" | "petals" | "leaves" | "fireflies";
}

export interface MarqueeTextConfig {
	text?: string;
	speed?: "slow" | "normal" | "fast";
	direction?: "left" | "right";
}

export interface BlinkingNewConfig {
	text?: string;
}

export interface RainbowDividerConfig {
	style?: "gradient" | "stripes" | "sparkle";
}

export interface EmailButtonConfig {
	contactUrl?: string;
	label?: string;
}

export interface MoodCandleConfig {
	flameColor?: "amber" | "green" | "lavender" | "blue" | "rose";
}

export interface WindChimeConfig {
	material?: "glass" | "bamboo" | "metal";
}

export interface HourglassConfig {
	eventName?: string;
	targetDate?: string;
}

export interface PotionBottleConfig {
	liquidColor?: string;
	label?: string;
}

export interface MusicBoxConfig {
	melody?: "lullaby" | "forest" | "classic" | "waltz" | "celeste";
}

export interface CompassRoseConfig {
	pointsTo?: string;
	pointsToUrl?: string;
}

export interface TerrariumGlobeConfig {
	seasonAware?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Artifact type definition
 */
export interface ArtifactTypeDefinition {
	value: ArtifactType;
	label: string;
	description: string;
	category: ArtifactCategory;
}

/**
 * All artifact type definitions — 20 types across 5 categories
 */
export const ARTIFACT_TYPES: ArtifactTypeDefinition[] = [
	// --- Mystical ---
	{
		value: "magic8ball",
		label: "Magic 8-Ball",
		description: "Shake for an answer to your question",
		category: "mystical",
	},
	{
		value: "fortunecookie",
		label: "Fortune Cookie",
		description: "Crack open for a daily fortune",
		category: "mystical",
	},
	{
		value: "tarotcard",
		label: "Tarot Card",
		description: "Daily card draw from the Major Arcana",
		category: "mystical",
	},
	{
		value: "crystalball",
		label: "Crystal Ball",
		description: "Swirling mist in a glass sphere",
		category: "mystical",
	},
	{
		value: "glasscathedral",
		label: "Glass Cathedral",
		description: "A prismatic doorway to an immersive experience",
		category: "mystical",
	},
	// --- Interactive ---
	{
		value: "diceroller",
		label: "Dice Roller",
		description: "Roll any die from d4 to d20",
		category: "interactive",
	},
	{
		value: "coinflip",
		label: "Coin Flip",
		description: "Heads or tails with a spinning animation",
		category: "interactive",
	},
	{
		value: "wishingwell",
		label: "Wishing Well",
		description: "Toss a coin and make a wish",
		category: "interactive",
	},
	{
		value: "snowglobe",
		label: "Snow Globe",
		description: "Shake to send particles swirling",
		category: "interactive",
	},
	// --- Classic Web ---
	{
		value: "marqueetext",
		label: "Marquee Text",
		description: "Scrolling message across the page",
		category: "classic",
	},
	{
		value: "blinkingnew",
		label: 'Blinking "NEW!"',
		description: "The classic blinking new indicator",
		category: "classic",
	},
	{
		value: "rainbowdivider",
		label: "Rainbow Divider",
		description: "Colorful animated separator line",
		category: "classic",
	},
	{
		value: "emailbutton",
		label: "Email Button",
		description: "Retro contact button with mailbox icon",
		category: "classic",
	},
	// --- Nature ---
	{
		value: "moodcandle",
		label: "Mood Candle",
		description: "Flickering flame, brighter in dark mode",
		category: "nature",
	},
	{
		value: "windchime",
		label: "Wind Chime",
		description: "Gently swaying chimes",
		category: "nature",
	},
	{
		value: "hourglass",
		label: "Hourglass",
		description: "Countdown timer to your next event",
		category: "nature",
	},
	// --- Whimsical ---
	{
		value: "potionbottle",
		label: "Potion Bottle",
		description: "Bubbling liquid in a glass bottle",
		category: "whimsical",
	},
	{
		value: "musicbox",
		label: "Music Box",
		description: "Click to play a short melody",
		category: "whimsical",
	},
	{
		value: "compassrose",
		label: "Compass Rose",
		description: "A needle that always points somewhere",
		category: "whimsical",
	},
	{
		value: "terrariumglobe",
		label: "Terrarium Globe",
		description: "A tiny sealed ecosystem in glass",
		category: "whimsical",
	},
];

/**
 * Placement zone options
 */
export const PLACEMENT_OPTIONS: {
	value: ArtifactPlacement;
	label: string;
	description: string;
}[] = [
	{
		value: "sidebar",
		label: "Sidebar",
		description: "Right or left margin alongside content",
	},
	{
		value: "header",
		label: "Header",
		description: "Top of page, above or within the header",
	},
	{
		value: "footer",
		label: "Footer",
		description: "Bottom of page, within the footer area",
	},
	{
		value: "inline",
		label: "Inline",
		description: "Within the content flow",
	},
	{
		value: "floating",
		label: "Floating",
		description: "Fixed position, overlaying content",
	},
	{
		value: "hidden",
		label: "Hidden",
		description: "Invisible until discovery rules are met",
	},
];

/**
 * Visibility mode options
 */
export const VISIBILITY_OPTIONS: {
	value: ArtifactVisibility;
	label: string;
}[] = [
	{ value: "always", label: "Always visible" },
	{ value: "hidden", label: "Hidden (rule-based)" },
	{ value: "easter-egg", label: "Easter egg (no hints)" },
];

/**
 * Reveal animation options
 */
export const REVEAL_ANIMATION_OPTIONS: {
	value: RevealAnimation;
	label: string;
	description: string;
}[] = [
	{ value: "fade", label: "Fade", description: "Gentle fade-in" },
	{
		value: "sparkle",
		label: "Sparkle",
		description: "Materializes with a tiny celebration",
	},
	{ value: "slide", label: "Slide", description: "Slides in from the edge" },
	{ value: "grow", label: "Grow", description: "Grows from a tiny seed" },
	{
		value: "flicker",
		label: "Flicker",
		description: "Phases into existence",
	},
];

/**
 * Container style options
 */
export const CONTAINER_OPTIONS: {
	value: ArtifactContainer;
	label: string;
}[] = [
	{ value: "none", label: "Bare (artifact's own style)" },
	{ value: "glass-card", label: "Glass card (display case)" },
];

/**
 * Default Magic 8-Ball answers (20)
 */
export const DEFAULT_8BALL_ANSWERS: string[] = [
	"It is certain",
	"Without a doubt",
	"Yes definitely",
	"You may rely on it",
	"As I see it, yes",
	"Most likely",
	"Outlook good",
	"Yes",
	"Signs point to yes",
	"Reply hazy, try again",
	"Ask again later",
	"Better not tell you now",
	"Cannot predict now",
	"Concentrate and ask again",
	"Don't count on it",
	"My reply is no",
	"My sources say no",
	"Outlook not so good",
	"Very doubtful",
	"The forest whispers no",
];

/**
 * Daily fortunes (15)
 */
export const DEFAULT_FORTUNES: string[] = [
	"A pleasant surprise is waiting for you",
	"The path ahead is clear — walk boldly",
	"Something you lost will soon be found",
	"A creative endeavor will bear fruit",
	"Trust the process; the grove grows slowly",
	"An old friend will reach out soon",
	"Your patience will be rewarded today",
	"The answer you seek is closer than you think",
	"A small kindness will ripple outward",
	"Today is a good day for new beginnings",
	"The stars are aligned in your favor",
	"Rest is productive too — the forest rests",
	"Something wonderful is on its way",
	"Your instincts are right — trust them",
	"A gentle wind carries good news",
];

/**
 * Tarot Major Arcana — 22 cards
 */
export const TAROT_MAJOR_ARCANA: {
	number: number;
	name: string;
	meaning: string;
}[] = [
	{ number: 0, name: "The Fool", meaning: "New beginnings, spontaneity" },
	{ number: 1, name: "The Magician", meaning: "Willpower, creation" },
	{
		number: 2,
		name: "The High Priestess",
		meaning: "Intuition, inner voice",
	},
	{ number: 3, name: "The Empress", meaning: "Abundance, nurturing" },
	{ number: 4, name: "The Emperor", meaning: "Structure, authority" },
	{
		number: 5,
		name: "The Hierophant",
		meaning: "Tradition, spiritual guidance",
	},
	{ number: 6, name: "The Lovers", meaning: "Connection, harmony" },
	{ number: 7, name: "The Chariot", meaning: "Determination, momentum" },
	{ number: 8, name: "Strength", meaning: "Courage, inner strength" },
	{ number: 9, name: "The Hermit", meaning: "Reflection, solitude" },
	{
		number: 10,
		name: "Wheel of Fortune",
		meaning: "Cycles, turning points",
	},
	{ number: 11, name: "Justice", meaning: "Truth, fairness" },
	{
		number: 12,
		name: "The Hanged Man",
		meaning: "Surrender, new perspective",
	},
	{ number: 13, name: "Death", meaning: "Transformation, endings" },
	{ number: 14, name: "Temperance", meaning: "Balance, patience" },
	{ number: 15, name: "The Devil", meaning: "Shadow, attachment" },
	{ number: 16, name: "The Tower", meaning: "Upheaval, revelation" },
	{ number: 17, name: "The Star", meaning: "Hope, inspiration" },
	{ number: 18, name: "The Moon", meaning: "Illusion, the unconscious" },
	{ number: 19, name: "The Sun", meaning: "Joy, vitality" },
	{ number: 20, name: "Judgement", meaning: "Rebirth, reckoning" },
	{ number: 21, name: "The World", meaning: "Completion, wholeness" },
];

/**
 * Music box melody presets
 */
export const MUSIC_BOX_MELODIES = ["lullaby", "forest", "classic", "waltz", "celeste"] as const;
export type MusicBoxMelody = (typeof MUSIC_BOX_MELODIES)[number];

/**
 * Mood candle flame colors
 */
export const FLAME_COLORS = ["amber", "green", "lavender", "blue", "rose"] as const;
export type FlameColor = (typeof FLAME_COLORS)[number];

/**
 * Crystal ball mist colors
 */
export const MIST_COLORS = ["purple", "green", "blue", "rose", "amber"] as const;
export type MistColor = (typeof MIST_COLORS)[number];

/**
 * Wind chime materials
 */
export const CHIME_MATERIALS = ["glass", "bamboo", "metal"] as const;
export type ChimeMaterial = (typeof CHIME_MATERIALS)[number];

/**
 * Snow globe particle types
 */
export const GLOBE_PARTICLES = ["snow", "petals", "leaves", "fireflies"] as const;
export type GlobeParticles = (typeof GLOBE_PARTICLES)[number];

/**
 * Rainbow divider styles
 */
export const DIVIDER_STYLES = ["gradient", "stripes", "sparkle"] as const;
export type DividerStyle = (typeof DIVIDER_STYLES)[number];

/**
 * Dice types
 */
export const DICE_TYPES = ["d4", "d6", "d8", "d12", "d20"] as const;
export type DiceType = (typeof DICE_TYPES)[number];

/**
 * Dice faces per type
 */
export const DICE_FACES: Record<DiceType, number> = {
	d4: 4,
	d6: 6,
	d8: 8,
	d12: 12,
	d20: 20,
};

/**
 * Valid artifact types set
 */
export const VALID_ARTIFACT_TYPES = new Set<string>(ARTIFACT_TYPES.map((a) => a.value));

/**
 * Valid placements set
 */
export const VALID_PLACEMENTS = new Set<string>(PLACEMENT_OPTIONS.map((p) => p.value));

/**
 * Valid visibility modes
 */
export const VALID_VISIBILITIES = new Set<string>(VISIBILITY_OPTIONS.map((v) => v.value));

/**
 * Valid reveal animations
 */
export const VALID_REVEAL_ANIMATIONS = new Set<string>(
	REVEAL_ANIMATION_OPTIONS.map((r) => r.value),
);

/**
 * Valid container styles
 */
export const VALID_CONTAINERS = new Set<string>(CONTAINER_OPTIONS.map((c) => c.value));

/**
 * Max artifact name length
 */
export const MAX_ARTIFACT_NAME_LENGTH = 80;

/**
 * Max config JSON size
 */
export const MAX_CONFIG_SIZE = 4096;

/**
 * Max marquee text length
 */
export const MAX_MARQUEE_TEXT_LENGTH = 200;

/**
 * Max artifacts per tenant
 */
export const MAX_ARTIFACTS_PER_TENANT = 100;

/**
 * Look up the human-readable label for an artifact type.
 * Returns the raw type string if no match is found.
 */
export function getTypeLabel(type: string): string {
	return ARTIFACT_TYPES.find((t) => t.value === type)?.label ?? type;
}

/**
 * Summarize non-empty config values as human-readable display tags.
 * Used in showcase admin mode and artifact card meta tags.
 */
export function summarizeConfig(config: Record<string, unknown>): string[] {
	return Object.entries(config)
		.filter(([, v]) => v !== undefined && v !== "" && v !== null)
		.map(([k, v]) => {
			if (Array.isArray(v)) return `${k}: ${v.length} items`;
			if (typeof v === "boolean") return v ? k : "";
			return `${k}: ${v}`;
		})
		.filter(Boolean);
}

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique artifact ID
 */
export function generateArtifactId(): string {
	return `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate artifact type
 */
export function isValidArtifactType(type: string): type is ArtifactType {
	return VALID_ARTIFACT_TYPES.has(type);
}

/**
 * Validate placement
 */
export function isValidPlacement(placement: string): placement is ArtifactPlacement {
	return VALID_PLACEMENTS.has(placement);
}

/**
 * Validate visibility mode
 */
export function isValidVisibility(visibility: string): visibility is ArtifactVisibility {
	return VALID_VISIBILITIES.has(visibility);
}

/**
 * Validate reveal animation
 */
export function isValidRevealAnimation(animation: string): animation is RevealAnimation {
	return VALID_REVEAL_ANIMATIONS.has(animation);
}

/**
 * Validate container style
 */
export function isValidContainer(container: string): container is ArtifactContainer {
	return VALID_CONTAINERS.has(container);
}

/**
 * Validate artifact name (1-80 chars, trimmed, non-empty)
 */
export function isValidArtifactName(name: string): boolean {
	const trimmed = name.trim();
	return trimmed.length >= 1 && trimmed.length <= MAX_ARTIFACT_NAME_LENGTH;
}

// =============================================================================
// Config Field Registry
// =============================================================================

/**
 * Definition for a config form field rendered in the admin UI.
 * The registry maps each artifact type to its configurable fields.
 */
export interface ArtifactConfigFieldDef {
	key: string;
	label: string;
	type: "text" | "textarea" | "select" | "color" | "date" | "number" | "toggle";
	options?: { value: string; label: string }[];
	placeholder?: string;
	required?: boolean;
	helpText?: string;
}

/**
 * Per-type config field definitions.
 * Empty arrays mean "no user-configurable fields".
 */
export const ARTIFACT_CONFIG_FIELDS: Record<ArtifactType, ArtifactConfigFieldDef[]> = {
	magic8ball: [
		{
			key: "customAnswers",
			label: "Custom Answers",
			type: "textarea",
			placeholder: "One answer per line (leave empty for defaults)",
			helpText: "20 default answers used if empty",
		},
	],
	fortunecookie: [
		{
			key: "customFortunes",
			label: "Custom Fortunes",
			type: "textarea",
			placeholder: "One fortune per line",
			helpText: "15 defaults used if empty",
		},
	],
	tarotcard: [
		{
			key: "showMeaning",
			label: "Show Meaning",
			type: "toggle",
			helpText: "Display the card's meaning alongside the name",
		},
	],
	crystalball: [
		{
			key: "mistColor",
			label: "Mist Color",
			type: "select",
			options: [
				{ value: "purple", label: "Purple" },
				{ value: "green", label: "Green" },
				{ value: "blue", label: "Blue" },
				{ value: "rose", label: "Rose" },
				{ value: "amber", label: "Amber" },
			],
		},
	],
	glasscathedral: [
		{
			key: "panelCount",
			label: "Panel Count",
			type: "number",
			placeholder: "3",
			helpText: "Number of stained glass panels",
		},
		{
			key: "baseColor",
			label: "Base Color",
			type: "color",
		},
		{
			key: "transition",
			label: "Transition",
			type: "select",
			options: [
				{ value: "fade", label: "Fade" },
				{ value: "slide", label: "Slide" },
				{ value: "dissolve", label: "Dissolve" },
			],
		},
	],
	diceroller: [
		{
			key: "diceType",
			label: "Dice Type",
			type: "select",
			options: [
				{ value: "d4", label: "d4" },
				{ value: "d6", label: "d6" },
				{ value: "d8", label: "d8" },
				{ value: "d12", label: "d12" },
				{ value: "d20", label: "d20" },
			],
		},
	],
	coinflip: [
		{
			key: "headsLabel",
			label: "Heads Label",
			type: "text",
			placeholder: "Heads",
		},
		{
			key: "tailsLabel",
			label: "Tails Label",
			type: "text",
			placeholder: "Tails",
		},
	],
	wishingwell: [
		{
			key: "placeholder",
			label: "Placeholder Text",
			type: "text",
			placeholder: "Make a wish…",
		},
	],
	snowglobe: [
		{
			key: "particles",
			label: "Particles",
			type: "select",
			options: [
				{ value: "snow", label: "Snow" },
				{ value: "petals", label: "Petals" },
				{ value: "leaves", label: "Leaves" },
				{ value: "fireflies", label: "Fireflies" },
			],
		},
	],
	marqueetext: [
		{
			key: "text",
			label: "Scrolling Text",
			type: "text",
			placeholder: "Your scrolling message",
			required: true,
		},
		{
			key: "speed",
			label: "Speed",
			type: "select",
			options: [
				{ value: "slow", label: "Slow" },
				{ value: "normal", label: "Normal" },
				{ value: "fast", label: "Fast" },
			],
		},
		{
			key: "direction",
			label: "Direction",
			type: "select",
			options: [
				{ value: "left", label: "Left" },
				{ value: "right", label: "Right" },
			],
		},
	],
	blinkingnew: [
		{
			key: "text",
			label: "Text",
			type: "text",
			placeholder: "NEW!",
		},
	],
	rainbowdivider: [
		{
			key: "style",
			label: "Style",
			type: "select",
			options: [
				{ value: "gradient", label: "Gradient" },
				{ value: "stripes", label: "Stripes" },
				{ value: "sparkle", label: "Sparkle" },
			],
		},
	],
	emailbutton: [
		{
			key: "contactUrl",
			label: "Contact URL",
			type: "text",
			placeholder: "https://example.com/contact",
		},
		{
			key: "label",
			label: "Button Label",
			type: "text",
			placeholder: "Email Me!",
		},
	],
	moodcandle: [
		{
			key: "flameColor",
			label: "Flame Color",
			type: "select",
			options: [
				{ value: "amber", label: "Amber" },
				{ value: "green", label: "Green" },
				{ value: "lavender", label: "Lavender" },
				{ value: "blue", label: "Blue" },
				{ value: "rose", label: "Rose" },
			],
		},
	],
	windchime: [
		{
			key: "material",
			label: "Material",
			type: "select",
			options: [
				{ value: "glass", label: "Glass" },
				{ value: "bamboo", label: "Bamboo" },
				{ value: "metal", label: "Metal" },
			],
		},
	],
	hourglass: [
		{
			key: "eventName",
			label: "Event Name",
			type: "text",
			placeholder: "e.g. New Year's Eve",
			required: true,
		},
		{
			key: "targetDate",
			label: "Target Date",
			type: "date",
			required: true,
		},
	],
	potionbottle: [
		{
			key: "liquidColor",
			label: "Liquid Color",
			type: "color",
		},
		{
			key: "label",
			label: "Potion Label",
			type: "text",
			placeholder: "Liquid Courage",
		},
	],
	musicbox: [
		{
			key: "melody",
			label: "Melody",
			type: "select",
			options: [
				{ value: "lullaby", label: "Lullaby" },
				{ value: "forest", label: "Forest" },
				{ value: "classic", label: "Classic" },
				{ value: "waltz", label: "Waltz" },
				{ value: "celeste", label: "Celeste" },
			],
		},
	],
	compassrose: [
		{
			key: "pointsTo",
			label: "Points To",
			type: "text",
			placeholder: "e.g. Home",
			helpText: "Label for the compass direction",
		},
		{
			key: "pointsToUrl",
			label: "Destination URL",
			type: "text",
			placeholder: "https://…",
		},
	],
	terrariumglobe: [],
};

/**
 * Sanitize artifact config JSON
 */
export function sanitizeConfig(configStr: string | null | undefined): Record<string, unknown> {
	if (!configStr) return {};
	try {
		const parsed = JSON.parse(configStr);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
		return parsed as Record<string, unknown>;
	} catch {
		return {};
	}
}

/**
 * Sanitize marquee text
 */
export function sanitizeMarqueeText(text: string | null | undefined): string | null {
	if (!text) return null;
	const cleaned = stripHtml(text).trim();
	if (cleaned.length === 0) return null;
	if (cleaned.length > MAX_MARQUEE_TEXT_LENGTH) return cleaned.slice(0, MAX_MARQUEE_TEXT_LENGTH);
	return cleaned;
}

/**
 * Parse discovery rules from JSON string
 */
export function parseDiscoveryRules(rulesStr: string | null | undefined): DiscoveryCondition[] {
	if (!rulesStr) return [];
	try {
		const parsed = JSON.parse(rulesStr);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(r: unknown) =>
				typeof r === "object" &&
				r !== null &&
				"type" in r &&
				"value" in r &&
				typeof (r as DiscoveryCondition).type === "string",
		) as DiscoveryCondition[];
	} catch {
		return [];
	}
}

/**
 * Get a seeded daily value (consistent for a given date + tenant)
 */
export function getDailyIndex(tenantId: string, totalOptions: number, dateStr?: string): number {
	const date = dateStr || new Date().toISOString().slice(0, 10);
	const seed = `${date}:${tenantId}`;
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash) % totalOptions;
}

/**
 * Get a random 8-Ball answer
 */
export function get8BallAnswer(customAnswers?: string[]): string {
	const answers = customAnswers && customAnswers.length > 0 ? customAnswers : DEFAULT_8BALL_ANSWERS;
	return answers[Math.floor(Math.random() * answers.length)];
}

/**
 * Get daily fortune for a tenant
 */
export function getDailyFortune(
	tenantId: string,
	customFortunes?: string[],
	dateStr?: string,
): string {
	const fortunes = customFortunes && customFortunes.length > 0 ? customFortunes : DEFAULT_FORTUNES;
	const index = getDailyIndex(tenantId, fortunes.length, dateStr);
	return fortunes[index];
}

/**
 * Get daily tarot card for a tenant
 */
export function getDailyTarot(
	tenantId: string,
	dateStr?: string,
): (typeof TAROT_MAJOR_ARCANA)[number] {
	const index = getDailyIndex(tenantId, TAROT_MAJOR_ARCANA.length, dateStr);
	return TAROT_MAJOR_ARCANA[index];
}

/**
 * Roll a die
 */
export function rollDice(diceType: DiceType): number {
	const faces = DICE_FACES[diceType] || 6;
	return Math.floor(Math.random() * faces) + 1;
}

/**
 * Flip a coin
 */
export function flipCoin(): "heads" | "tails" {
	return Math.random() < 0.5 ? "heads" : "tails";
}

/**
 * Transform database row to ArtifactRecord
 */
export function rowToRecord(row: {
	id: string;
	tenant_id: string;
	name?: string;
	artifact_type: string;
	placement: string;
	config: string;
	sort_order: number;
	visibility?: string;
	discovery_rules?: string;
	reveal_animation?: string;
	container?: string;
	position_x?: number | null;
	position_y?: number | null;
	z_index?: number;
	fallback_zone?: string;
	created_at: string;
}): ArtifactRecord {
	return {
		id: row.id,
		tenantId: row.tenant_id,
		name: row.name ?? "",
		artifactType: row.artifact_type as ArtifactType,
		placement: (row.placement || "sidebar") as ArtifactPlacement,
		config: sanitizeConfig(row.config),
		sortOrder: row.sort_order,
		visibility: (row.visibility || "always") as ArtifactVisibility,
		discoveryRules: parseDiscoveryRules(row.discovery_rules),
		revealAnimation: (row.reveal_animation || "fade") as RevealAnimation,
		container: (row.container || "none") as ArtifactContainer,
		positionX: row.position_x ?? null,
		positionY: row.position_y ?? null,
		zIndex: row.z_index ?? 10,
		fallbackZone: (row.fallback_zone || "floating") as ArtifactPlacement,
		createdAt: row.created_at,
	};
}

/**
 * Transform record to public display
 */
export function toDisplayArtifact(record: ArtifactRecord): ArtifactDisplay {
	return {
		id: record.id,
		name: record.name,
		artifactType: record.artifactType,
		placement: record.placement,
		config: record.config,
		visibility: record.visibility,
		discoveryRules: record.discoveryRules,
		revealAnimation: record.revealAnimation,
		container: record.container,
		positionX: record.positionX,
		positionY: record.positionY,
		zIndex: record.zIndex,
		fallbackZone: record.fallbackZone,
	};
}

/**
 * Evaluate discovery rules to determine if an artifact should be visible
 */
export function evaluateDiscoveryRules(
	rules: DiscoveryCondition[],
	context: {
		hour?: number;
		dayOfWeek?: number;
		season?: string;
		date?: string;
		isDarkMode?: boolean;
		scrollDepth?: number;
		pagesVisited?: number;
		timeOnSite?: number;
	},
): boolean {
	if (rules.length === 0) return true;

	// AND logic: all rules must pass
	return rules.every((rule) => {
		switch (rule.type) {
			case "time-of-day": {
				const [startStr, endStr] = String(rule.value).split("-");
				const start = parseInt(startStr, 10);
				const end = parseInt(endStr, 10);
				const hour = context.hour ?? new Date().getHours();
				if (start <= end) return hour >= start && hour < end;
				return hour >= start || hour < end; // overnight range
			}
			case "day-of-week": {
				const days = String(rule.value)
					.split(",")
					.map((d) => parseInt(d, 10));
				const dow = context.dayOfWeek ?? new Date().getDay();
				return days.includes(dow);
			}
			case "season":
				return context.season === String(rule.value);
			case "specific-date":
				return (context.date ?? new Date().toISOString().slice(5, 10)) === String(rule.value);
			case "dark-mode":
				return (context.isDarkMode ?? false) === (rule.value === "true");
			case "scroll-depth":
				return (context.scrollDepth ?? 0) >= Number(rule.value);
			case "pages-visited":
				return (context.pagesVisited ?? 1) >= Number(rule.value);
			case "time-on-site":
				return (context.timeOnSite ?? 0) >= Number(rule.value);
			case "random-chance":
				return Math.random() * 100 < Number(rule.value);
			default:
				return true;
		}
	});
}
