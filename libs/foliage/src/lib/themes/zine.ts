// src/lib/themes/zine.ts
// Zine theme - Bold, magazine-style

import type { Theme } from "../types.js";
import { bark, cream } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

export const zine: Theme = {
	id: "zine",
	name: "Zine",
	description: "Bold and magazine-style — make a statement",
	thumbnail: "/themes/zine-thumb.png",
	tier: "sapling",

	colors: {
		background: cream[100],
		surface: "#ffffff",
		foreground: bark[950],
		foregroundMuted: bark[700],
		accent: "#ff3366",
		border: bark[950],
	},

	fonts: {
		heading: "Bodoni Moda, Impact, serif",
		body: "Plus Jakarta Sans, system-ui, sans-serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "grid",
		maxWidth: "1400px",
		spacing: "compact",
	},

	glass: generateGlass({
		lightSurface: "#ffffff",
		darkSurface: bark[950],
		accent: "#ff3366",
		lightBorder: bark[950],
		darkBorder: bark[700],
	}),

	seasonalAffinity: "all",
};
