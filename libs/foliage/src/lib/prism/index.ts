// src/lib/prism/index.ts
// Prism design system — color tokens, glass utilities, and contrast tools
//
// import { groveColors, generateGlass, meetsWCAGAA } from '@autumnsgrove/foliage/prism'

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
} from "../tokens/index.js";

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
} from "../utils/glass.js";

// Contrast utilities
export {
	getRelativeLuminance,
	getContrastRatio,
	meetsWCAGAA,
	meetsWCAGAAA,
	validateThemeContrast,
	suggestReadableColor,
} from "../utils/contrast.js";

// Prism-relevant types
export type { GlassVariant, ThemeGlass, ThemeColors, Season, SeasonalAffinity } from "../types.js";
