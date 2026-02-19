/**
 * Gallery Curio - Tests
 *
 * Tests for gallery-specific utilities: image validation, record transformation,
 * ID generation, and slug generation.
 * Following Grove testing philosophy: test behavior, not implementation.
 */

import { describe, it, expect } from "vitest";
import {
  isSupportedImage,
  toDisplayImage,
  generateGalleryId,
  generateSlug,
  sanitizeCustomCss,
  SUPPORTED_IMAGE_EXTENSIONS,
  DEFAULT_GALLERY_CONFIG,
  MAX_CUSTOM_CSS_LENGTH,
  type GalleryImageRecord,
  type GalleryTagRecord,
} from "./index";

// =============================================================================
// isSupportedImage - File extension validation
// =============================================================================

describe("isSupportedImage", () => {
  describe("supported extensions", () => {
    it("accepts .jpg files", () => {
      expect(isSupportedImage("photo.jpg")).toBe(true);
    });

    it("accepts .jpeg files", () => {
      expect(isSupportedImage("photo.jpeg")).toBe(true);
    });

    it("accepts .png files", () => {
      expect(isSupportedImage("screenshot.png")).toBe(true);
    });

    it("accepts .gif files", () => {
      expect(isSupportedImage("animation.gif")).toBe(true);
    });

    it("accepts .webp files", () => {
      expect(isSupportedImage("optimized.webp")).toBe(true);
    });

    it("accepts .avif files", () => {
      expect(isSupportedImage("modern.avif")).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("accepts uppercase .JPG", () => {
      expect(isSupportedImage("PHOTO.JPG")).toBe(true);
    });

    it("accepts mixed case .Png", () => {
      expect(isSupportedImage("image.Png")).toBe(true);
    });

    it("accepts uppercase .WEBP", () => {
      expect(isSupportedImage("file.WEBP")).toBe(true);
    });
  });

  describe("unsupported extensions", () => {
    it("rejects .txt files", () => {
      expect(isSupportedImage("readme.txt")).toBe(false);
    });

    it("rejects .pdf files", () => {
      expect(isSupportedImage("document.pdf")).toBe(false);
    });

    it("rejects .svg files", () => {
      expect(isSupportedImage("vector.svg")).toBe(false);
    });

    it("rejects .bmp files", () => {
      expect(isSupportedImage("old.bmp")).toBe(false);
    });

    it("rejects .tiff files", () => {
      expect(isSupportedImage("scan.tiff")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles files with multiple dots", () => {
      expect(isSupportedImage("my.photo.name.jpg")).toBe(true);
    });

    it("handles files in directories", () => {
      expect(isSupportedImage("photos/vacation/beach.png")).toBe(true);
    });

    it("handles files without extension", () => {
      expect(isSupportedImage("noextension")).toBe(false);
    });

    it("handles empty string", () => {
      expect(isSupportedImage("")).toBe(false);
    });

    it("rejects files that contain but don't end with extension", () => {
      expect(isSupportedImage("photo.jpg.backup")).toBe(false);
    });
  });
});

// =============================================================================
// toDisplayImage - Transform database record to display format
// =============================================================================

describe("toDisplayImage", () => {
  const cdnBaseUrl = "https://cdn.example.com";

  const createRecord = (
    overrides: Partial<GalleryImageRecord> = {},
  ): GalleryImageRecord => ({
    id: "gal_123",
    tenantId: "tenant_1",
    r2Key: "photos/sunset.jpg",
    parsedDate: "2024-06-15",
    parsedCategory: "photos",
    parsedSlug: "sunset",
    customTitle: null,
    customDescription: null,
    customDate: null,
    altText: null,
    fileSize: 1024000,
    uploadedAt: "2024-06-15T12:00:00Z",
    cdnUrl: null,
    width: 1920,
    height: 1080,
    sortIndex: 0,
    isFeatured: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  describe("URL generation", () => {
    it("uses cdnUrl when available", () => {
      const record = createRecord({
        cdnUrl: "https://images.custom.com/photo.jpg",
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.url).toBe("https://images.custom.com/photo.jpg");
    });

    it("constructs URL from cdnBaseUrl and r2Key when no cdnUrl", () => {
      const record = createRecord({ cdnUrl: null });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.url).toBe("https://cdn.example.com/photos/sunset.jpg");
    });
  });

  describe("title generation", () => {
    it("uses customTitle when present", () => {
      const record = createRecord({ customTitle: "Golden Hour Sunset" });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.title).toBe("Golden Hour Sunset");
    });

    it("converts parsedSlug to Title Case when no customTitle", () => {
      const record = createRecord({
        customTitle: null,
        parsedSlug: "forest-walk-morning",
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.title).toBe("Forest Walk Morning");
    });

    it("returns 'Untitled' when no title source available", () => {
      const record = createRecord({
        customTitle: null,
        parsedSlug: null,
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.title).toBe("Untitled");
    });
  });

  describe("date handling", () => {
    it("prefers customDate over parsedDate", () => {
      const record = createRecord({
        customDate: "2025-01-01",
        parsedDate: "2024-06-15",
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.date).toBe("2025-01-01");
    });

    it("falls back to parsedDate when no customDate", () => {
      const record = createRecord({
        customDate: null,
        parsedDate: "2024-06-15",
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.date).toBe("2024-06-15");
    });

    it("returns null when no date available", () => {
      const record = createRecord({
        customDate: null,
        parsedDate: null,
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.date).toBeNull();
    });
  });

  describe("metadata passthrough", () => {
    it("includes all basic fields", () => {
      const record = createRecord({
        customDescription: "A beautiful sunset over the ocean",
        altText: "Sunset at the beach",
        fileSize: 2048000,
        width: 3840,
        height: 2160,
        isFeatured: true,
      });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.id).toBe("gal_123");
      expect(display.r2Key).toBe("photos/sunset.jpg");
      expect(display.description).toBe("A beautiful sunset over the ocean");
      expect(display.category).toBe("photos");
      expect(display.altText).toBe("Sunset at the beach");
      expect(display.fileSize).toBe(2048000);
      expect(display.width).toBe(3840);
      expect(display.height).toBe(2160);
      expect(display.isFeatured).toBe(true);
    });
  });

  describe("tags handling", () => {
    it("includes tags when present", () => {
      const tags: GalleryTagRecord[] = [
        {
          id: "tag_1",
          tenantId: "tenant_1",
          name: "Nature",
          slug: "nature",
          color: "#5cb85f",
          description: null,
          sortOrder: 0,
          createdAt: Date.now(),
        },
      ];

      const record = createRecord({ tags });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.tags).toHaveLength(1);
      expect(display.tags[0].name).toBe("Nature");
    });

    it("returns empty array when no tags", () => {
      const record = createRecord({ tags: undefined });

      const display = toDisplayImage(record, cdnBaseUrl);

      expect(display.tags).toEqual([]);
    });
  });
});

// =============================================================================
// generateGalleryId - Unique ID generation
// =============================================================================

describe("generateGalleryId", () => {
  it("generates ID with correct prefix", () => {
    const id = generateGalleryId();

    expect(id).toMatch(/^gal_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateGalleryId());
    }

    expect(ids.size).toBe(100);
  });

  it("generates IDs of reasonable length", () => {
    const id = generateGalleryId();

    // gal_ (4) + timestamp base36 (~8-9) + _ (1) + random (6) = ~19-20 chars
    expect(id.length).toBeGreaterThan(10);
    expect(id.length).toBeLessThan(30);
  });

  it("generates IDs with alphanumeric characters after prefix", () => {
    const id = generateGalleryId();
    const afterPrefix = id.slice(4); // Remove "gal_"

    expect(afterPrefix).toMatch(/^[a-z0-9_]+$/);
  });
});

// =============================================================================
// generateSlug - URL-safe slug generation
// =============================================================================

describe("generateSlug", () => {
  describe("basic transformations", () => {
    it("converts spaces to hyphens", () => {
      expect(generateSlug("hello world")).toBe("hello-world");
    });

    it("lowercases text", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
    });

    it("handles multiple spaces", () => {
      expect(generateSlug("hello   world")).toBe("hello-world");
    });
  });

  describe("special character handling", () => {
    it("removes special characters", () => {
      expect(generateSlug("hello@world!")).toBe("helloworld");
    });

    it("removes punctuation", () => {
      expect(generateSlug("hello, world.")).toBe("hello-world");
    });

    it("removes parentheses", () => {
      expect(generateSlug("photo (copy)")).toBe("photo-copy");
    });

    it("preserves numbers", () => {
      expect(generateSlug("photo 2024")).toBe("photo-2024");
    });
  });

  describe("edge cases", () => {
    it("handles leading/trailing spaces", () => {
      expect(generateSlug("  hello world  ")).toBe("hello-world");
    });

    it("removes leading/trailing hyphens", () => {
      expect(generateSlug("-hello-")).toBe("hello");
    });

    it("collapses multiple hyphens", () => {
      expect(generateSlug("hello---world")).toBe("hello-world");
    });

    it("handles empty string", () => {
      expect(generateSlug("")).toBe("");
    });

    it("handles string with only special chars", () => {
      expect(generateSlug("@#$%")).toBe("");
    });
  });

  describe("real-world examples", () => {
    it("handles image title", () => {
      expect(generateSlug("Beach Sunset (2024)")).toBe("beach-sunset-2024");
    });

    it("handles tag name", () => {
      expect(generateSlug("Nature & Wildlife")).toBe("nature-wildlife");
    });

    it("handles collection name", () => {
      expect(generateSlug("My Vacation Photos!")).toBe("my-vacation-photos");
    });
  });
});

// =============================================================================
// sanitizeCustomCss - CSS security sanitization
// =============================================================================

describe("sanitizeCustomCss", () => {
  it("returns null for null/undefined/empty", () => {
    expect(sanitizeCustomCss(null)).toBeNull();
    expect(sanitizeCustomCss(undefined)).toBeNull();
    expect(sanitizeCustomCss("")).toBeNull();
    expect(sanitizeCustomCss("   ")).toBeNull();
  });

  it("preserves safe CSS", () => {
    expect(sanitizeCustomCss(".gallery { color: red; }")).toBe(
      ".gallery { color: red; }",
    );
    expect(sanitizeCustomCss("body { background: #fff; }")).toBe(
      "body { background: #fff; }",
    );
  });

  it("strips url() calls (data exfiltration risk)", () => {
    const result = sanitizeCustomCss(
      '.gallery { background: url("https://evil.com/track"); }',
    );
    expect(result).not.toContain("url(");
    expect(result).toContain("/* removed */");
  });

  it("strips @import rules", () => {
    const result = sanitizeCustomCss(
      '@import url("https://evil.com/inject.css"); .gallery {}',
    );
    expect(result).not.toContain("@import");
  });

  it("strips expression() calls", () => {
    const result = sanitizeCustomCss(
      ".gallery { width: expression(document.cookie); }",
    );
    expect(result).not.toContain("expression(");
  });

  it("strips javascript: protocol", () => {
    const result = sanitizeCustomCss(
      ".gallery { background: javascript:alert(1); }",
    );
    expect(result).not.toContain("javascript:");
  });

  it("strips script tags", () => {
    const result = sanitizeCustomCss(".gallery {} <script>alert(1)</script>");
    expect(result).not.toContain("<script");
  });

  it("enforces length limit", () => {
    const longCss = ".a{color:red}".repeat(10000);
    const result = sanitizeCustomCss(longCss);
    expect(result!.length).toBeLessThanOrEqual(MAX_CUSTOM_CSS_LENGTH);
  });
});

// =============================================================================
// Constants validation
// =============================================================================

describe("Constants", () => {
  describe("SUPPORTED_IMAGE_EXTENSIONS", () => {
    it("includes common web image formats", () => {
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".jpg");
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".jpeg");
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".png");
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".gif");
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".webp");
    });

    it("includes modern format avif", () => {
      expect(SUPPORTED_IMAGE_EXTENSIONS).toContain(".avif");
    });

    it("has extensions in lowercase with leading dot", () => {
      SUPPORTED_IMAGE_EXTENSIONS.forEach((ext) => {
        expect(ext).toMatch(/^\.[a-z]+$/);
      });
    });
  });

  describe("DEFAULT_GALLERY_CONFIG", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_GALLERY_CONFIG.enabled).toBe(false);
      expect(DEFAULT_GALLERY_CONFIG.itemsPerPage).toBeGreaterThan(0);
      expect(DEFAULT_GALLERY_CONFIG.itemsPerPage).toBeLessThanOrEqual(100);
      expect(DEFAULT_GALLERY_CONFIG.sortOrder).toBe("date-desc");
      expect(DEFAULT_GALLERY_CONFIG.gridStyle).toBe("masonry");
    });

    it("has feature toggles enabled by default", () => {
      expect(DEFAULT_GALLERY_CONFIG.enableLightbox).toBe(true);
      expect(DEFAULT_GALLERY_CONFIG.enableSearch).toBe(true);
      expect(DEFAULT_GALLERY_CONFIG.enableFilters).toBe(true);
    });

    it("has display options enabled by default", () => {
      expect(DEFAULT_GALLERY_CONFIG.showDescriptions).toBe(true);
      expect(DEFAULT_GALLERY_CONFIG.showDates).toBe(true);
      expect(DEFAULT_GALLERY_CONFIG.showTags).toBe(true);
    });
  });
});
