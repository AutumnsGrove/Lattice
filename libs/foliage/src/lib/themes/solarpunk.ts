// src/lib/themes/solarpunk.ts
// Solarpunk theme - Bright, optimistic

import type { Theme } from "../types.js";
import { grove } from "../tokens/colors.js";
import { generateGlass } from "../utils/glass.js";

// Solarpunk builds on bright greens and sunny yellows
// for a hopeful, future-focused aesthetic
const palette = {
	background: "#f0fdf4", // Very light green tint
	surface: "#ffffff", // White surface
	foreground: grove[800], // #166534 - Dark green text
	foregroundMuted: grove[700], // #15803d - Darker green for muted (meets 4.5:1 contrast)
	accent: "#fbbf24", // Sunny yellow accent
	border: "#bbf7d0", // Light green border
} as const;

export const solarpunk: Theme = {
	id: "solarpunk",
	name: "Solarpunk",
	description: "Bright and optimistic — a hopeful future",
	thumbnail: "/themes/solarpunk-thumb.png",
	tier: "sapling",

	colors: {
		background: palette.background,
		surface: palette.surface,
		foreground: palette.foreground,
		foregroundMuted: palette.foregroundMuted,
		accent: palette.accent,
		border: palette.border,
	},

	fonts: {
		heading: "Quicksand, system-ui, sans-serif",
		body: "Quicksand, system-ui, sans-serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "full-width",
		maxWidth: "100%",
		spacing: "comfortable",
	},

	glass: generateGlass({
		lightSurface: palette.surface,
		darkSurface: grove[900],
		accent: palette.accent,
		lightBorder: palette.border,
		darkBorder: grove[700],
	}),

	seasonalAffinity: "summer",
};
