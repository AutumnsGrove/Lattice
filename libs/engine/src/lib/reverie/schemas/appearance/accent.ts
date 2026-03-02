import type { DomainSchema } from "../../types";

/**
 * Accent Color — the single most impactful visual choice.
 * One hex value that colors links, buttons, and interactive elements.
 */
export const accentSchema: DomainSchema = {
	id: "foliage.accent",
	name: "Accent Color",
	description:
		"The primary accent color used across links, buttons, hover states, and interactive elements.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/settings?key=accent_color",
	writeEndpoint: "PUT /api/admin/settings",
	writeMethod: "PUT",
	fields: {
		accentColor: {
			type: "color",
			description: "Hex color value for the site accent",
			default: "#16a34a",
			constraints: {
				pattern: "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
			},
		},
	},
	examples: [
		"Change my accent color to lavender",
		"Make my links purple",
		"Use a warm amber color",
		"Set my accent to deep plum",
		"I want sunset orange for my buttons",
	],
	keywords: ["color", "accent", "tint", "links", "buttons"],
};

/**
 * Named color presets that Reverie can resolve from natural language.
 * "lavender" -> "#a78bfa", "sunset" -> "#c2410c", etc.
 */
export const ACCENT_PRESETS: Record<string, string> = {
	"grove green": "#16a34a",
	"meadow green": "#22c55e",
	"ocean blue": "#0284c7",
	"deep plum": "#581c87",
	"violet purple": "#8b5cf6",
	lavender: "#a78bfa",
	"cherry blossom": "#ec4899",
	"tulip pink": "#f9a8d4",
	"sunset ember": "#c2410c",
	"golden amber": "#d97706",
	"autumn gold": "#eab308",
	"cardinal red": "#dc2626",
	// Shorthand aliases
	green: "#16a34a",
	blue: "#0284c7",
	purple: "#8b5cf6",
	pink: "#ec4899",
	red: "#dc2626",
	amber: "#d97706",
	gold: "#eab308",
	plum: "#581c87",
	sunset: "#c2410c",
	orange: "#c2410c",
};
