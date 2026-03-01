import type { DomainSchema } from "../../types";

/**
 * Mood Ring — a mystical artifact that shifts color
 * with your mood, the time of day, or the season.
 */
export const moodringSchema: DomainSchema = {
	id: "curios.moodring",
	name: "Mood Ring",
	description:
		"A color-shifting indicator that reflects mood, time, or season. Configurable display shape and color scheme.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/moodring",
	writeEndpoint: "PUT /api/curios/moodring",
	writeMethod: "PUT",
	fields: {
		mode: {
			type: "enum",
			description: "What drives the color changes",
			options: ["time", "manual", "seasonal", "random"],
			default: "time",
		},
		manualMood: {
			type: "string",
			description: "Current mood label (when mode is manual)",
			constraints: { maxLength: 50 },
		},
		manualColor: {
			type: "color",
			description: "Custom color override (when mode is manual)",
		},
		colorScheme: {
			type: "enum",
			description: "Pre-built color palette for the ring",
			options: ["default", "warm", "cool", "forest", "sunset"],
			default: "default",
		},
		displayStyle: {
			type: "enum",
			description: "Visual shape of the mood indicator",
			options: ["ring", "gem", "orb", "crystal", "flame", "leaf", "moon"],
			default: "ring",
		},
		showMoodLog: {
			type: "boolean",
			description: "Display a history of past mood entries",
			default: false,
		},
	},
	examples: [
		"Set my mood ring to show the time of day",
		"I'm feeling contemplative, set it to deep blue",
		"Use the forest color scheme",
		"Show it as a crystal instead of a ring",
		"Turn on the mood log",
	],
	keywords: ["mood", "mood ring", "feeling", "emotion", "vibe indicator"],
};
