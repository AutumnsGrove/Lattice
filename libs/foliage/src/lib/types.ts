// src/lib/types.ts
// Theme system type definitions

export interface Theme {
	id: string;
	name: string;
	description: string;
	thumbnail: string;
	tier: "seedling" | "sapling";

	colors: ThemeColors;
	fonts: ThemeFonts;
	layout: ThemeLayout;
	customCSS?: string;

	/** Glass variants for Prism pattern glassmorphism */
	glass?: ThemeGlass;
	/** Seasonal affinity - which season(s) this theme pairs best with */
	seasonalAffinity?: SeasonalAffinity;
}

export interface ThemeColors {
	background: string;
	surface: string;
	foreground: string;
	foregroundMuted: string;
	accent: string;
	border: string;
}

/**
 * Glass variant configuration for Prism pattern glassmorphism.
 * Maps to GroveEngine's Glass component variants.
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

/** Seasonal context for theme - inferred by GroveEngine, consumed by Foliage */
export type Season = "spring" | "summer" | "autumn" | "winter";

/** Theme's seasonal affinity - which season(s) it pairs best with */
export type SeasonalAffinity = Season | Season[] | "all";

export interface ThemeFonts {
	heading: string;
	body: string;
	mono: string;
}

export interface ThemeLayout {
	type: "sidebar" | "no-sidebar" | "centered" | "full-width" | "grid" | "masonry";
	maxWidth: string;
	spacing: "compact" | "comfortable" | "spacious";
}

export interface ThemeSettings {
	tenantId: string;
	themeId: string;
	accentColor: string;
	customizerEnabled: boolean;
	customColors?: Partial<ThemeColors>;
	customTypography?: Partial<ThemeFonts>;
	customLayout?: Partial<ThemeLayout>;
	customGlass?: Partial<ThemeGlass>;
	customCSS?: string;
	communityThemeId?: string;
}

export interface CustomFont {
	id: string;
	tenantId: string;
	name: string;
	family: string;
	category: "sans-serif" | "serif" | "mono" | "display";
	woff2Path: string;
	woffPath?: string;
	fileSize: number;
}

export type UserTier = "free" | "seedling" | "sapling" | "oak" | "evergreen";

export interface ValidationResult {
	valid: boolean;
	error?: string;
	warnings?: string[];
}

export interface CommunityTheme {
	id: string;
	creatorTenantId: string;
	name: string;
	description?: string;
	tags?: string[];
	baseTheme: string;
	customColors?: Partial<ThemeColors>;
	customTypography?: Partial<ThemeFonts>;
	customLayout?: Partial<ThemeLayout>;
	customCSS?: string;
	thumbnailPath?: string;
	downloads: number;
	ratingSum: number;
	ratingCount: number;
	status: CommunityThemeStatus;
	reviewedAt?: number;
	createdAt: number;
	updatedAt: number;
}

export type CommunityThemeStatus =
	| "draft"
	| "pending"
	| "in_review"
	| "approved"
	| "featured"
	| "changes_requested"
	| "rejected"
	| "removed";
