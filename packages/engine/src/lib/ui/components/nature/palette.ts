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
	mud: '#5d4037',        // Wet earth (same as bark.bark - natural connection)
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
// SEASONAL PALETTES - SPRING
// =============================================================================

/**
 * Spring foliage - fresh yellow-green growth
 * The distinctive bright yellow-green of new spring leaves.
 * Organized dark-to-light for depth layering.
 */
export const springFoliage = {
	sprout: '#65a30d',        // Dark spring green - distant new growth
	newLeaf: '#84cc16',       // Classic spring lime - mid-ground
	freshGreen: '#a3e635',    // Bright yellow-green - foreground
	budding: '#bef264',       // Pale new leaf
	tender: '#d9f99d'         // Very pale spring green
} as const;

/**
 * Spring sky colors
 * Clear, bright spring atmosphere.
 */
export const springSky = {
	clear: '#7dd3fc',         // Clear spring morning sky
	soft: '#bae6fd'           // Pale spring sky
} as const;

/**
 * Wildflowers - spring and general meadow flowers
 * Unified wildflower palette for all seasons.
 * Used for spring wildflowers and general meadow accents.
 */
export const wildflowers = {
	// Yellows
	buttercup: '#facc15',     // Bright yellow - buttercups, dandelions
	daffodil: '#fde047',      // Pale yellow - daffodils

	// Purples and violets
	crocus: '#a78bfa',        // Early spring crocus
	violet: '#8b5cf6',        // Wild violets
	purple: '#a855f7',        // Lupine, thistle
	lavender: '#c4b5fd',      // Distant flower masses, lilacs

	// Pinks and reds
	tulipPink: '#f9a8d4',     // Soft tulip pink
	tulipRed: '#fb7185',      // Bright tulip red

	// Neutrals
	white: '#fefefe'          // Daisies, trillium
} as const;

/**
 * Cherry blossoms - standard summer/default
 * Used for cherry trees during summer.
 * Pink blooms from dense to pale.
 */
export const cherryBlossoms = {
	deep: '#db2777',          // Dense bloom centers
	standard: '#ec4899',      // Standard blossom
	light: '#f472b6',         // Light petals
	pale: '#f9a8d4',          // Pale blossoms
	falling: '#fbcfe8'        // Falling petals, distant blooms
} as const;

/**
 * Cherry blossoms peak bloom - vibrant spring version
 * Extra saturated for spring when cherry blossoms are at their most beautiful.
 * One shade brighter than standard cherryBlossoms.
 */
export const cherryBlossomsPeak = {
	deep: '#ec4899',          // Vibrant deep pink
	standard: '#f472b6',      // Bright cherry blossom
	light: '#f9a8d4',         // Soft rose petals
	pale: '#fbcfe8',          // Pale blush
	falling: '#fce7f3'        // Very pale falling petals
} as const;

// =============================================================================
// SEASONAL PALETTES - AUTUMN
// =============================================================================

/**
 * Autumn/Fall foliage colors
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
// SEASONAL PALETTES - WINTER
// =============================================================================

/**
 * Winter colors - frost, snow, and ice
 * Used for winter mode: snow-dusted evergreens, frozen landscape.
 * Deciduous trees go bare, showing only branches.
 */
export const winter = {
	// Snow and ice
	snow: '#f8fafc',       // Pure fresh snow
	frost: '#e2e8f0',      // Frosted surfaces
	ice: '#cbd5e1',        // Ice blue-gray
	glacier: '#94a3b8',    // Deep ice shadows

	// Frosted evergreen greens (muted, cool tones)
	frostedPine: '#2d4a3e',    // Snow-dusted dark pine
	winterGreen: '#3d5a4a',    // Muted forest green
	coldSpruce: '#4a6355',     // Cool spruce color

	// Winter sky
	winterSky: '#e0f2fe',      // Pale winter sky
	twilight: '#bfdbfe',       // Evening winter sky
	overcast: '#cbd5e1',       // Gray overcast

	// Bare branch colors
	bareBranch: '#78716c',     // Gray-brown bare wood
	frostedBark: '#a8a29e',    // Frost-touched bark
	coldWood: '#57534e',       // Dark winter wood

	// Winter hills (snowy ground, back to front)
	hillDeep: '#475569',       // Far hills - cool slate
	hillMid: '#7c8ca3',        // Mid hills - gray-blue
	hillNear: '#c7d2e0',       // Near hills - pale snow
	hillFront: '#f1f5f9'       // Front hills - fresh snow
} as const;

// =============================================================================
// COMPONENT-SPECIFIC ACCENTS
// =============================================================================

/**
 * Accent colors for specific components
 * Each category gets unique colors that don't fit the main palettes.
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
	/**
	 * @deprecated Use the top-level `wildflowers` export instead. Will be removed in v1.0.
	 *
	 * Historical context: Flower colors were originally split between two places:
	 * - `spring` palette had wildflower accents (crocus, lilac, tulips, buttercup, daffodil)
	 * - `accents.flower` had generic flower colors (purple, violet, yellow, white, lavender)
	 *
	 * This caused confusion and duplicate values. Now unified in the top-level `wildflowers`
	 * palette which contains all meadow flower colors in one place.
	 */
	flower: {
		purple: wildflowers.purple,
		violet: wildflowers.violet,
		yellow: wildflowers.buttercup,
		white: wildflowers.white,
		lavender: wildflowers.lavender
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
	},
	/** Bird colors - winter, spring, and year-round species */
	bird: {
		// Cardinal (winter)
		cardinalRed: '#dc2626',    // Northern Cardinal vivid red
		cardinalMask: '#1a1a1a',   // Cardinal black mask
		cardinalBeak: '#f97316',   // Orange-red cone beak
		// Chickadee (year-round)
		chickadeeCap: '#1a1a1a',   // Black-capped Chickadee cap/bib
		chickadeeCheek: '#fafafa', // White cheek patch
		chickadeeBody: '#6b7280',  // Gray back feathers
		chickadeeBelly: '#fef3c7', // Buff/cream underside
		// Robin (spring herald!)
		robinBody: '#4a4a4a',      // American Robin dark gray-brown
		robinWing: '#3a3a3a',      // Slightly darker wing
		robinWingDark: '#2a2a2a',  // Wing shadow detail
		robinBreast: '#c2410c',    // American Robin orange-red breast
		robinBreastLight: '#dc5015', // Breast highlight
		robinBeak: '#f59e0b',      // Yellow-orange beak
		// Bluebird (spring/summer)
		bluebirdBody: '#3b82f6',   // Eastern Bluebird vivid blue
		bluebirdWing: '#2563eb',   // Slightly darker blue wings
		bluebirdBreast: '#ea580c'  // Rusty orange breast
	}
} as const;

// =============================================================================
// MIDNIGHT BLOOM PALETTE
// =============================================================================

/**
 * Midnight Bloom - the far vision
 * A late-night tea café palette: deep plums, warm amber, soft golds.
 * Used for the Midnight Bloom section of the roadmap and future theming.
 */
export const midnightBloom = {
	deepPlum: '#581c87',    // Night sky depth
	purple: '#7c3aed',      // Soft purple glow
	violet: '#8b5cf6',      // Lighter accent
	amber: '#f59e0b',       // Lantern warmth
	warmCream: '#fef3c7',   // Tea steam, page glow
	softGold: '#fcd34d'     // Fairy lights
} as const;

// =============================================================================
// PALETTE HELPERS
// =============================================================================

/** Supported seasons for seasonal color switching */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Get appropriate foliage colors based on season
 * Used by deciduous trees to switch from greens to seasonal palette.
 * Spring uses bright yellow-greens of new growth.
 * Autumn uses warm oranges and golds.
 * In winter, returns frosted evergreen colors (for pines that keep needles).
 * @example getSeasonalGreens('spring') // returns spring foliage mapped to greens structure
 * @example getSeasonalGreens('autumn') // returns autumn palette
 */
export function getSeasonalGreens(season: Season = 'summer') {
	if (season === 'spring') {
		// Fresh yellow-green spring foliage - mapped to match greens structure
		return {
			darkForest: springFoliage.sprout,
			deepGreen: springFoliage.sprout,
			grove: springFoliage.newLeaf,
			meadow: springFoliage.freshGreen,
			spring: springFoliage.budding,
			mint: springFoliage.budding,
			pale: springFoliage.tender
		};
	}
	if (season === 'autumn') {
		return autumn;
	}
	if (season === 'winter') {
		// Frosted evergreen colors for pines/conifers
		return {
			darkForest: winter.frostedPine,
			deepGreen: winter.frostedPine,
			grove: winter.winterGreen,
			meadow: winter.winterGreen,
			spring: winter.coldSpruce,
			mint: winter.coldSpruce,
			pale: winter.coldSpruce
		};
	}
	return greens;
}

/**
 * Get cherry tree colors based on season
 * Spring: Extra vibrant pink blossoms (peak bloom!)
 * Summer: Standard pink blossoms
 * Autumn: Turn red/crimson like real cherry leaves
 * Winter: Bare (no blossoms)
 * @example getCherryColors('spring') // returns cherryBlossomsPeak (vibrant)
 * @example getCherryColors('autumn') // returns autumnReds palette
 */
export function getCherryColors(season: Season = 'spring'): typeof cherryBlossoms | typeof autumnReds | typeof cherryBlossomsPeak | null {
	if (season === 'spring') {
		// Peak bloom - extra vibrant pinks!
		return cherryBlossomsPeak;
	}
	if (season === 'autumn') {
		return autumnReds;
	}
	if (season === 'winter') {
		// Return null to indicate bare tree (no foliage to render)
		return null;
	}
	return cherryBlossoms;
}

/**
 * Check if a tree should be bare (no foliage) based on season
 * Deciduous trees lose leaves in winter.
 */
export function isTreeBare(treeType: string, season: Season): boolean {
	if (season !== 'winter') return false;
	// Evergreen types keep their needles
	const evergreens = ['pine', 'spruce', 'fir', 'cedar'];
	return !evergreens.includes(treeType.toLowerCase());
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
// BACKWARD COMPATIBILITY ALIASES
// =============================================================================

/**
 * @deprecated Use `cherryBlossoms` instead. Will be removed in v1.0.
 * Alias for backward compatibility with components using 'pinks'.
 */
export const pinks = {
	deepPink: cherryBlossoms.deep,
	pink: cherryBlossoms.standard,
	rose: cherryBlossoms.light,
	blush: cherryBlossoms.pale,
	palePink: cherryBlossoms.falling
} as const;

/**
 * @deprecated Use `cherryBlossomsPeak` instead. Will be removed in v1.0.
 * Alias for backward compatibility with components using 'springBlossoms'.
 */
export const springBlossoms = {
	deepPink: cherryBlossomsPeak.deep,
	pink: cherryBlossomsPeak.standard,
	rose: cherryBlossomsPeak.light,
	blush: cherryBlossomsPeak.pale,
	palePink: cherryBlossomsPeak.falling
} as const;

/**
 * @deprecated Use `springFoliage`, `wildflowers`, `springSky` instead. Will be removed in v1.0.
 * Combined spring palette for backward compatibility.
 * New code should import the specific palettes directly.
 */
export const spring = {
	// Fresh growth greens (from springFoliage)
	sprout: springFoliage.sprout,
	newLeaf: springFoliage.newLeaf,
	freshGreen: springFoliage.freshGreen,
	budding: springFoliage.budding,
	tender: springFoliage.tender,

	// Sky and atmosphere (from springSky)
	clearSky: springSky.clear,
	softSky: springSky.soft,

	// Wildflower accents (from wildflowers)
	buttercup: wildflowers.buttercup,
	daffodil: wildflowers.daffodil,
	crocus: wildflowers.crocus,
	lilac: wildflowers.lavender,
	tulipPink: wildflowers.tulipPink,
	tulipRed: wildflowers.tulipRed,

	// Hills and ground (references to greens for depth layering)
	hillDeep: greens.deepGreen,
	hillMid: greens.meadow,
	hillNear: greens.mint,
	hillFront: greens.pale
} as const;


// =============================================================================
// FULL PALETTE EXPORT
// =============================================================================

export const naturePalette = {
	// Core
	greens,
	bark,
	earth,
	natural,

	// Spring
	springFoliage,
	springSky,
	wildflowers,
	cherryBlossoms,
	cherryBlossomsPeak,

	// Autumn
	autumn,
	autumnReds,

	// Winter
	winter,

	// Accents
	accents,

	// Special
	midnightBloom,

	// Deprecated aliases (for backward compat)
	spring,
	pinks,
	springBlossoms
} as const;

export default naturePalette;
