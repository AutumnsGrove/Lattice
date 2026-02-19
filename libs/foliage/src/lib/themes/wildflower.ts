// src/lib/themes/wildflower.ts
// Wildflower theme - Colorful, playful

import type { Theme } from "../types.js";
import { generateGlass } from "../utils/glass.js";

// Wildflower uses vibrant purples and pinks for a playful aesthetic
const palette = {
	background: "#fef7ff", // Very light purple tint
	surface: "#ffffff", // White surface
	foreground: "#581c87", // Deep purple text
	foregroundMuted: "#6d28d9", // Medium purple for muted (meets 4.5:1 contrast)
	accent: "#ec4899", // Pink accent
	border: "#f5d0fe", // Light purple border
} as const;

export const wildflower: Theme = {
	id: "wildflower",
	name: "Wildflower",
	description: "Colorful and playful — bloom in your own way",
	thumbnail: "/themes/wildflower-thumb.png",
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
		heading: "Fraunces, Georgia, serif",
		body: "Nunito, system-ui, sans-serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "sidebar",
		maxWidth: "1200px",
		spacing: "comfortable",
	},

	glass: generateGlass({
		lightSurface: palette.surface,
		darkSurface: "#2e1065", // purple-950
		accent: palette.accent,
		lightBorder: palette.border,
		darkBorder: "#581c87",
	}),

	seasonalAffinity: "spring",
};
