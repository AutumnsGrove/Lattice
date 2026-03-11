/**
 * Dark mode color tokens
 *
 * The Grove at night — warm bark-tinted darks, never cold gray.
 * Firelight, not fluorescent. Cozy, not corporate.
 *
 * Cream inverts to warm dark browns (the wood grain of the grove at night).
 * Bark inverts to light cream tones (text that glows against darkness).
 * Grove greens stay consistent across modes — the forest is always green.
 */

/**
 * Dark cream scale — warm brown backgrounds.
 * These replace the light cream palette in dark mode, giving
 * the grove its distinctive warm-night character.
 */
export const darkCream = {
	DEFAULT: "#1a1612",
	50: "#1a1612",
	100: "#211c17",
	200: "#2a241e",
	300: "#383028",
	400: "#4a4036",
	500: "#635649",
} as const;

/**
 * Dark bark scale — inverted for dark-on-light readability.
 * Light cream-brown text that reads naturally against dark backgrounds.
 * This is the light bark scale in reverse order.
 */
export const darkBark = {
	DEFAULT: "#f5f2ea",
	50: "#2a1b0d",
	100: "#3d2914",
	200: "#5a3f30",
	300: "#6f4d39",
	400: "#8a6347",
	500: "#a57c5a",
	600: "#b69575",
	700: "#ccb59c",
	800: "#e0d2c2",
	900: "#f0e9e1",
	950: "#f9f6f3",
} as const;

/**
 * Dark semantic colors — role-based colors for dark mode.
 * Uses the same grove greens for accent (always green),
 * but shifts backgrounds and borders for dark contrast.
 */
export const darkSemantic = {
	background: darkCream.DEFAULT,
	foreground: darkBark.DEFAULT,
	muted: {
		DEFAULT: darkCream[300],
		foreground: darkBark[700],
	},
	accent: {
		DEFAULT: "#052e16", // grove-950 — deep green on dark
		foreground: "#bbf7d0", // grove-200 — light green text
	},
	border: darkCream[200],
	input: darkCream[200],
} as const;

/**
 * Dark status colors — muted backgrounds, readable text.
 * Backgrounds are deep-tinted to avoid blinding pops of color.
 */
export const darkStatus = {
	success: {
		DEFAULT: "#4ade80", // grove-400 (brighter for dark bg)
		light: "#052e16", // grove-950 (deep green bg)
		foreground: "#dcfce7", // grove-100 (light green text)
	},
	warning: {
		DEFAULT: "#f59e0b", // same amber
		light: "#422006", // deep amber bg
		foreground: "#fef3c7", // light amber text
	},
	error: {
		DEFAULT: "#f87171", // red-400 (brighter for dark bg)
		light: "#450a0a", // deep red bg
		foreground: "#fecaca", // light red text
	},
	info: {
		DEFAULT: "#38bdf8", // sky-400 (brighter for dark bg)
		light: "#0c4a6e", // deep blue bg
		foreground: "#e0f2fe", // light blue text
	},
} as const;

export type DarkCreamColor = typeof darkCream;
export type DarkBarkColor = typeof darkBark;
export type DarkSemanticColor = typeof darkSemantic;
export type DarkStatusColor = typeof darkStatus;
