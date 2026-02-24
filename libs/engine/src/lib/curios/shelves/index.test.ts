import { describe, it, expect } from "vitest";
import {
	generateShelfId,
	generateItemId,
	isValidUrl,
	isValidPreset,
	isValidDisplayMode,
	isValidMaterial,
	isValidRating,
	sanitizeShelfName,
	sanitizeTitle,
	sanitizeCreator,
	sanitizeDescription,
	sanitizeCategory,
	sanitizeNote,
	sanitizeRating,
	buildFaviconUrl,
	toDisplayShelf,
	getPresetDefaults,
	getDefaultCategories,
	SHELF_PRESET_OPTIONS,
	SHELF_DISPLAY_MODE_OPTIONS,
	SHELF_MATERIAL_OPTIONS,
	VALID_PRESETS,
	VALID_DISPLAY_MODES,
	VALID_MATERIALS,
	DEFAULT_CATEGORIES_BOOKS,
	DEFAULT_CATEGORIES_LINKS,
	MAX_SHELF_NAME_LENGTH,
	MAX_ITEM_TITLE_LENGTH,
	MAX_CREATOR_LENGTH,
	MAX_DESCRIPTION_LENGTH,
	MAX_CATEGORY_LENGTH,
	MAX_NOTE_LENGTH,
	MAX_URL_LENGTH,
	MAX_SHELVES_PER_TENANT,
	MAX_ITEMS_PER_SHELF,
	type ShelfRecord,
	type ItemRecord,
} from "./index";

// =============================================================================
// Constants
// =============================================================================

describe("constants", () => {
	it("has 7 preset options", () => {
		expect(SHELF_PRESET_OPTIONS).toHaveLength(7);
	});

	it("has 5 display mode options", () => {
		expect(SHELF_DISPLAY_MODE_OPTIONS).toHaveLength(5);
	});

	it("has 3 material options", () => {
		expect(SHELF_MATERIAL_OPTIONS).toHaveLength(3);
	});

	it("has matching valid sets", () => {
		expect(VALID_PRESETS.size).toBe(7);
		expect(VALID_DISPLAY_MODES.size).toBe(5);
		expect(VALID_MATERIALS.size).toBe(3);
	});

	it("has sensible length limits", () => {
		expect(MAX_SHELF_NAME_LENGTH).toBe(100);
		expect(MAX_ITEM_TITLE_LENGTH).toBe(200);
		expect(MAX_CREATOR_LENGTH).toBe(100);
		expect(MAX_DESCRIPTION_LENGTH).toBe(500);
		expect(MAX_URL_LENGTH).toBe(2048);
		expect(MAX_NOTE_LENGTH).toBe(500);
	});

	it("has sensible quantity limits", () => {
		expect(MAX_SHELVES_PER_TENANT).toBe(50);
		expect(MAX_ITEMS_PER_SHELF).toBe(200);
	});

	it("has all option arrays with required fields", () => {
		for (const options of [
			SHELF_PRESET_OPTIONS,
			SHELF_DISPLAY_MODE_OPTIONS,
			SHELF_MATERIAL_OPTIONS,
		]) {
			for (const option of options) {
				expect(option.value).toBeTruthy();
				expect(option.label).toBeTruthy();
				expect(option.description).toBeTruthy();
			}
		}
	});

	it("has available flag on preset options (MVP: books, links, custom)", () => {
		const available = SHELF_PRESET_OPTIONS.filter((o) => o.available).map((o) => o.value);
		expect(available).toEqual(["books", "links", "custom"]);
		const unavailable = SHELF_PRESET_OPTIONS.filter((o) => !o.available).map((o) => o.value);
		expect(unavailable).toEqual(["music", "movies", "games", "recipes"]);
	});

	it("exports convenience category arrays", () => {
		expect(DEFAULT_CATEGORIES_BOOKS).toContain("Fiction");
		expect(DEFAULT_CATEGORIES_BOOKS).toContain("Technical");
		expect(DEFAULT_CATEGORIES_LINKS).toContain("Friends");
		expect(DEFAULT_CATEGORIES_LINKS).toContain("Blogs");
	});
});

// =============================================================================
// ID Generation
// =============================================================================

describe("generateShelfId", () => {
	it("generates shelf-prefixed IDs", () => {
		expect(generateShelfId()).toMatch(/^shelf_/);
	});

	it("generates unique IDs", () => {
		const ids = new Set(Array.from({ length: 10 }, () => generateShelfId()));
		expect(ids.size).toBe(10);
	});
});

describe("generateItemId", () => {
	it("generates item-prefixed IDs", () => {
		expect(generateItemId()).toMatch(/^item_/);
	});

	it("generates unique IDs", () => {
		const ids = new Set(Array.from({ length: 10 }, () => generateItemId()));
		expect(ids.size).toBe(10);
	});
});

// =============================================================================
// Validation
// =============================================================================

describe("isValidPreset", () => {
	it("accepts valid presets", () => {
		expect(isValidPreset("books")).toBe(true);
		expect(isValidPreset("links")).toBe(true);
		expect(isValidPreset("custom")).toBe(true);
	});

	it("rejects invalid presets", () => {
		expect(isValidPreset("invalid")).toBe(false);
		expect(isValidPreset("")).toBe(false);
	});
});

describe("isValidDisplayMode", () => {
	it("accepts valid display modes", () => {
		expect(isValidDisplayMode("cover-grid")).toBe(true);
		expect(isValidDisplayMode("card-list")).toBe(true);
		expect(isValidDisplayMode("buttons")).toBe(true);
		expect(isValidDisplayMode("spines")).toBe(true);
		expect(isValidDisplayMode("masonry")).toBe(true);
	});

	it("rejects invalid display modes", () => {
		expect(isValidDisplayMode("table")).toBe(false);
		expect(isValidDisplayMode("")).toBe(false);
	});
});

describe("isValidMaterial", () => {
	it("accepts valid materials", () => {
		expect(isValidMaterial("wood")).toBe(true);
		expect(isValidMaterial("glass")).toBe(true);
		expect(isValidMaterial("none")).toBe(true);
	});

	it("rejects invalid materials", () => {
		expect(isValidMaterial("metal")).toBe(false);
		expect(isValidMaterial("")).toBe(false);
	});
});

describe("isValidUrl", () => {
	it("accepts https URLs", () => {
		expect(isValidUrl("https://example.com")).toBe(true);
	});

	it("accepts http URLs", () => {
		expect(isValidUrl("http://example.com/page")).toBe(true);
	});

	it("rejects non-http protocols", () => {
		expect(isValidUrl("ftp://example.com")).toBe(false);
		expect(isValidUrl("javascript:alert(1)")).toBe(false);
	});

	it("rejects invalid URLs", () => {
		expect(isValidUrl("not a url")).toBe(false);
		expect(isValidUrl("")).toBe(false);
	});
});

describe("isValidRating", () => {
	it("accepts 1-5", () => {
		expect(isValidRating(1)).toBe(true);
		expect(isValidRating(3)).toBe(true);
		expect(isValidRating(5)).toBe(true);
	});

	it("rejects out of range", () => {
		expect(isValidRating(0)).toBe(false);
		expect(isValidRating(6)).toBe(false);
		expect(isValidRating(-1)).toBe(false);
	});

	it("rejects non-integers", () => {
		expect(isValidRating(3.5)).toBe(false);
		expect(isValidRating("3")).toBe(false);
		expect(isValidRating(null)).toBe(false);
	});
});

// =============================================================================
// Sanitization
// =============================================================================

describe("sanitizeShelfName", () => {
	it("strips HTML tags", () => {
		expect(sanitizeShelfName("<b>My Shelf</b>")).toBe("My Shelf");
	});

	it("truncates long names", () => {
		const long = "a".repeat(200);
		expect(sanitizeShelfName(long)?.length).toBe(MAX_SHELF_NAME_LENGTH);
	});

	it("returns null for empty input", () => {
		expect(sanitizeShelfName("")).toBe(null);
		expect(sanitizeShelfName(null)).toBe(null);
		expect(sanitizeShelfName(undefined)).toBe(null);
	});
});

describe("sanitizeTitle", () => {
	it("strips HTML tags", () => {
		expect(sanitizeTitle("<script>alert</script>Book")).toBe("alertBook");
	});

	it("truncates long titles", () => {
		const long = "t".repeat(300);
		expect(sanitizeTitle(long)?.length).toBe(MAX_ITEM_TITLE_LENGTH);
	});

	it("returns null for empty", () => {
		expect(sanitizeTitle("")).toBe(null);
	});
});

describe("sanitizeCreator", () => {
	it("strips HTML and returns cleaned", () => {
		expect(sanitizeCreator("<em>Author</em>")).toBe("Author");
	});

	it("truncates long creators", () => {
		const long = "a".repeat(200);
		expect(sanitizeCreator(long)?.length).toBe(MAX_CREATOR_LENGTH);
	});

	it("returns null for empty", () => {
		expect(sanitizeCreator(null)).toBe(null);
	});
});

describe("sanitizeDescription", () => {
	it("strips HTML", () => {
		expect(sanitizeDescription("<p>Desc</p>")).toBe("Desc");
	});

	it("truncates long descriptions", () => {
		const long = "d".repeat(600);
		expect(sanitizeDescription(long)?.length).toBe(MAX_DESCRIPTION_LENGTH);
	});
});

describe("sanitizeCategory", () => {
	it("strips HTML", () => {
		expect(sanitizeCategory("<b>Fiction</b>")).toBe("Fiction");
	});

	it("truncates long categories", () => {
		const long = "c".repeat(100);
		expect(sanitizeCategory(long)?.length).toBe(MAX_CATEGORY_LENGTH);
	});

	it("returns null for empty", () => {
		expect(sanitizeCategory("")).toBe(null);
	});
});

describe("sanitizeNote", () => {
	it("strips HTML", () => {
		expect(sanitizeNote("<b>Great book</b>")).toBe("Great book");
	});

	it("truncates long notes", () => {
		const long = "n".repeat(600);
		expect(sanitizeNote(long)?.length).toBe(MAX_NOTE_LENGTH);
	});

	it("returns null for empty", () => {
		expect(sanitizeNote("")).toBe(null);
		expect(sanitizeNote(null)).toBe(null);
	});
});

describe("sanitizeRating", () => {
	it("returns valid ratings", () => {
		expect(sanitizeRating(3)).toBe(3);
		expect(sanitizeRating(1)).toBe(1);
		expect(sanitizeRating(5)).toBe(5);
	});

	it("returns null for invalid", () => {
		expect(sanitizeRating(0)).toBe(null);
		expect(sanitizeRating(6)).toBe(null);
		expect(sanitizeRating("bad")).toBe(null);
	});

	it("returns null for empty/null", () => {
		expect(sanitizeRating(null)).toBe(null);
		expect(sanitizeRating(undefined)).toBe(null);
		expect(sanitizeRating("")).toBe(null);
	});
});

// =============================================================================
// Favicon
// =============================================================================

describe("buildFaviconUrl", () => {
	it("builds a Google favicon URL", () => {
		const result = buildFaviconUrl("https://example.com/page");
		expect(result).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32");
	});

	it("handles subdomains", () => {
		const result = buildFaviconUrl("https://blog.example.com");
		expect(result).toContain("blog.example.com");
	});

	it("returns null for invalid URLs", () => {
		expect(buildFaviconUrl("not-a-url")).toBeNull();
	});
});

// =============================================================================
// Preset Defaults
// =============================================================================

describe("getPresetDefaults", () => {
	it("returns books defaults", () => {
		const defaults = getPresetDefaults("books");
		expect(defaults.displayMode).toBe("spines");
		expect(defaults.material).toBe("wood");
		expect(defaults.creatorLabel).toBe("Author");
		expect(defaults.status1Label).toBe("Currently Reading");
		expect(defaults.autoFavicon).toBe(false);
	});

	it("returns links defaults", () => {
		const defaults = getPresetDefaults("links");
		expect(defaults.displayMode).toBe("card-list");
		expect(defaults.material).toBe("none");
		expect(defaults.creatorLabel).toBe("Source");
		expect(defaults.autoFavicon).toBe(true);
	});

	it("returns custom defaults as fallback", () => {
		const defaults = getPresetDefaults("custom");
		expect(defaults.displayMode).toBe("cover-grid");
		expect(defaults.creatorLabel).toBe("Creator");
	});
});

describe("getDefaultCategories", () => {
	it("returns books categories", () => {
		const cats = getDefaultCategories("books");
		expect(cats).toContain("Fiction");
		expect(cats).toContain("Technical");
		expect(cats.length).toBeGreaterThan(0);
	});

	it("returns links categories", () => {
		const cats = getDefaultCategories("links");
		expect(cats).toContain("Friends");
		expect(cats).toContain("Blogs");
	});

	it("returns empty for custom", () => {
		expect(getDefaultCategories("custom")).toEqual([]);
	});
});

// =============================================================================
// Display Mapping
// =============================================================================

describe("toDisplayShelf", () => {
	const shelf: ShelfRecord = {
		id: "shelf_1",
		tenantId: "t1",
		name: "My Books",
		description: "Favorites",
		preset: "books",
		displayMode: "spines",
		material: "wood",
		creatorLabel: "Author",
		status1Label: "Reading",
		status2Label: "Favorite",
		isFeatured: false,
		groupByCategory: false,
		autoFavicon: false,
		sortOrder: 0,
		createdAt: "2026-01-01",
	};

	const items: ItemRecord[] = [
		{
			id: "item_2",
			tenantId: "t1",
			shelfId: "shelf_1",
			url: "https://b.com",
			title: "Book B",
			creator: "Author B",
			description: null,
			coverUrl: null,
			category: "Fiction",
			isStatus1: false,
			isStatus2: true,
			rating: 4,
			note: "Great read",
			thumbnailUrl: null,
			sortOrder: 1,
			addedAt: "2026-01-02",
		},
		{
			id: "item_1",
			tenantId: "t1",
			shelfId: "shelf_1",
			url: "https://a.com",
			title: "Book A",
			creator: "Author A",
			description: "First book",
			coverUrl: "https://covers.com/a.jpg",
			category: "Technical",
			isStatus1: true,
			isStatus2: false,
			rating: null,
			note: null,
			thumbnailUrl: null,
			sortOrder: 0,
			addedAt: "2026-01-01",
		},
	];

	it("transforms shelf and items to display format", () => {
		const display = toDisplayShelf(shelf, items);
		expect(display.id).toBe("shelf_1");
		expect(display.name).toBe("My Books");
		expect(display.preset).toBe("books");
		expect(display.displayMode).toBe("spines");
		expect(display.material).toBe("wood");
		expect(display.items).toHaveLength(2);
	});

	it("sorts items by sortOrder", () => {
		const display = toDisplayShelf(shelf, items);
		expect(display.items[0].title).toBe("Book A");
		expect(display.items[1].title).toBe("Book B");
	});

	it("excludes internal fields from items", () => {
		const display = toDisplayShelf(shelf, items);
		const item = display.items[0] as Record<string, unknown>;
		expect(item).not.toHaveProperty("tenantId");
		expect(item).not.toHaveProperty("shelfId");
		expect(item).not.toHaveProperty("sortOrder");
	});

	it("preserves new fields (rating, note, thumbnailUrl)", () => {
		const display = toDisplayShelf(shelf, items);
		expect(display.items[1].rating).toBe(4);
		expect(display.items[1].note).toBe("Great read");
		expect(display.items[0].rating).toBe(null);
	});

	it("handles empty items", () => {
		const display = toDisplayShelf(shelf, []);
		expect(display.items).toHaveLength(0);
	});
});
