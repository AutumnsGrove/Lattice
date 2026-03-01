import type { DomainSchema } from "../../types";

/**
 * Cursor & Trails — the tiniest personal touch.
 * Your mouse cursor, your trail of sparkles.
 */
export const cursorSchema: DomainSchema = {
	id: "curios.cursor",
	name: "Cursor & Trails",
	description:
		"Custom cursor presets and mouse trail effects. Small touches that make a grove feel alive.",
	group: "curios",
	database: "curios",
	readEndpoint: "GET /api/curios/cursor",
	writeEndpoint: "PUT /api/curios/cursor",
	writeMethod: "PUT",
	fields: {
		cursorType: {
			type: "enum",
			description: "How the cursor is sourced",
			options: ["preset", "custom"],
			default: "preset",
		},
		preset: {
			type: "enum",
			description: "Built-in cursor design",
			options: ["leaf", "star", "sparkle", "feather", "acorn", "mushroom"],
			default: "leaf",
		},
		customUrl: {
			type: "url",
			description: "URL to a custom cursor image (32x32 recommended)",
		},
		trailEnabled: {
			type: "boolean",
			description: "Enable particle trail behind the cursor",
			default: false,
		},
		trailEffect: {
			type: "enum",
			description: "Trail particle style",
			options: ["sparkle", "stardust", "glow", "petals", "fireflies"],
			default: "sparkle",
		},
		trailLength: {
			type: "integer",
			description: "Number of trail particles",
			default: 8,
			constraints: {
				min: 1,
				max: 20,
			},
		},
	},
	examples: [
		"Give me a leaf cursor",
		"I want sparkle trails when I move my mouse",
		"Use a star cursor with stardust trail",
		"Turn off cursor effects",
		"Make my cursor a mushroom",
	],
	keywords: ["cursor", "mouse", "trail", "sparkle", "pointer"],
};
