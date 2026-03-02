import type { DomainSchema } from "../../types";

/**
 * Typography & Fonts — how words feel on the page.
 * Controls the site-wide font, per-post overrides, and custom typography JSON.
 */
export const typographySchema: DomainSchema = {
	id: "foliage.typography",
	name: "Typography & Fonts",
	description:
		"The site-wide font selection and per-post font overrides. Also controls custom typography JSON for advanced users.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/settings?key=font_family",
	writeEndpoint: "PUT /api/admin/settings",
	writeMethod: "PUT",
	fields: {
		fontFamily: {
			type: "font",
			description: "Site-wide font selection",
			default: "lexend",
			options: [
				"lexend",
				"atkinson",
				"opendyslexic",
				"quicksand",
				"plus-jakarta-sans",
				"ibm-plex-mono",
				"cozette",
				"alagard",
				"calistoga",
				"caveat",
			],
		},
		customTypography: {
			type: "json",
			description: "Advanced typography overrides (font sizes, weights, line heights)",
			constraints: {
				maxLength: 5000,
			},
		},
	},
	examples: [
		"Change my font to something handwritten",
		"Use a monospace font for a hacker vibe",
		"I want something more readable for dyslexic readers",
		"Make my headlines feel medieval",
		"Use a clean modern font",
	],
	keywords: ["font", "typography", "typeface", "handwritten", "monospace", "readable"],
};

/**
 * Font mood mapping. Reverie resolves feeling-words to font IDs.
 * "handwritten" -> "caveat", "accessible" -> "atkinson", etc.
 */
export const FONT_MOODS: Record<string, string> = {
	// Vibes
	handwritten: "caveat",
	personal: "caveat",
	informal: "caveat",
	script: "caveat",
	cozy: "calistoga",
	friendly: "calistoga",
	warm: "calistoga",
	brush: "calistoga",
	modern: "plus-jakarta-sans",
	clean: "plus-jakarta-sans",
	professional: "plus-jakarta-sans",
	contemporary: "plus-jakarta-sans",
	light: "quicksand",
	rounded: "quicksand",
	soft: "quicksand",
	playful: "quicksand",
	hacker: "ibm-plex-mono",
	code: "ibm-plex-mono",
	terminal: "ibm-plex-mono",
	developer: "ibm-plex-mono",
	retro: "cozette",
	pixel: "cozette",
	"8bit": "cozette",
	bitmap: "cozette",
	fantasy: "alagard",
	medieval: "alagard",
	rpg: "alagard",
	gaming: "alagard",
	// Accessibility
	accessible: "atkinson",
	dyslexic: "opendyslexic",
	"low vision": "atkinson",
	readable: "atkinson",
	clear: "atkinson",
};
