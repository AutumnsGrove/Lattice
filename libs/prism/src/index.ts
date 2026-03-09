// @autumnsgrove/prism
// Design tokens, glass utilities, and contrast tools for Grove
//
// The light that splits into color — foundational design primitives
// that every Grove package can depend on.
//
// import { groveColors, generateGlass, meetsWCAGAA } from '@autumnsgrove/prism'

// Color tokens
export {
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
} from "./lib/tokens/index.js";

// Glass utilities
export {
	generateGlass,
	generateDarkGlass,
	generateMidnightBloomGlass,
	hexToRgba,
	GLASS_OPACITY,
	GLASS_BLUR,
	BORDER_OPACITY,
	MIDNIGHT_BLOOM,
	type GlassGeneratorOptions,
} from "./lib/utils/glass.js";

// Contrast utilities
export {
	getRelativeLuminance,
	getContrastRatio,
	meetsWCAGAA,
	meetsWCAGAAA,
	validateThemeContrast,
	suggestReadableColor,
} from "./lib/utils/contrast.js";

// Prism types
export type {
	GlassVariant,
	ThemeGlass,
	ThemeColors,
	Season,
	SeasonalAffinity,
	ValidationResult,
} from "./lib/types.js";
