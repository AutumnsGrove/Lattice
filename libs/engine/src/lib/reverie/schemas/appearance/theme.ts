import type { DomainSchema } from "../../types";

/**
 * Foliage Theme — the soul of your site's look.
 * Selects the base theme, optional community theme, and customizer toggle.
 */
export const themeSchema: DomainSchema = {
	id: "foliage.theme",
	name: "Theme Selection",
	description:
		"The base visual theme for your grove. Themes control layout, color scheme, and overall aesthetic.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/theme",
	writeEndpoint: "PUT /api/admin/theme",
	writeMethod: "PUT",
	fields: {
		themeId: {
			type: "enum",
			description: "The active theme from the curated catalog",
			options: [
				"grove",
				"minimal",
				"night-garden",
				"zine",
				"moodboard",
				"typewriter",
				"solarpunk",
				"cozy-cabin",
				"terminal",
				"letterpress",
			],
			default: "grove",
		},
		communityThemeId: {
			type: "string",
			description: "Optional community theme override (Oak+ tier)",
		},
		customizerEnabled: {
			type: "boolean",
			description: "Enable the theme customizer for advanced overrides (Oak+ tier)",
			default: false,
		},
	},
	examples: [
		"Switch to a dark theme",
		"Use the typewriter theme",
		"I want something minimal and clean",
		"Change to the cozy cabin theme",
		"Try the solarpunk look",
		"Go back to the default grove theme",
	],
	keywords: ["theme", "dark mode", "light mode", "layout", "look", "aesthetic"],
};

/**
 * Theme mood mapping. Resolves feeling-words to theme IDs.
 * "dark" -> "night-garden", "retro" -> "typewriter", etc.
 */
export const THEME_MOODS: Record<string, string> = {
	dark: "night-garden",
	night: "night-garden",
	midnight: "night-garden",
	gothic: "night-garden",
	cozy: "cozy-cabin",
	warm: "cozy-cabin",
	cabin: "cozy-cabin",
	cottagecore: "cozy-cabin",
	minimal: "minimal",
	clean: "minimal",
	simple: "minimal",
	elegant: "minimal",
	retro: "typewriter",
	vintage: "typewriter",
	paper: "typewriter",
	classic: "typewriter",
	bold: "zine",
	magazine: "zine",
	editorial: "zine",
	"pinterest": "moodboard",
	visual: "moodboard",
	collage: "moodboard",
	hacker: "terminal",
	code: "terminal",
	matrix: "terminal",
	solarpunk: "solarpunk",
	bright: "solarpunk",
	optimistic: "solarpunk",
	earthy: "grove",
	nature: "grove",
	garden: "grove",
	forest: "grove",
	default: "grove",
};
