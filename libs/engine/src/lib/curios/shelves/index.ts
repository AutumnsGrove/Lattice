/**
 * Shelves Curio
 *
 * Universal shelf system — books, links, music, movies, games, recipes, or custom.
 * Preset-driven configuration with 4 display modes and 3 shelf materials.
 * Absorbs the former bookmarkshelf + linkgarden curios into one unified system.
 *
 * Features:
 * - 7 presets with smart defaults (books, links, music, movies, games, recipes, custom)
 * - 5 display modes (cover-grid, card-list, buttons, spines, masonry)
 * - 3 shelf materials (wood, glass, none)
 * - Customizable labels for creator/status fields
 * - Per-item rating, notes, and thumbnail support
 * - Auto-favicon for link-type items
 * - Category grouping
 */

// =============================================================================
// Types
// =============================================================================

export type ShelfPreset = "books" | "links" | "music" | "movies" | "games" | "recipes" | "custom";

export type ShelfDisplayMode = "cover-grid" | "card-list" | "buttons" | "spines" | "masonry";

export type ShelfMaterial = "wood" | "glass" | "none";

export interface ShelfRecord {
	id: string;
	tenantId: string;
	name: string;
	description: string | null;
	preset: ShelfPreset;
	displayMode: ShelfDisplayMode;
	material: ShelfMaterial;
	creatorLabel: string;
	status1Label: string;
	status2Label: string;
	isFeatured: boolean;
	groupByCategory: boolean;
	autoFavicon: boolean;
	sortOrder: number;
	createdAt: string;
}

export interface ItemRecord {
	id: string;
	tenantId: string;
	shelfId: string;
	url: string;
	title: string;
	creator: string | null;
	description: string | null;
	coverUrl: string | null;
	category: string | null;
	isStatus1: boolean;
	isStatus2: boolean;
	rating: number | null;
	note: string | null;
	thumbnailUrl: string | null;
	sortOrder: number;
	addedAt: string;
}

export interface ShelfDisplay {
	id: string;
	name: string;
	description: string | null;
	preset: ShelfPreset;
	displayMode: ShelfDisplayMode;
	material: ShelfMaterial;
	creatorLabel: string;
	status1Label: string;
	status2Label: string;
	groupByCategory: boolean;
	items: ItemDisplay[];
}

export interface ItemDisplay {
	id: string;
	url: string;
	title: string;
	creator: string | null;
	description: string | null;
	coverUrl: string | null;
	category: string | null;
	isStatus1: boolean;
	isStatus2: boolean;
	rating: number | null;
	note: string | null;
	thumbnailUrl: string | null;
}

export interface PresetDefaults {
	displayMode: ShelfDisplayMode;
	material: ShelfMaterial;
	creatorLabel: string;
	status1Label: string;
	status2Label: string;
	autoFavicon: boolean;
	defaultCategories: string[];
}

// =============================================================================
// Constants
// =============================================================================

export const MAX_SHELF_NAME_LENGTH = 100;
export const MAX_ITEM_TITLE_LENGTH = 200;
export const MAX_CREATOR_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_URL_LENGTH = 2048;
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_NOTE_LENGTH = 500;
export const MAX_RATING = 5;
export const MIN_RATING = 1;

export const MAX_SHELVES_PER_TENANT = 50;
export const MAX_ITEMS_PER_SHELF = 200;

// =============================================================================
// Option Arrays (for admin UI pickers)
// =============================================================================

export const SHELF_PRESET_OPTIONS: {
	value: ShelfPreset;
	label: string;
	description: string;
	available: boolean;
}[] = [
	{
		value: "books",
		label: "Books",
		description: "Reading lists with author and cover art",
		available: true,
	},
	{
		value: "links",
		label: "Links",
		description: "Blogroll, cool sites, friends — with favicons",
		available: true,
	},
	{
		value: "music",
		label: "Music",
		description: "Albums, playlists, and listening recommendations",
		available: false,
	},
	{
		value: "movies",
		label: "Movies",
		description: "Watchlist and favorites with posters",
		available: false,
	},
	{
		value: "games",
		label: "Games",
		description: "Game library with cover art and ratings",
		available: false,
	},
	{
		value: "recipes",
		label: "Recipes",
		description: "Saved recipes and cooking resources",
		available: false,
	},
	{
		value: "custom",
		label: "Custom",
		description: "Fully configurable — name your own fields",
		available: true,
	},
];

export const SHELF_DISPLAY_MODE_OPTIONS: {
	value: ShelfDisplayMode;
	label: string;
	description: string;
}[] = [
	{
		value: "cover-grid",
		label: "Cover Grid",
		description: "Grid of cover images with title on hover",
	},
	{
		value: "card-list",
		label: "Card List",
		description: "Vertical list with details and descriptions",
	},
	{
		value: "buttons",
		label: "88×31 Buttons",
		description: "Classic web button wall — the indie web staple",
	},
	{ value: "spines", label: "Spines", description: "Colored book spines sitting on a shelf plank" },
	{
		value: "masonry",
		label: "Masonry",
		description: "Rich cards flowing in a cascading gallery wall",
	},
];

export const SHELF_MATERIAL_OPTIONS: {
	value: ShelfMaterial;
	label: string;
	description: string;
}[] = [
	{ value: "wood", label: "Wood", description: "Warm brown shelf with grain texture" },
	{ value: "glass", label: "Glass", description: "Grove glassmorphism with frosted blur" },
	{ value: "none", label: "None", description: "No shelf plank — items float freely" },
];

export const VALID_PRESETS = new Set<string>(SHELF_PRESET_OPTIONS.map((o) => o.value));
export const VALID_DISPLAY_MODES = new Set<string>(SHELF_DISPLAY_MODE_OPTIONS.map((o) => o.value));
export const VALID_MATERIALS = new Set<string>(SHELF_MATERIAL_OPTIONS.map((o) => o.value));

// =============================================================================
// Preset Defaults
// =============================================================================

const PRESET_DEFAULTS: Record<ShelfPreset, PresetDefaults> = {
	books: {
		displayMode: "spines",
		material: "wood",
		creatorLabel: "Author",
		status1Label: "Currently Reading",
		status2Label: "Favorite",
		autoFavicon: false,
		defaultCategories: [
			"Fiction",
			"Non-Fiction",
			"Technical",
			"Poetry",
			"Zines",
			"Comics",
			"Essays",
			"Tutorials",
		],
	},
	links: {
		displayMode: "card-list",
		material: "none",
		creatorLabel: "Source",
		status1Label: "Featured",
		status2Label: "Favorite",
		autoFavicon: true,
		defaultCategories: ["Friends", "Blogs", "Tools", "Resources", "Inspiration", "Fun"],
	},
	music: {
		displayMode: "cover-grid",
		material: "glass",
		creatorLabel: "Artist",
		status1Label: "Listening Now",
		status2Label: "Favorite",
		autoFavicon: false,
		defaultCategories: ["Albums", "EPs", "Singles", "Playlists", "Soundtracks"],
	},
	movies: {
		displayMode: "cover-grid",
		material: "wood",
		creatorLabel: "Director",
		status1Label: "Watching",
		status2Label: "Favorite",
		autoFavicon: false,
		defaultCategories: ["Drama", "Comedy", "Sci-Fi", "Horror", "Documentary", "Animation"],
	},
	games: {
		displayMode: "cover-grid",
		material: "wood",
		creatorLabel: "Developer",
		status1Label: "Playing",
		status2Label: "Favorite",
		autoFavicon: false,
		defaultCategories: ["RPG", "Puzzle", "Platformer", "Strategy", "Indie", "Visual Novel"],
	},
	recipes: {
		displayMode: "card-list",
		material: "wood",
		creatorLabel: "Source",
		status1Label: "To Try",
		status2Label: "Favorite",
		autoFavicon: true,
		defaultCategories: ["Breakfast", "Lunch", "Dinner", "Dessert", "Snacks", "Drinks"],
	},
	custom: {
		displayMode: "cover-grid",
		material: "none",
		creatorLabel: "Creator",
		status1Label: "In Progress",
		status2Label: "Favorite",
		autoFavicon: false,
		defaultCategories: [],
	},
};

export function getPresetDefaults(preset: ShelfPreset): PresetDefaults {
	return PRESET_DEFAULTS[preset] ?? PRESET_DEFAULTS.custom;
}

export function getDefaultCategories(preset: ShelfPreset): string[] {
	return (PRESET_DEFAULTS[preset] ?? PRESET_DEFAULTS.custom).defaultCategories;
}

export const DEFAULT_CATEGORIES_BOOKS = getDefaultCategories("books");
export const DEFAULT_CATEGORIES_LINKS = getDefaultCategories("links");

// =============================================================================
// Validation
// =============================================================================

export function isValidPreset(value: string): value is ShelfPreset {
	return VALID_PRESETS.has(value);
}

export function isValidDisplayMode(value: string): value is ShelfDisplayMode {
	return VALID_DISPLAY_MODES.has(value);
}

export function isValidMaterial(value: string): value is ShelfMaterial {
	return VALID_MATERIALS.has(value);
}

export function isValidUrl(url: string): boolean {
	try {
		const u = new URL(url);
		return u.protocol === "https:" || u.protocol === "http:";
	} catch {
		return false;
	}
}

export function isValidRating(value: unknown): value is number {
	if (typeof value !== "number") return false;
	return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;
}

// =============================================================================
// ID Generation
// =============================================================================

export function generateShelfId(): string {
	return `shelf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateItemId(): string {
	return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// =============================================================================
// Sanitization
// =============================================================================

import { stripHtml } from "../sanitize";

function sanitizeText(text: string | null | undefined, maxLength: number): string | null {
	if (!text) return null;
	const cleaned = stripHtml(text).trim();
	if (cleaned.length === 0) return null;
	if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
	return cleaned;
}

export function sanitizeShelfName(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_SHELF_NAME_LENGTH);
}

export function sanitizeTitle(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_ITEM_TITLE_LENGTH);
}

export function sanitizeCreator(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_CREATOR_LENGTH);
}

export function sanitizeDescription(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_DESCRIPTION_LENGTH);
}

export function sanitizeCategory(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_CATEGORY_LENGTH);
}

export function sanitizeNote(text: string | null | undefined): string | null {
	return sanitizeText(text, MAX_NOTE_LENGTH);
}

export function sanitizeRating(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	const num = Number(value);
	if (!isValidRating(num)) return null;
	return num;
}

// =============================================================================
// Favicon
// =============================================================================

export function buildFaviconUrl(siteUrl: string): string | null {
	try {
		const parsed = new URL(siteUrl);
		return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
	} catch {
		return null;
	}
}

// =============================================================================
// Display Mapping
// =============================================================================

export function toDisplayShelf(shelf: ShelfRecord, items: ItemRecord[]): ShelfDisplay {
	return {
		id: shelf.id,
		name: shelf.name,
		description: shelf.description,
		preset: shelf.preset,
		displayMode: shelf.displayMode,
		material: shelf.material,
		creatorLabel: shelf.creatorLabel,
		status1Label: shelf.status1Label,
		status2Label: shelf.status2Label,
		groupByCategory: shelf.groupByCategory,
		items: items
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((item) => ({
				id: item.id,
				url: item.url,
				title: item.title,
				creator: item.creator,
				description: item.description,
				coverUrl: item.coverUrl,
				category: item.category,
				isStatus1: item.isStatus1,
				isStatus2: item.isStatus2,
				rating: item.rating,
				note: item.note,
				thumbnailUrl: item.thumbnailUrl,
			})),
	};
}
