/**
 * Shared Nature Palette
 *
 * A unified color system for all forest/nature components.
 * All components should import from here to maintain visual cohesion.
 */

// =============================================================================
// CORE PALETTES
// =============================================================================

/** Green foliage colors - from dark forest depths to pale spring leaves */
export const greens = {
	darkForest: '#0d4a1c',
	deepGreen: '#166534',
	grove: '#16a34a',
	meadow: '#22c55e',
	spring: '#4ade80',
	mint: '#86efac',
	pale: '#bbf7d0'
} as const;

/** Bark and wood tones */
export const bark = {
	darkBark: '#3d2817',
	bark: '#5d4037',
	warmBark: '#6B4423',
	lightBark: '#8b6914'
} as const;

/** Earth and soil tones */
export const earth = {
	soil: '#3e2723',
	mud: '#5d4037',
	clay: '#8d6e63',
	sand: '#d7ccc8',
	stone: '#78716c',
	pebble: '#a8a29e',
	slate: '#57534e'
} as const;

/** Cream and natural off-whites */
export const natural = {
	cream: '#fef9ef',
	aspenBark: '#e8e4d9',
	bone: '#e8e4dc',
	mushroom: '#d4c8be',
	birchWhite: '#f5f5f0'
} as const;

// =============================================================================
// SEASONAL PALETTES
// =============================================================================

/** Autumn/Fall colors */
export const autumn = {
	rust: '#9a3412',
	ember: '#c2410c',
	pumpkin: '#ea580c',
	amber: '#d97706',
	gold: '#eab308',
	honey: '#facc15',
	straw: '#fde047'
} as const;

/** Cherry blossom pinks (spring) */
export const pinks = {
	deepPink: '#db2777',
	pink: '#ec4899',
	rose: '#f472b6',
	blush: '#f9a8d4',
	palePink: '#fbcfe8'
} as const;

/** Autumn reds for cherry/maple foliage */
export const autumnReds = {
	crimson: '#be123c',
	scarlet: '#e11d48',
	rose: '#f43f5e',
	coral: '#fb7185'
} as const;

// =============================================================================
// COMPONENT-SPECIFIC ACCENTS
// =============================================================================

/** Accent colors for specific components (1-2 unique colors each) */
export const accents = {
	mushroom: {
		redCap: '#dc2626',
		orangeCap: '#ea580c',
		brownCap: '#78350f',
		spots: '#fefefe',
		gill: '#fde8e8'
	},
	flower: {
		purple: '#a855f7',
		violet: '#8b5cf6',
		yellow: '#fbbf24',
		white: '#fefefe',
		lavender: '#c4b5fd'
	},
	firefly: {
		glow: '#fef08a',
		warmGlow: '#fde047',
		body: '#365314'
	},
	berry: {
		ripe: '#7c2d12',
		elderberry: '#581c87',
		red: '#b91c1c'
	},
	water: {
		surface: '#7dd3fc',
		deep: '#0284c7',
		shallow: '#bae6fd',
		lily: '#bbf7d0'
	},
	sky: {
		dayLight: '#e0f2fe',
		dayMid: '#7dd3fc',
		sunset: '#fed7aa',
		night: '#1e293b',
		star: '#fefce8'
	}
} as const;

// =============================================================================
// PALETTE HELPERS
// =============================================================================

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Get appropriate foliage colors based on season */
export function getSeasonalGreens(season: Season = 'summer') {
	if (season === 'autumn') {
		return autumn;
	}
	// Winter could return muted/frosted versions in the future
	return greens;
}

/** Get cherry tree colors based on season */
export function getCherryColors(season: Season = 'spring') {
	if (season === 'autumn') {
		return autumnReds;
	}
	return pinks;
}

/** Pick a random color from a palette object */
export function pickRandom<T extends Record<string, string>>(palette: T): string {
	const values = Object.values(palette);
	return values[Math.floor(Math.random() * values.length)];
}

/** Pick a random color from a subset of palette keys */
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
