// src/lib/themes/moodboard.ts
// Moodboard theme - Pinterest-style masonry

import type { Theme } from "../types.js";
import { generateGlass } from "../utils/glass.js";

// Moodboard uses neutral grays with a pop of rose for accent
const palette = {
	background: "#f5f5f5", // Light gray background
	surface: "#ffffff", // White surface
	foreground: "#333333", // Dark gray text
	foregroundMuted: "#666666", // Medium gray for muted text (meets 4.5:1 contrast)
	accent: "#e11d48", // Rose accent
	border: "#e0e0e0", // Light gray border
} as const;

export const moodboard: Theme = {
	id: "moodboard",
	name: "Moodboard",
	description: "Pinterest-style layout — curate your visual world",
	thumbnail: "/themes/moodboard-thumb.png",
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
		heading: "Cormorant, Georgia, serif",
		body: "Instrument Sans, system-ui, sans-serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "masonry",
		maxWidth: "1600px",
		spacing: "compact",
	},

	glass: generateGlass({
		lightSurface: palette.surface,
		darkSurface: "#1f1f1f",
		accent: palette.accent,
		lightBorder: palette.border,
		darkBorder: "#404040",
	}),

	seasonalAffinity: "all",
};
