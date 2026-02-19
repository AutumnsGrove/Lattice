import { describe, it, expect } from "vitest";
import {
  generateShelfId,
  generateBookmarkId,
  isValidUrl,
  sanitizeShelfName,
  sanitizeTitle,
  sanitizeAuthor,
  sanitizeDescription,
  sanitizeCategory,
  toDisplayBookmark,
  DEFAULT_CATEGORIES,
  MAX_SHELF_NAME_LENGTH,
  MAX_BOOKMARK_TITLE_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_URL_LENGTH,
  type BookmarkRecord,
} from "./index";

describe("Bookmarkshelf constants", () => {
  it("has default categories", () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
    expect(DEFAULT_CATEGORIES).toContain("Fiction");
    expect(DEFAULT_CATEGORIES).toContain("Technical");
  });

  it("has sensible length limits", () => {
    expect(MAX_SHELF_NAME_LENGTH).toBe(100);
    expect(MAX_BOOKMARK_TITLE_LENGTH).toBe(200);
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});

describe("generateShelfId", () => {
  it("generates shelf-prefixed IDs", () => {
    const id = generateShelfId();
    expect(id).toMatch(/^shelf_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateShelfId()));
    expect(ids.size).toBe(10);
  });
});

describe("generateBookmarkId", () => {
  it("generates bm-prefixed IDs", () => {
    const id = generateBookmarkId();
    expect(id).toMatch(/^bm_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateBookmarkId()));
    expect(ids.size).toBe(10);
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
    expect(sanitizeTitle(long)?.length).toBe(MAX_BOOKMARK_TITLE_LENGTH);
  });

  it("returns null for empty", () => {
    expect(sanitizeTitle("")).toBe(null);
  });
});

describe("sanitizeAuthor", () => {
  it("strips HTML and returns cleaned", () => {
    expect(sanitizeAuthor("<em>Author</em>")).toBe("Author");
  });

  it("truncates long authors", () => {
    const long = "a".repeat(200);
    expect(sanitizeAuthor(long)?.length).toBe(MAX_AUTHOR_LENGTH);
  });

  it("returns null for empty", () => {
    expect(sanitizeAuthor(null)).toBe(null);
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

describe("toDisplayBookmark", () => {
  it("transforms record to display", () => {
    const record: BookmarkRecord = {
      id: "bm_1",
      tenantId: "t1",
      shelfId: "shelf_1",
      url: "https://example.com",
      title: "My Book",
      author: "Author",
      description: "A great book",
      coverUrl: null,
      category: "Fiction",
      isCurrentlyReading: true,
      isFavorite: false,
      sortOrder: 0,
      addedAt: "2025-01-01",
    };
    const display = toDisplayBookmark(record);
    expect(display).toEqual({
      id: "bm_1",
      url: "https://example.com",
      title: "My Book",
      author: "Author",
      description: "A great book",
      coverUrl: null,
      category: "Fiction",
      isCurrentlyReading: true,
      isFavorite: false,
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("shelfId");
    expect(display).not.toHaveProperty("sortOrder");
  });
});
