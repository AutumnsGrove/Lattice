// src/lib/types.ts
// Prism design system type definitions

/**
 * Glass variant configuration for Prism pattern glassmorphism.
 * Maps to Prism Glass component variants.
 */
export interface GlassVariant {
	/** Background with alpha channel (e.g., "rgba(255,255,255,0.6)") */
	background: string;
	/** Dark mode background (e.g., "rgba(30,41,59,0.5)") */
	backgroundDark: string;
	/** Blur intensity: 'none' | 'sm' | 'md' | 'lg' */
	blur: "none" | "sm" | "md" | "lg";
	/** Border color with alpha */
	border: string;
	/** Dark mode border */
	borderDark: string;
}

/**
 * Complete glass variants for a theme.
 * Follows Prism pattern's seven glass types.
 */
export interface ThemeGlass {
	/** Headers/navbars - highest opacity (95%) */
	surface: GlassVariant;
	/** Text containers - medium opacity (60%) */
	tint: GlassVariant;
	/** Content boxes - high opacity (80%) */
	card: GlassVariant;
	/** Frosted glass - strong blur, high opacity (70%) for prominent elements */
	frosted: GlassVariant;
	/** Callouts/CTAs - accent-tinted (30%) */
	accent: GlassVariant;
	/** Modal backdrops - dark overlay (50%) */
	overlay: GlassVariant;
	/** Subtle backgrounds - low opacity (40%) */
	muted: GlassVariant;
}

/**
 * Core theme color slots used for contrast validation.
 */
export interface ThemeColors {
	background: string;
	surface: string;
	foreground: string;
	foregroundMuted: string;
	accent: string;
	border: string;
}

/** Seasonal context for theme - inferred by the platform, consumed by Foliage */
export type Season = "spring" | "summer" | "autumn" | "winter";

/** Theme's seasonal affinity - which season(s) it pairs best with */
export type SeasonalAffinity = Season | Season[] | "all";

export interface ValidationResult {
	valid: boolean;
	error?: string;
	warnings?: string[];
}
