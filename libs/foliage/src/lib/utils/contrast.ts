/**
 * Re-exports Prism contrast utilities for backward compatibility.
 * New code should import directly from @autumnsgrove/prism.
 */
export {
	getRelativeLuminance,
	getContrastRatio,
	meetsWCAGAA,
	meetsWCAGAAA,
	validateThemeContrast,
	suggestReadableColor,
} from "@autumnsgrove/prism";
