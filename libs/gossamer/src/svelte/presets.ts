/**
 * Preset configurations for Gossamer effects
 *
 * 8 presets tuned for the visual overhaul:
 * - Domain warping for organic cloud shapes
 * - Sparsity bias for atmospheric "dreamy" feel
 * - Alpha-by-brightness for depth and volume
 * - Correct aspect ratio (cellWidth measured from font metrics)
 */

import type { PresetConfig } from "../index";

/**
 * Grove-themed presets
 * Organic, nature-inspired effects
 */
export const grovePresets: Record<string, PresetConfig> = {
	"grove-mist": {
		name: "Grove Mist",
		description: "Soft fog drifting through glass — the signature Gossamer effect",
		characters: " \u00b7\u2219\u2022\u25e6",
		pattern: "domain-warp",
		frequency: 0.03,
		amplitude: 1.0,
		speed: 0.15,
		opacity: 0.2,
		sparsity: 0.6,
		alphaByBrightness: 0.5,
	},
	"grove-fireflies": {
		name: "Grove Fireflies",
		description: "Sparse twinkling points, mostly dark",
		characters: " \u00b7*",
		pattern: "static",
		frequency: 0.01,
		amplitude: 1.0,
		speed: 0.6,
		opacity: 0.3,
		sparsity: 0.85,
		alphaByBrightness: 0.7,
	},
	"grove-rain": {
		name: "Grove Rain",
		description: "Falling columns with fade trails",
		characters: " .|:",
		pattern: "matrix",
		frequency: 0.05,
		amplitude: 1.0,
		speed: 0.4,
		opacity: 0.18,
		sparsity: 0.4,
		alphaByBrightness: 0.6,
	},
	"grove-dew": {
		name: "Grove Dew",
		description: "Still morning texture, barely moving",
		characters: " \u00b7.:*",
		pattern: "fbm",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.1,
		opacity: 0.15,
		sparsity: 0.5,
		alphaByBrightness: 0.4,
	},
};

/**
 * Seasonal presets
 * Effects themed around the seasons
 */
export const seasonalPresets: Record<string, PresetConfig> = {
	"winter-snow": {
		name: "Winter Snow",
		description: "Slow drift, sparse snowflake points",
		characters: " .*+",
		pattern: "perlin",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.2,
		opacity: 0.25,
		sparsity: 0.7,
		alphaByBrightness: 0.5,
	},
	"summer-heat": {
		name: "Summer Heat",
		description: "Horizontal shimmer, low sparsity for visible waves",
		characters: " ~-=",
		pattern: "waves",
		frequency: 0.06,
		amplitude: 1.0,
		speed: 0.5,
		opacity: 0.15,
		sparsity: 0.3,
		alphaByBrightness: 0.3,
	},
};

/**
 * Ambient presets
 * Subtle background textures
 */
export const ambientPresets: Record<string, PresetConfig> = {
	"ambient-clouds": {
		name: "Ambient Clouds",
		description: "Soft billowing, mid-density",
		characters: " .:=+",
		pattern: "domain-warp",
		frequency: 0.03,
		amplitude: 1.0,
		speed: 0.12,
		opacity: 0.15,
		sparsity: 0.5,
		alphaByBrightness: 0.4,
	},
	"ambient-static": {
		name: "Ambient Static",
		description: "Gentle texture, sparse",
		characters: " .:+",
		pattern: "static",
		frequency: 0.1,
		amplitude: 1.0,
		speed: 0.5,
		opacity: 0.12,
		sparsity: 0.7,
		alphaByBrightness: 0.5,
	},
};

/**
 * All presets combined for easy access
 */
export const PRESETS: Record<string, PresetConfig> = {
	...grovePresets,
	...seasonalPresets,
	...ambientPresets,
};

/**
 * Get a preset by name
 */
export function getPreset(name: string): PresetConfig | undefined {
	return PRESETS[name];
}

/**
 * List all available preset names
 */
export function getPresetNames(): string[] {
	return Object.keys(PRESETS);
}

/**
 * List preset names by category
 */
export function getPresetsByCategory(): {
	grove: string[];
	seasonal: string[];
	ambient: string[];
} {
	return {
		grove: Object.keys(grovePresets),
		seasonal: Object.keys(seasonalPresets),
		ambient: Object.keys(ambientPresets),
	};
}
