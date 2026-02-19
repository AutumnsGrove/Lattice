/**
 * Gossamer - Svelte 5 Components
 *
 * ASCII visual effects components for Svelte applications.
 *
 * @packageDocumentation
 */

// =============================================================================
// Components
// =============================================================================

export { default as GossamerClouds } from "./GossamerClouds.svelte";
export { default as GossamerImage } from "./GossamerImage.svelte";
export { default as GossamerText } from "./GossamerText.svelte";
export { default as GossamerOverlay } from "./GossamerOverlay.svelte";
export { default as GossamerBorder } from "./GossamerBorder.svelte";

// =============================================================================
// Component Types
// =============================================================================

export type { GossamerCloudsProps } from "./GossamerClouds.svelte";
export type { GossamerImageProps } from "./GossamerImage.svelte";
export type { GossamerTextProps } from "./GossamerText.svelte";
export type { GossamerOverlayProps, BlendMode } from "./GossamerOverlay.svelte";
export type { GossamerBorderProps, BorderStyle } from "./GossamerBorder.svelte";

// =============================================================================
// Presets
// =============================================================================

export {
	PRESETS,
	grovePresets,
	seasonalPresets,
	ambientPresets,
	getPreset,
	getPresetNames,
	getPresetsByCategory,
} from "./presets";

// =============================================================================
// Re-exports from Core
// =============================================================================

export {
	// Core types
	type GossamerConfig,
	type PresetConfig,
	type PatternConfig,
	type PatternType,
	type CharacterSet,

	// Constants
	DEFAULT_CHARACTERS,
	DEFAULT_CONFIG,
	CHARACTER_SETS,

	// Core functions
	calculateBrightness,
	brightnessToChar,

	// Character utilities
	getCharacterSet,
	getCharacters,
	getCharacterSetNames,
	invertCharacters,

	// Performance utilities
	prefersReducedMotion,

	// Version
	VERSION,
} from "../index";
