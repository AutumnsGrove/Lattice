/**
 * Shared Nature Palette
 *
 * A unified color system for all forest/nature components.
 * All components should import from here to maintain visual cohesion.
 *
 * Design Philosophy:
 * - Colors are drawn from real forest environments (Pacific Northwest inspiration)
 * - Organized by depth: darker = further away, lighter = closer (atmospheric perspective)
 * - Seasonal variants allow trees to change with autumn toggle
 * - Accents are intentionally limited to 1-2 unique colors per component type
 */

// =============================================================================
// CORE PALETTES
// =============================================================================

/**
 * Green foliage colors - from dark forest depths to pale spring leaves
 * Organized dark-to-light for depth layering in forest scenes.
 * darkForest/deepGreen: background trees (atmospheric distance)
 * grove/meadow: mid-ground trees (Grove brand green at grove)
 * spring/mint/pale: foreground foliage, new growth
 */
export const greens = {
	darkForest: '#0d4a1c',
	deepGreen: '#166534',
	grove: '#16a34a',      // Grove brand primary green
	meadow: '#22c55e',
	spring: '#4ade80',
	mint: '#86efac',
	pale: '#bbf7d0'
} as const;

/**
 * Bark and wood tones
 * Used for tree trunks, branches, fences, and structural elements.
 * Warmer browns complement the green foliage.
 */
export const bark = {
	darkBark: '#3d2817',   // Oak, older trees
	bark: '#5d4037',       // Standard trunk color
	warmBark: '#6B4423',   // Pine, cedar tones
	lightBark: '#8b6914'   // Young trees, sun-exposed wood
} as const;

/**
 * Earth and soil tones
 * Ground elements, rocks, paths. Neutral grays for stone
 * to contrast with warm browns of wood.
 */
export const earth = {
	soil: '#3e2723',       // Rich forest floor
	mud: '#5d4037',        // Wet earth
	clay: '#8d6e63',       // Exposed clay
	sand: '#d7ccc8',       // Paths, dry ground
	stone: '#78716c',      // Neutral gray rocks
	pebble: '#a8a29e',     // Lighter stones
	slate: '#57534e'       // Dark stone accents
} as const;

/**
 * Cream and natural off-whites
 * Special bark colors (aspen, birch) and neutral backgrounds.
 * Birch has pure white bark with slight warmth.
 * Aspen bark is cream/pale green undertone.
 */
export const natural = {
	cream: '#fef9ef',      // Warm white, backgrounds
	aspenBark: '#e8e4d9',  // Aspen tree distinctive pale bark
	bone: '#e8e4dc',       // Weathered wood, antlers
	mushroom: '#d4c8be',   // Mushroom stems, pale fungi
	birchWhite: '#f5f5f0'  // Birch tree distinctive white bark
} as const;

// =============================================================================
// SEASONAL PALETTES
// =============================================================================

/**
 * Autumn/Fall colors
 * Replaces greens for deciduous trees during autumn season.
 * Organized warm-to-bright for depth layering (dark rust = far, bright gold = near).
 * Aspen and birch use gold/honey for their signature golden fall color.
 */
export const autumn = {
	rust: '#9a3412',       // Deep background foliage
	ember: '#c2410c',      // Oak-like autumn
	pumpkin: '#ea580c',    // Maple mid-tones
	amber: '#d97706',      // Classic fall amber
	gold: '#eab308',       // Aspen/birch golden yellow
	honey: '#facc15',      // Bright foreground leaves
	straw: '#fde047'       // Pale dying leaves
} as const;

/**
 * Cherry blossom pinks (spring/summer)
 * Used for cherry trees during spring bloom.
 * In autumn, cherry trees switch to autumnReds to mimic real cherry leaf color change.
 */
export const pinks = {
	deepPink: '#db2777',   // Dense bloom centers
	pink: '#ec4899',       // Standard blossom
	rose: '#f472b6',       // Light petals
	blush: '#f9a8d4',      // Pale blossoms
	palePink: '#fbcfe8'    // Falling petals, distant blooms
} as const;

/**
 * Autumn reds for cherry/maple foliage
 * Cherry trees don't just lose pink - they turn red/crimson in fall.
 * Also used for Japanese maple trees and other red autumn foliage.
 */
export const autumnReds = {
	crimson: '#be123c',    // Deep maple red
	scarlet: '#e11d48',    // Bright cherry leaves
	rose: '#f43f5e',       // Light autumn cherry
	coral: '#fb7185'       // Pale autumn accent
} as const;

// =============================================================================
// COMPONENT-SPECIFIC ACCENTS
// =============================================================================

/**
 * Accent colors for specific components
 * Each category gets 1-2 unique colors that don't fit the main palettes.
 * These add visual interest without breaking the natural cohesion.
 */
export const accents = {
	/** Mushroom caps and details - fairy tale forest pops of color */
	mushroom: {
		redCap: '#dc2626',    // Amanita-style red (toxic but iconic)
		orangeCap: '#ea580c', // Chanterelle-inspired
		brownCap: '#78350f',  // Porcini/common mushroom
		spots: '#fefefe',     // White spots on caps
		gill: '#fde8e8'       // Pale pink gills underneath
	},
	/** Wildflower accents - purple/violet break from green monotony */
	flower: {
		purple: '#a855f7',    // Lupine, thistle
		violet: '#8b5cf6',    // Wild violets
		yellow: '#fbbf24',    // Buttercup, dandelion
		white: '#fefefe',     // Daisies, trillium
		lavender: '#c4b5fd'   // Distant flower masses
	},
	/** Firefly bioluminescence - warm yellow-green glow */
	firefly: {
		glow: '#fef08a',      // Primary glow (pale yellow)
		warmGlow: '#fde047',  // Brighter intensity
		body: '#365314'       // Dark green body
	},
	/** Berry colors - rich and saturated */
	berry: {
		ripe: '#7c2d12',      // Blackberry/dark berry
		elderberry: '#581c87', // Deep purple elderberry
		red: '#b91c1c'        // Holly berries, winterberry
	},
	/** Water and pond colors - cool blue spectrum */
	water: {
		surface: '#7dd3fc',   // Reflecting sky
		deep: '#0284c7',      // Deeper water
		shallow: '#bae6fd',   // Shallow edges
		lily: '#bbf7d0'       // Lily pad green (ties to greens)
	},
	/** Sky elements - time of day variations */
	sky: {
		dayLight: '#e0f2fe',  // Pale daytime sky
		dayMid: '#7dd3fc',    // Blue sky
		sunset: '#fed7aa',    // Golden hour
		night: '#1e293b',     // Night sky
		star: '#fefce8'       // Star/twinkle color
	}
} as const;

// =============================================================================
// PALETTE HELPERS
// =============================================================================

/** Supported seasons for seasonal color switching */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Get appropriate foliage colors based on season
 * Used by deciduous trees to switch from greens to autumn palette.
 * @example getSeasonalGreens('autumn') // returns autumn palette
 */
export function getSeasonalGreens(season: Season = 'summer') {
	if (season === 'autumn') {
		return autumn;
	}
	// Winter could return muted/frosted versions in the future
	return greens;
}

/**
 * Get cherry tree colors based on season
 * Cherry blossoms are pink in spring/summer, turn red in autumn.
 * @example getCherryColors('autumn') // returns autumnReds palette
 */
export function getCherryColors(season: Season = 'spring') {
	if (season === 'autumn') {
		return autumnReds;
	}
	return pinks;
}

/**
 * Pick a random color from a palette object
 * Useful for adding natural variation to forests.
 * @example pickRandom(greens) // returns random green like '#16a34a'
 */
export function pickRandom<T extends Record<string, string>>(palette: T): string {
	const values = Object.values(palette);
	return values[Math.floor(Math.random() * values.length)];
}

/**
 * Pick a random color from a subset of palette keys
 * More controlled randomization when you want specific options.
 * @example pickFrom(greens, ['grove', 'meadow']) // only picks from those two
 */
export function pickFrom<T extends Record<string, string>>(
	palette: T,
	keys: (keyof T)[]
): string {
	const key = keys[Math.floor(Math.random() * keys.length)];
	return palette[key];
}

// =============================================================================
// FULL PALETTE EXPORT
// =============================================================================

export const naturePalette = {
	greens,
	bark,
	earth,
	natural,
	autumn,
	pinks,
	autumnReds,
	accents
} as const;

export default naturePalette;
