// src/lib/themes/night-garden.ts
// Night Garden theme - Midnight Bloom dark mode
// Uses GroveEngine's canonical Midnight Bloom palette

import type { Theme } from "../types.js";
import { MIDNIGHT_BLOOM, generateMidnightBloomGlass } from "../utils/glass.js";

export const nightGarden: Theme = {
	id: "night-garden",
	name: "Night Garden",
	description: "Midnight Bloom — intimate evening atmosphere with deep purples",
	thumbnail: "/themes/night-garden-thumb.png",
	tier: "seedling",

	colors: {
		background: MIDNIGHT_BLOOM.background,
		surface: MIDNIGHT_BLOOM.surface,
		foreground: MIDNIGHT_BLOOM.foreground,
		foregroundMuted: MIDNIGHT_BLOOM.foregroundMuted,
		accent: MIDNIGHT_BLOOM.accent,
		border: MIDNIGHT_BLOOM.border,
	},

	fonts: {
		heading: "Manrope, system-ui, sans-serif",
		body: "Manrope, system-ui, sans-serif",
		mono: "IBM Plex Mono, ui-monospace, monospace",
	},

	layout: {
		type: "sidebar",
		maxWidth: "1200px",
		spacing: "comfortable",
	},

	glass: generateMidnightBloomGlass(),

	seasonalAffinity: "winter",
};
