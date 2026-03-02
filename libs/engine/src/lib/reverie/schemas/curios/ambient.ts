import type { DomainSchema } from "../../types";

/**
 * Ambient Sounds — background audio for your grove.
 * Rain on leaves. Night crickets. Ocean waves.
 */
export const ambientSchema: DomainSchema = {
	id: "curios.ambient",
	name: "Ambient Sounds",
	description:
		"Background audio that plays when visitors arrive. Autoplay with user consent, respects system volume.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/ambient",
	writeEndpoint: "PUT /api/curios/ambient",
	writeMethod: "PUT",
	fields: {
		enabled: {
			type: "boolean",
			description: "Enable ambient sounds on your grove",
			default: false,
		},
		soundSet: {
			type: "enum",
			description: "Pre-made ambient sound loop",
			options: [
				"forest-rain",
				"night-crickets",
				"ocean-waves",
				"morning-birds",
				"fireplace",
				"wind-chimes",
				"thunderstorm",
				"stream",
			],
			default: "forest-rain",
		},
		volume: {
			type: "integer",
			description: "Default playback volume (0-100)",
			default: 30,
			constraints: {
				min: 0,
				max: 100,
			},
		},
		customUrl: {
			type: "url",
			description: "URL to a custom audio loop (MP3/OGG, max 5MB)",
		},
	},
	examples: [
		"Play forest rain sounds on my site",
		"Set the volume to 20%",
		"Turn off ambient sounds",
		"Use ocean waves instead",
		"Add a fireplace sound",
	],
	keywords: ["ambient", "sound", "audio", "rain", "music", "background sound", "noise"],
};
