/**
 * Blazes — Content Markers for Grove
 *
 * A two-slot marking system for posts. Auto-blazes (Slot 1) identify content
 * type (Bloom, Note). Custom blazes (Slot 2) let wanderers express what their
 * post is really about.
 *
 * @module @autumnsgrove/lattice/blazes
 */

// Types
export type { AutoBlazeConfig, BlazeColorClasses, BlazeDefinition, BlazeResponse, PostType } from "./types.js";

// Config and palette
export {
	BLAZE_CONFIG,
	BLAZE_COLORS,
	BLAZE_COLOR_HEX,
	GLOBAL_BLAZE_DEFAULTS,
	VALID_BLAZE_COLORS,
	VALID_BLAZE_ICONS,
	resolveLucideIcon,
	isValidBlazeHexColor,
	isValidBlazeColor,
} from "./palette.js";
