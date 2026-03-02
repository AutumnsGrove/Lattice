import type { DomainSchema } from "../../types";

/**
 * Custom Color Palette — beyond the accent, a full color vocabulary.
 * Deep configuration through JSON, for Wanderers who want fine control.
 */
export const colorsSchema: DomainSchema = {
	id: "foliage.colors",
	name: "Custom Color Palette",
	description:
		"A custom color palette that overrides theme defaults. Controls background, surface, text, and border colors.",
	group: "appearance",
	database: "engine",
	readEndpoint: "GET /api/admin/theme",
	writeEndpoint: "PUT /api/admin/theme",
	writeMethod: "PUT",
	fields: {
		customColors: {
			type: "json",
			description:
				"JSON object with color overrides. Keys: background, surface, text, textMuted, border, borderMuted.",
			constraints: {
				maxLength: 2000,
			},
		},
	},
	examples: [
		"I want a warm color palette, ambers and golds",
		"Make the background slightly pink-tinted",
		"Use forest greens throughout",
		"Give me a dark background with warm text",
		"Reset my custom colors to theme defaults",
	],
	keywords: ["color palette", "colors", "background color", "custom colors", "surface"],
};
