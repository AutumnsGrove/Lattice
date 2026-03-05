/**
 * Preset configurations for Gossamer effects
 */

import type { PresetConfig } from "../index";

/**
 * Grove-themed presets
 * Organic, nature-inspired effects
 */
export const grovePresets: Record<string, PresetConfig> = {
	"grove-mist": {
		name: "Grove Mist",
		description: "Soft fog effect drifting through the trees",
		characters: " ·∙•◦",
		pattern: "perlin",
		frequency: 0.03,
		amplitude: 1.0,
		speed: 0.3,
		opacity: 0.2,
	},
	"grove-fireflies": {
		name: "Grove Fireflies",
		description: "Twinkling points of light in the darkness",
		characters: " ·*+.",
		pattern: "static",
		frequency: 0.01,
		amplitude: 1.0,
		speed: 0.3,
		opacity: 0.3,
	},
	"grove-rain": {
		name: "Grove Rain",
		description: "Gentle rain falling through the canopy",
		characters: " .|:!",
		pattern: "matrix",
		frequency: 0.05,
		amplitude: 1.0,
		speed: 0.8,
		opacity: 0.18,
	},
	"grove-dew": {
		name: "Grove Dew",
		description: "Morning dew glistening on spider silk",
		characters: " ·.:*",
		pattern: "fbm",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.1,
		opacity: 0.15,
	},
};

/**
 * Seasonal presets
 * Effects themed around the four seasons
 */
export const seasonalPresets: Record<string, PresetConfig> = {
	"winter-snow": {
		name: "Winter Snow",
		description: "Gentle snowfall on a quiet night",
		characters: " .*+:",
		pattern: "perlin",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.5,
		opacity: 0.25,
	},
	"autumn-leaves": {
		name: "Autumn Leaves",
		description: "Scattered leaves drifting on the wind",
		characters: " ~=*%",
		pattern: "clouds",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.4,
		opacity: 0.2,
	},
	"spring-petals": {
		name: "Spring Petals",
		description: "Cherry blossom petals floating on the breeze",
		characters: " .+*:",
		pattern: "waves",
		frequency: 0.03,
		amplitude: 1.0,
		speed: 0.4,
		opacity: 0.2,
	},
	"summer-heat": {
		name: "Summer Heat",
		description: "Heat shimmer rising from sun-warmed ground",
		characters: " ~-=:",
		pattern: "waves",
		frequency: 0.06,
		amplitude: 1.0,
		speed: 1.0,
		opacity: 0.15,
	},
};

/**
 * Ambient presets
 * Subtle background textures
 */
export const ambientPresets: Record<string, PresetConfig> = {
	"ambient-static": {
		name: "Ambient Static",
		description: "Gentle static noise texture",
		characters: " .:+*",
		pattern: "static",
		frequency: 0.1,
		amplitude: 1.0,
		speed: 0.5,
		opacity: 0.12,
	},
	"ambient-waves": {
		name: "Ambient Waves",
		description: "Soft flowing wave pattern",
		characters: " .~-=",
		pattern: "waves",
		frequency: 0.04,
		amplitude: 1.0,
		speed: 0.3,
		opacity: 0.12,
	},
	"ambient-clouds": {
		name: "Ambient Clouds",
		description: "Drifting cloud-like patterns",
		characters: " .:=+*",
		pattern: "clouds",
		frequency: 0.03,
		amplitude: 1.0,
		speed: 0.2,
		opacity: 0.15,
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
