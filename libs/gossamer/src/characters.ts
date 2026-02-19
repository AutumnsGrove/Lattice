/**
 * Gossamer Character Sets
 *
 * Predefined character sets for ASCII rendering, ordered from light to dark.
 * Character density determines which character represents each brightness level.
 */

/**
 * Character set configuration
 */
export interface CharacterSet {
	/** Unique identifier for the character set */
	name: string;
	/** Description of the set's aesthetic */
	description: string;
	/** Characters ordered from lightest (space) to darkest */
	characters: string;
	/** Recommended use cases */
	bestFor: string[];
}

/**
 * Standard character sets for ASCII rendering
 */
export const CHARACTER_SETS: Record<string, CharacterSet> = {
	standard: {
		name: "Standard",
		description: "Classic ASCII art character set",
		characters: " .:-=+*#%@",
		bestFor: ["general", "images", "patterns"],
	},

	dense: {
		name: "Dense",
		description: "High detail character set with many gradations",
		characters: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
		bestFor: ["detailed images", "portraits", "high contrast"],
	},

	minimal: {
		name: "Minimal",
		description: "Clean and simple with few characters",
		characters: " .:*#",
		bestFor: ["backgrounds", "subtle effects", "clean aesthetic"],
	},

	grove: {
		name: "Grove",
		description: "Organic, soft characters inspired by nature",
		characters: " ·∙•◦○◉●",
		bestFor: ["organic patterns", "soft backgrounds", "nature themes"],
	},

	dots: {
		name: "Dots",
		description: "Braille-like dot patterns",
		characters: " ⋅∘∙●",
		bestFor: ["stipple effects", "pointillism", "dotted textures"],
	},

	blocks: {
		name: "Blocks",
		description: "Block-based characters for sharp edges",
		characters: " ░▒▓█",
		bestFor: ["retro effects", "pixel art", "bold patterns"],
	},

	lines: {
		name: "Lines",
		description: "Line-based characters for directional effects",
		characters: " -─═╌│┃",
		bestFor: ["rain effects", "streaks", "motion blur"],
	},

	stars: {
		name: "Stars",
		description: "Star and sparkle characters",
		characters: " ·✧✦✫✬✯★",
		bestFor: ["sparkle effects", "night sky", "magical themes"],
	},

	nature: {
		name: "Nature",
		description: "Nature-themed decorative characters",
		characters: " .~≈∿⌇☘",
		bestFor: ["decorative", "themed effects", "organic patterns"],
	},

	weather: {
		name: "Weather",
		description: "Weather-related symbols",
		characters: " ·.:*❄❅❆",
		bestFor: ["snow effects", "weather simulations", "seasonal themes"],
	},

	binary: {
		name: "Binary",
		description: "Digital-style binary characters",
		characters: " 01",
		bestFor: ["digital effects", "matrix style", "tech themes"],
	},

	math: {
		name: "Math",
		description: "Mathematical symbols",
		characters: " +-×÷=≠≈∞",
		bestFor: ["abstract patterns", "tech themes", "decorative"],
	},

	// ==========================================================================
	// GLASS-OPTIMIZED CHARACTER SETS
	// Designed for subtle overlays on Glass components
	// More characters = more visible gradations
	// ==========================================================================

	"glass-dots": {
		name: "Glass Dots",
		description: "Soft dot gradations for glass overlays",
		characters: " ·∘∙○•●",
		bestFor: ["glass overlays", "subtle backgrounds", "mist effects"],
	},

	"glass-mist": {
		name: "Glass Mist",
		description: "Ethereal mist effect for glass",
		characters: " .·∙•◦○◉●",
		bestFor: ["glass overlays", "fog effects", "ambient backgrounds"],
	},

	"glass-dust": {
		name: "Glass Dust",
		description: "Floating dust particles",
		characters: " ˙·∘°•◦○",
		bestFor: ["glass overlays", "particle effects", "light scatter"],
	},

	"glass-soft": {
		name: "Glass Soft",
		description: "Soft block gradations for glass",
		characters: " ·░▒▓",
		bestFor: ["glass overlays", "soft gradients", "frosted effect"],
	},

	"glass-sparkle": {
		name: "Glass Sparkle",
		description: "Subtle sparkles for glass",
		characters: " ·.✧✦✫★",
		bestFor: ["glass overlays", "highlight effects", "magical themes"],
	},

	"glass-wave": {
		name: "Glass Wave",
		description: "Flowing wave patterns for glass",
		characters: " .~∼≈≋",
		bestFor: ["glass overlays", "water effects", "flowing motion"],
	},

	"glass-organic": {
		name: "Glass Organic",
		description: "Natural, organic feel for glass",
		characters: " .·:;∘○◦•●",
		bestFor: ["glass overlays", "nature themes", "grove aesthetic"],
	},
};

/**
 * Get a character set by name
 */
export function getCharacterSet(name: string): CharacterSet | undefined {
	return CHARACTER_SETS[name];
}

/**
 * Get just the characters string from a named set
 */
export function getCharacters(name: string): string {
	return CHARACTER_SETS[name]?.characters || CHARACTER_SETS.standard.characters;
}

/**
 * List all available character set names
 */
export function getCharacterSetNames(): string[] {
	return Object.keys(CHARACTER_SETS);
}

/**
 * Create a custom character set
 */
export function createCharacterSet(
	name: string,
	characters: string,
	description: string = "",
	bestFor: string[] = [],
): CharacterSet {
	return {
		name,
		description,
		characters,
		bestFor,
	};
}

/**
 * Validate that a character string is suitable for ASCII rendering
 * (should start with space and have at least 2 characters)
 */
export function validateCharacterSet(characters: string): boolean {
	if (characters.length < 2) return false;
	if (characters[0] !== " ") return false;
	return true;
}

/**
 * Reverse a character set (for inverted brightness mapping)
 */
export function invertCharacters(characters: string): string {
	return characters.split("").reverse().join("");
}
