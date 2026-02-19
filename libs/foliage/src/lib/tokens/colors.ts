/**
 * Foliage Design System - Color Tokens
 *
 * All color values for the Foliage design system.
 * Adapted from Grove Design System.
 */

export const grove = {
	50: "#f0fdf4",
	100: "#dcfce7",
	200: "#bbf7d0",
	300: "#86efac",
	400: "#4ade80",
	500: "#22c55e",
	600: "#16a34a", // PRIMARY
	700: "#15803d",
	800: "#166534",
	900: "#14532d",
	950: "#052e16",
} as const;

export const cream = {
	DEFAULT: "#fefdfb",
	50: "#fefdfb",
	100: "#fdfcf8",
	200: "#faf8f3",
	300: "#f5f2ea",
	400: "#ede9de",
	500: "#e2ddd0",
} as const;

export const bark = {
	DEFAULT: "#3d2914",
	50: "#f9f6f3",
	100: "#f0e9e1",
	200: "#e0d2c2",
	300: "#ccb59c",
	400: "#b69575",
	500: "#a57c5a",
	600: "#8a6347",
	700: "#6f4d39",
	800: "#5a3f30",
	900: "#3d2914", // PRIMARY
	950: "#2a1b0d",
} as const;

export const semantic = {
	primary: {
		DEFAULT: grove[600],
		foreground: "#ffffff",
		hover: grove[700],
		active: grove[800],
	},
	secondary: {
		DEFAULT: cream[500],
		foreground: bark.DEFAULT,
		hover: cream[400],
		active: cream[300],
	},
	background: cream.DEFAULT,
	foreground: bark.DEFAULT,
	muted: {
		DEFAULT: cream[300],
		foreground: bark[700],
	},
	accent: {
		DEFAULT: grove[100],
		foreground: grove[800],
	},
	border: cream[200],
	input: cream[200],
	ring: grove[500],
} as const;

export const status = {
	success: {
		DEFAULT: grove[500],
		light: grove[100],
		foreground: grove[800],
	},
	warning: {
		DEFAULT: "#f59e0b",
		light: "#fef3c7",
		foreground: "#92400e",
	},
	error: {
		DEFAULT: "#dc2626",
		light: "#fee2e2",
		foreground: "#991b1b",
	},
	info: {
		DEFAULT: "#0ea5e9",
		light: "#e0f2fe",
		foreground: "#075985",
	},
} as const;

export const colors = {
	grove,
	cream,
	bark,
	semantic,
	status,
} as const;

export type GroveColor = typeof grove;
export type CreamColor = typeof cream;
export type BarkColor = typeof bark;
export type SemanticColor = typeof semantic;
export type StatusColor = typeof status;
export type Colors = typeof colors;
