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
	BORDER_OPACITY,
	MIDNIGHT_BLOOM,
	type GlassGeneratorOptions,
} from "@autumnsgrove/prism";
