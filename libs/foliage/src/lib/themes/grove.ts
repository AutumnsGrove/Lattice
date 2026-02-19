// src/lib/themes/grove.ts
// Grove theme - Warm, earthy, cozy (Default theme)

import type { Theme } from "../types.js";
import { grove as groveColors, bark, cream, semantic } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

export const grove: Theme = {
	id: "grove",
	name: "Grove",
	description: "Warm, earthy, and cozy — the default Grove experience",
	thumbnail: "/themes/grove-thumb.png",
	tier: "seedling",

	colors: {
		background: semantic.background,
		surface: cream[50],
		foreground: semantic.foreground,
		foregroundMuted: bark[700],
		accent: groveColors[600],
		border: semantic.border,
	},

	fonts: {
		heading: "system-ui, sans-serif",
		body: "system-ui, sans-serif",
		mono: "ui-monospace, monospace",
	},

	layout: {
		type: "sidebar",
		maxWidth: "1200px",
		spacing: "comfortable",
	},

	glass: generateGlass({
		lightSurface: cream[50],
		darkSurface: bark[900],
		accent: groveColors[600],
		lightBorder: cream[200],
		darkBorder: bark[700],
	}),

	seasonalAffinity: "all",
};
