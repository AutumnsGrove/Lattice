/**
 * HSL Semantic Tokens
 *
 * These define the HSL values used by the Tailwind preset's
 * hsl(var(--token)) pattern. Every token has both a light and dark value.
 *
 * Format: "H S% L%" — no commas, matching CSS hsl() modern syntax.
 * These are written into CSS custom properties by grove-tokens.css.
 *
 * This is the canonical source for all semantic color decisions:
 * what "surface" means in light mode vs dark mode, what "accent-foreground"
 * looks like at night, etc. If you need to change a semantic color,
 * change it HERE and everything downstream follows.
 */

export interface HSLTokenSet {
	light: string;
	dark: string;
}

/**
 * Surface tokens — background layers with depth hierarchy.
 */
export const surface: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "0 0% 100%", dark: "25 18% 10%" },
	hover: { light: "30 10% 96%", dark: "25 15% 13%" },
	elevated: { light: "0 0% 100%", dark: "25 18% 12%" },
	subtle: { light: "30 15% 97%", dark: "25 18% 14%" },
	alt: { light: "30 10% 95%", dark: "25 15% 12%" },
};

/**
 * Card & popover tokens — shadcn-compatible semantic surfaces.
 */
export const card: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "0 0% 100%", dark: "25 18% 12%" },
	foreground: { light: "25 30% 15%", dark: "40 20% 94%" },
};

export const popover: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "0 0% 100%", dark: "25 18% 12%" },
	foreground: { light: "25 30% 15%", dark: "40 20% 94%" },
};

/**
 * Accent tokens — grove green variants for both modes.
 */
export const accent: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "142 76% 93%", dark: "142 40% 30%" },
	foreground: { light: "142 50% 22%", dark: "142 60% 75%" },
	muted: { light: "121 37% 32%", dark: "142 50% 55%" },
	subtle: { light: "142 40% 92%", dark: "142 30% 16%" },
};

/**
 * Foreground tokens — text hierarchy.
 */
export const foreground: Record<string, HSLTokenSet> = {
	faint: { light: "25 15% 62%", dark: "30 20% 60%" },
};

/**
 * Status tokens — warning, success, info, error.
 */
export const warning: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "38 92% 50%", dark: "38 92% 50%" },
	foreground: { light: "38 92% 20%", dark: "40 80% 90%" },
	bg: { light: "48 96% 95%", dark: "35 60% 14%" },
	muted: { light: "45 93% 47%", dark: "45 80% 55%" },
};

export const success: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "160 84% 39%", dark: "152 60% 42%" },
	foreground: { light: "160 84% 15%", dark: "152 50% 90%" },
	bg: { light: "152 76% 95%", dark: "152 40% 13%" },
	muted: { light: "160 60% 45%", dark: "152 50% 50%" },
};

export const info: Record<string, HSLTokenSet> = {
	DEFAULT: { light: "217 91% 60%", dark: "217 80% 60%" },
	foreground: { light: "217 91% 20%", dark: "214 80% 90%" },
	bg: { light: "214 95% 96%", dark: "217 40% 15%" },
	muted: { light: "217 70% 55%", dark: "217 60% 58%" },
};

/**
 * Neutral tokens — default/subtle backgrounds.
 */
export const neutral: Record<string, HSLTokenSet> = {
	default: { light: "0 0% 88%", dark: "25 10% 25%" },
	subtle: { light: "0 0% 92%", dark: "25 12% 18%" },
};

/**
 * All HSL semantic tokens in a single object for iteration.
 */
export const HSL_SEMANTIC_TOKENS = {
	surface,
	card,
	popover,
	accent,
	foreground,
	warning,
	success,
	info,
	neutral,
} as const;
