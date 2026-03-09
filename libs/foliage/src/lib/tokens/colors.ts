/**
 * Re-exports Prism color tokens for backward compatibility.
 * New code should import directly from @autumnsgrove/prism.
 *
 * Note: Prism exports `groveColors` (aliased from `grove`).
 * We re-export as `grove` here for foliage internal theme files.
 */
export {
	groveColors as grove,
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
} from "@autumnsgrove/prism";
