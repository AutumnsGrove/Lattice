/**
 * Reverie — Atmosphere Manifold
 *
 * The atmosphere of a grove touches every surface at once.
 * When it shifts, light, warmth, sound, and color all change together.
 *
 * Each entry maps an aesthetic keyword to coordinated settings across
 * multiple domains. "Make my site feel cozy" resolves to theme + accent +
 * font + cursor + ambient + guestbook + mood ring in one batch.
 *
 * Extend this file to add new atmospheres. Each entry is ~10 lines.
 * The full manifold stays small enough to load alongside the router.
 *
 * @see docs/specs/reverie-spec.md — "The Atmosphere Manifold" section
 */

import type { AtmosphereEntry } from "./types";

export const ATMOSPHERE_MANIFOLD: readonly AtmosphereEntry[] = [
	// ─────────────────────────────────────────────────────────────
	// Warm & Intimate
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "cozy",
		description: "Warm amber light, handwritten touches, rain on the roof. A reading nook.",
		aliases: ["comfy", "snug", "homey", "hygge"],
		settings: {
			"foliage.theme.themeId": "cozy-cabin",
			"foliage.accent.accentColor": "#d97706",
			"foliage.typography.fontFamily": "calistoga",
			"curios.cursor.preset": "leaf",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "sparkle",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "forest-rain",
			"curios.ambient.volume": 20,
			"curios.guestbook.style": "cozy",
			"curios.moodring.colorScheme": "warm",
		},
	},

	{
		keyword: "cottagecore",
		description: "Pink blossoms, handwritten notes, soft rain, dried flowers pressed in books.",
		aliases: ["cottage", "pastoral", "farmhouse"],
		settings: {
			"foliage.theme.themeId": "cozy-cabin",
			"foliage.accent.accentColor": "#f9a8d4",
			"foliage.typography.fontFamily": "caveat",
			"curios.cursor.preset": "leaf",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "petals",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "morning-birds",
			"curios.ambient.volume": 25,
			"curios.guestbook.style": "cozy",
			"curios.moodring.colorScheme": "warm",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Dark & Mysterious
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "midnight",
		description: "Deep plum shadows, monospace precision, crickets in the dark. A library after hours.",
		aliases: ["night", "nocturnal", "after-dark", "late-night"],
		settings: {
			"foliage.theme.themeId": "night-garden",
			"foliage.accent.accentColor": "#581c87",
			"foliage.typography.fontFamily": "ibm-plex-mono",
			"curios.cursor.preset": "star",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "stardust",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "night-crickets",
			"curios.ambient.volume": 15,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "cool",
		},
	},

	{
		keyword: "gothic",
		description: "Candlelight, ornate frames, thunderstorms in the distance. Dark academia.",
		aliases: ["dark-academia", "vampire", "spooky"],
		settings: {
			"foliage.theme.themeId": "night-garden",
			"foliage.accent.accentColor": "#dc2626",
			"foliage.typography.fontFamily": "calistoga",
			"curios.cursor.preset": "star",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "glow",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "thunderstorm",
			"curios.ambient.volume": 20,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "cool",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Nature & Green
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "garden",
		description: "Meadow greens, rounded fonts, gentle breeze. A well-tended garden path.",
		aliases: ["nature", "botanical", "greenhouse"],
		settings: {
			"foliage.theme.themeId": "grove",
			"foliage.accent.accentColor": "#16a34a",
			"foliage.typography.fontFamily": "quicksand",
			"curios.cursor.preset": "leaf",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "classic",
			"curios.moodring.colorScheme": "forest",
		},
	},

	{
		keyword: "forest",
		description: "Deep greens, soft rain, moss and lichen. Walking through old growth.",
		aliases: ["woodland", "sylvan", "deep-woods"],
		settings: {
			"foliage.theme.themeId": "grove",
			"foliage.accent.accentColor": "#22c55e",
			"foliage.typography.fontFamily": "lexend",
			"curios.cursor.preset": "leaf",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "fireflies",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "forest-rain",
			"curios.ambient.volume": 15,
			"curios.guestbook.style": "classic",
			"curios.moodring.colorScheme": "forest",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Clean & Minimal
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "elegant",
		description: "Lavender accents, contemporary type, no clutter. A curated gallery.",
		aliases: ["refined", "sophisticated", "polished"],
		settings: {
			"foliage.theme.themeId": "minimal",
			"foliage.accent.accentColor": "#a78bfa",
			"foliage.typography.fontFamily": "plus-jakarta-sans",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "cool",
		},
	},

	{
		keyword: "professional",
		description: "Ocean blue, clean sans-serif, structured. A portfolio that means business.",
		aliases: ["corporate", "business", "portfolio"],
		settings: {
			"foliage.theme.themeId": "minimal",
			"foliage.accent.accentColor": "#0284c7",
			"foliage.typography.fontFamily": "plus-jakarta-sans",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "cool",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Retro & Indie
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "retro",
		description: "Monospace bitmap font, pixel art badges, web 1.0 energy. GeoCities spirit.",
		aliases: ["vintage", "old-web", "90s", "geocities", "neocities"],
		settings: {
			"foliage.theme.themeId": "typewriter",
			"foliage.accent.accentColor": "#dc2626",
			"foliage.typography.fontFamily": "cozette",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "pixel",
			"curios.moodring.colorScheme": "default",
		},
	},

	{
		keyword: "hacker",
		description: "Green on black, monospace everything, terminal cursor. The matrix garden.",
		aliases: ["terminal", "matrix", "cyberpunk", "dev"],
		settings: {
			"foliage.theme.themeId": "terminal",
			"foliage.accent.accentColor": "#16a34a",
			"foliage.typography.fontFamily": "ibm-plex-mono",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "pixel",
			"curios.moodring.colorScheme": "cool",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Dreamy & Ethereal
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "dreamy",
		description: "Violet purple, handwritten script, ocean waves, soft glow. Half asleep, half creating.",
		aliases: ["ethereal", "whimsical", "fairy", "magical"],
		settings: {
			"foliage.theme.themeId": "solarpunk",
			"foliage.accent.accentColor": "#8b5cf6",
			"foliage.typography.fontFamily": "caveat",
			"curios.cursor.preset": "sparkle",
			"curios.cursor.trailEnabled": true,
			"curios.cursor.trailEffect": "glow",
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "ocean-waves",
			"curios.ambient.volume": 15,
			"curios.guestbook.style": "cozy",
			"curios.moodring.colorScheme": "sunset",
		},
	},

	// ─────────────────────────────────────────────────────────────
	// Bright & Warm
	// ─────────────────────────────────────────────────────────────

	{
		keyword: "solarpunk",
		description: "Meadow green, optimistic sans-serif, bright light. Building something better.",
		aliases: ["hopepunk", "optimistic", "bright", "utopian"],
		settings: {
			"foliage.theme.themeId": "solarpunk",
			"foliage.accent.accentColor": "#22c55e",
			"foliage.typography.fontFamily": "plus-jakarta-sans",
			"curios.cursor.preset": "leaf",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "forest",
		},
	},

	{
		keyword: "sunset",
		description: "Ember orange, warm serif, golden hour. The grove at dusk.",
		aliases: ["golden-hour", "dusk", "twilight", "warm"],
		settings: {
			"foliage.theme.themeId": "grove",
			"foliage.accent.accentColor": "#c2410c",
			"foliage.typography.fontFamily": "calistoga",
			"curios.cursor.trailEnabled": false,
			"curios.guestbook.style": "classic",
			"curios.moodring.colorScheme": "warm",
		},
	},

	{
		keyword: "ocean",
		description: "Blue depths, clean lines, wave sounds. Calm and vast.",
		aliases: ["sea", "marine", "aquatic", "coastal"],
		settings: {
			"foliage.theme.themeId": "minimal",
			"foliage.accent.accentColor": "#0284c7",
			"foliage.typography.fontFamily": "quicksand",
			"curios.cursor.trailEnabled": false,
			"curios.ambient.enabled": true,
			"curios.ambient.soundSet": "ocean-waves",
			"curios.ambient.volume": 20,
			"curios.guestbook.style": "modern",
			"curios.moodring.colorScheme": "cool",
		},
	},
] as const;

/**
 * Lookup an atmosphere entry by keyword or alias.
 * Returns undefined if no match found.
 */
export function findAtmosphere(keyword: string): AtmosphereEntry | undefined {
	const normalized = keyword.toLowerCase().trim();
	return ATMOSPHERE_MANIFOLD.find(
		(entry) => entry.keyword === normalized || entry.aliases.includes(normalized),
	);
}

/** All atmosphere keywords and aliases, flattened for router detection */
export const ALL_ATMOSPHERE_KEYWORDS: readonly string[] = ATMOSPHERE_MANIFOLD.flatMap((entry) => [
	entry.keyword,
	...entry.aliases,
]);
