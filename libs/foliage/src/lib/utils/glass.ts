/**
 * Re-exports Prism glass utilities for backward compatibility.
 * New code should import directly from @autumnsgrove/prism.
 */
export {
	generateGlass,
	generateDarkGlass,
	generateMidnightBloomGlass,
	hexToRgba,
	GLASS_OPACITY,
	GLASS_BLUR,
	BLUR_CSS,
	BORDER_OPACITY,
	DEFAULT_GLASS,
	MIDNIGHT_BLOOM,
	type GlassGeneratorOptions,
} from "@autumnsgrove/prism";
