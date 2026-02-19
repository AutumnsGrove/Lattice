// src/lib/themes/minimal.ts
// Minimal theme - Clean, typography-focused

import type { Theme } from "../types.js";
import { bark } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

// Minimal uses a monochromatic palette with warm bark undertones
// for text to avoid the harshness of pure black on white
const neutrals = {
	white: "#ffffff",
	offWhite: "#fafafa",
	nearBlack: bark[950], // #2a1b0d - warmer than pure black
	darkGray: bark[700], // #6f4d39 - muted text
	lightGray: "#eeeeee",
} as const;

export const minimal: Theme = {
	id: "minimal",
	name: "Minimal",
	description: "Clean and typography-focused — let your words shine",
	thumbnail: "/themes/minimal-thumb.png",
	tier: "seedling",

	colors: {
		background: neutrals.white,
		surface: neutrals.offWhite,
		foreground: neutrals.nearBlack,
		foregroundMuted: neutrals.darkGray,
		accent: neutrals.nearBlack, // Links and accents match text for minimal look
		border: neutrals.lightGray,
	},

	fonts: {
		heading: "Instrument Sans, system-ui, sans-serif",
		body: "Merriweather, Georgia, serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "no-sidebar",
		maxWidth: "680px",
		spacing: "spacious",
	},

	glass: generateGlass({
		lightSurface: neutrals.offWhite,
		darkSurface: "#1a1a1a",
		accent: neutrals.nearBlack,
		lightBorder: neutrals.lightGray,
		darkBorder: "#333333",
	}),

	seasonalAffinity: "all",
};
