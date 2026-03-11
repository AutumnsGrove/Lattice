/**
 * Tokens index
 * Exports all Prism design tokens — light mode, dark mode, and HSL semantics
 */

// Light mode color scales
export {
	grove as groveColors,
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
} from "./colors.js";

// Dark mode color scales
export {
	darkCream,
	darkBark,
	darkSemantic,
	darkStatus,
	type DarkCreamColor,
	type DarkBarkColor,
	type DarkSemanticColor,
	type DarkStatusColor,
} from "./dark.js";

// HSL semantic tokens (light + dark values for CSS custom properties)
export { HSL_SEMANTIC_TOKENS, type HSLTokenSet } from "./semantic-hsl.js";

// Seasonal palettes
export { SEASONAL_PALETTES, type SeasonalPalette } from "./seasons.js";
