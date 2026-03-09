// src/lib/prism/index.ts
// Re-exports from @autumnsgrove/prism for backward compatibility.
// New code should import directly from '@autumnsgrove/prism'.

export {
	// Color tokens
	groveColors,
	cream,
	bark,
	semantic,
	status,
	colors,
	type GroveColor,
	type CreamColor,
	type BarkColor,
	type SemanticColor,
	type StatusColor,
	type Colors,
	SEASONAL_PALETTES,
	type SeasonalPalette,

	// Glass utilities
	generateGlass,
	generateDarkGlass,
	generateMidnightBloomGlass,
	hexToRgba,
	GLASS_OPACITY,
	GLASS_BLUR,
	BORDER_OPACITY,
	MIDNIGHT_BLOOM,
	type GlassGeneratorOptions,

	// Contrast utilities
	getRelativeLuminance,
	getContrastRatio,
	meetsWCAGAA,
	meetsWCAGAAA,
	validateThemeContrast,
	suggestReadableColor,

	// Types
	type GlassVariant,
	type ThemeGlass,
	type ThemeColors,
	type Season,
	type SeasonalAffinity,
	type ValidationResult,
} from "@autumnsgrove/prism";
