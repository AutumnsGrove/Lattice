// src/lib/themes/typewriter.ts
// Typewriter theme - Retro, monospace, paper

import type { Theme } from "../types.js";
import { bark, cream } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

export const typewriter: Theme = {
	id: "typewriter",
	name: "Typewriter",
	description: "Retro and monospace — like typing on paper",
	thumbnail: "/themes/typewriter-thumb.png",
	tier: "sapling",

	colors: {
		background: cream[300],
		surface: cream[200],
		foreground: bark[950],
		foregroundMuted: bark[700],
		accent: bark[600],
		border: cream[500],
	},

	fonts: {
		heading: "IBM Plex Mono, Courier New, monospace",
		body: "IBM Plex Mono, Courier New, monospace",
		mono: "IBM Plex Mono, Courier New, monospace",
	},

	layout: {
		type: "centered",
		maxWidth: "600px",
		spacing: "spacious",
	},

	glass: generateGlass({
		lightSurface: cream[200],
		darkSurface: bark[900],
		accent: bark[600],
		lightBorder: cream[500],
		darkBorder: bark[700],
	}),

	seasonalAffinity: "autumn",
};
