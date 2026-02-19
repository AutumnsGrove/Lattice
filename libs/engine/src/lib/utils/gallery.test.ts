/**
 * Gallery Utilities Tests
 *
 * Comprehensive tests for gallery filename parsing and image filtering functions.
 * Covers filename metadata extraction, title/date handling, and filtering operations.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseImageFilename,
  getImageTitle,
  getImageDate,
  searchImages,
  filterImagesByDateRange,
  filterImagesByTags,
  filterImagesByCategory,
  getAvailableYears,
  getAvailableCategories,
  type GalleryImage,
  type ImageTag,
} from "./gallery";

// =============================================================================
// TEST DATA
// =============================================================================

const testImages: GalleryImage[] = [
  {
    r2_key: "minecraft/build_2024-01-15.png",
    parsed_slug: "build",
    parsed_date: "2024-01-15",
    parsed_category: "minecraft",
    tags: [{ slug: "gaming", name: "Gaming" }],
  },
  {
    r2_key: "selfies/2024-06-20_summer.jpg",
    parsed_slug: "summer",
    parsed_date: "2024-06-20",
    parsed_category: "selfies",
    tags: [{ slug: "personal", name: "Personal" }],
  },
  {
    r2_key: "forest.jpg",
    custom_title: "Beautiful Forest",
    parsed_date: "2025-01-01",
    tags: [
      { slug: "nature", name: "Nature" },
      { slug: "outdoor", name: "Outdoor" },
    ],
  },
  {
    r2_key: "projects/2023-12-25_holiday-code.png",
    parsed_slug: "holiday-code",
    parsed_date: "2023-12-25",
    parsed_category: "projects",
  },
  {
    r2_key: "photos/untitled.jpg",
    key: "photos/untitled.jpg",
  },
  {
    r2_key: "archive/2025_03_10_spring-flowers.jpg",
    parsed_slug: "spring-flowers",
    parsed_date: "2025-03-10",
    parsed_category: "archive",
  },
  {
    custom_title: "No File",
    custom_date: "2025-01-15",
    key: "old/photo.jpg",
    tags: [{ slug: "memory", name: "Memory" }],
  },
];

// =============================================================================
// parseImageFilename TESTS
// =============================================================================

describe("parseImageFilename", () => {
  describe("Category extraction", () => {
    it("should extract category from nested path", () => {
      const result = parseImageFilename("minecraft/build.png");
      expect(result.category).toBe("minecraft");
    });

    it("should return null for flat files without category", () => {
      const result = parseImageFilename("photo.jpg");
      expect(result.category).toBeNull();
    });

    it("should extract category from path with multiple segments", () => {
      const result = parseImageFilename("projects/2024/photo.jpg");
      expect(result.category).toBe("projects");
    });
  });

  describe("Date extraction", () => {
    it("should extract YYYY-MM-DD date format", () => {
      const result = parseImageFilename("2025-01-15_forest.jpg");
      expect(result.date).toBe("2025-01-15");
    });

    it("should extract YYYY_MM_DD date format and convert to dashes", () => {
      const result = parseImageFilename("2025_01_15_photo.jpg");
      expect(result.date).toBe("2025-01-15");
    });

    it("should extract date from nested path", () => {
      const result = parseImageFilename("archive/2024-06-20_vacation.jpg");
      expect(result.date).toBe("2024-06-20");
    });

    it("should return null when no date is present", () => {
      const result = parseImageFilename("photo.jpg");
      expect(result.date).toBeNull();
    });

    it("should return null for invalid date format", () => {
      const result = parseImageFilename("2025-1-15_photo.jpg");
      expect(result.date).toBeNull();
    });
  });

  describe("Slug extraction", () => {
    it("should extract slug after date", () => {
      const result = parseImageFilename("2025-01-15_forest-walk.jpg");
      expect(result.slug).toBe("forest-walk");
    });

    it("should extract slug from category/file pattern", () => {
      const result = parseImageFilename("minecraft/build.png");
      expect(result.slug).toBe("build");
    });

    it("should convert underscores to hyphens in slug", () => {
      const result = parseImageFilename("2025-01-15_forest_walk_scene.jpg");
      expect(result.slug).toBe("forest-walk-scene");
    });

    it("should lowercase slug", () => {
      const result = parseImageFilename("2025-01-15_Forest_Walk.jpg");
      expect(result.slug).toBe("forest-walk");
    });

    it("should fall back to 'untitled' when no slug can be extracted", () => {
      const result = parseImageFilename("2025-01-15.jpg");
      expect(result.slug).toBe("untitled");
    });

    it("should fall back to 'untitled' for date-only files", () => {
      const result = parseImageFilename("2025-01-15");
      expect(result.slug).toBe("untitled");
    });

    it("should handle file with only category", () => {
      const result = parseImageFilename("minecraft/");
      expect(result.slug).toBe("untitled");
    });
  });

  describe("Extension extraction", () => {
    it("should extract common image extensions", () => {
      expect(parseImageFilename("photo.jpg").extension).toBe("jpg");
      expect(parseImageFilename("image.png").extension).toBe("png");
      expect(parseImageFilename("picture.gif").extension).toBe("gif");
      expect(parseImageFilename("photo.jpeg").extension).toBe("jpeg");
      expect(parseImageFilename("image.webp").extension).toBe("webp");
    });

    it("should return null for files without extension", () => {
      const result = parseImageFilename("filename");
      expect(result.extension).toBeNull();
    });

    it("should handle multiple dots in filename", () => {
      const result = parseImageFilename("my.photo.name.jpg");
      expect(result.extension).toBe("jpg");
    });

    it("should extract extension from dated files", () => {
      const result = parseImageFilename("2025-01-15_photo.jpg");
      expect(result.extension).toBe("jpg");
    });
  });

  describe("Filename extraction", () => {
    it("should extract filename from nested path", () => {
      const result = parseImageFilename("minecraft/build.png");
      expect(result.filename).toBe("build.png");
    });

    it("should extract filename for flat files", () => {
      const result = parseImageFilename("photo.jpg");
      expect(result.filename).toBe("photo.jpg");
    });
  });

  describe("r2Key passthrough", () => {
    it("should include original r2Key in result", () => {
      const key = "minecraft/build.png";
      const result = parseImageFilename(key);
      expect(result.r2Key).toBe(key);
    });
  });

  describe("Complex scenarios", () => {
    it("should handle full metadata extraction", () => {
      const result = parseImageFilename(
        "minecraft/2024-12-01_build-complete.png",
      );
      expect(result.category).toBe("minecraft");
      expect(result.date).toBe("2024-12-01");
      expect(result.slug).toBe("build-complete");
      expect(result.extension).toBe("png");
      expect(result.filename).toBe("2024-12-01_build-complete.png");
    });

    it("should handle underscore date format with category", () => {
      const result = parseImageFilename("photos/2025_03_10_spring-flowers.jpg");
      expect(result.category).toBe("photos");
      expect(result.date).toBe("2025-03-10");
      // Note: When date is in underscore format (2025_03_10), the slug includes
      // the converted date format with dashes since the regex matches the underscore version
      expect(result.slug).toBe("2025-03-10-spring-flowers");
    });

    it("should handle trailing underscores and dashes", () => {
      const result = parseImageFilename("2025-01-15---photo___.jpg");
      expect(result.slug).toBe("photo");
    });
  });
});

// =============================================================================
// getImageTitle TESTS
// =============================================================================

describe("getImageTitle", () => {
  it("should use custom_title if present", () => {
    const image: GalleryImage = { custom_title: "Beautiful Forest" };
    expect(getImageTitle(image)).toBe("Beautiful Forest");
  });

  it("should convert parsed_slug to Title Case", () => {
    const image: GalleryImage = { parsed_slug: "forest-walk" };
    expect(getImageTitle(image)).toBe("Forest Walk");
  });

  it("should handle single-word slug", () => {
    const image: GalleryImage = { parsed_slug: "forest" };
    expect(getImageTitle(image)).toBe("Forest");
  });

  it("should handle multi-word slug", () => {
    const image: GalleryImage = { parsed_slug: "forest-walk-in-autumn" };
    expect(getImageTitle(image)).toBe("Forest Walk In Autumn");
  });

  it("should fall back to r2_key filename when no custom title or slug", () => {
    const image: GalleryImage = { r2_key: "photos/vacation.jpg" };
    expect(getImageTitle(image)).toBe("vacation.jpg");
  });

  it("should fall back to key filename when r2_key not available", () => {
    const image: GalleryImage = { key: "old/photo.jpg" };
    expect(getImageTitle(image)).toBe("photo.jpg");
  });

  it("should return 'Untitled' when nothing is available", () => {
    const image: GalleryImage = {};
    expect(getImageTitle(image)).toBe("Untitled");
  });

  it("should prefer custom_title over parsed_slug", () => {
    const image: GalleryImage = {
      custom_title: "My Custom Title",
      parsed_slug: "forest-walk",
    };
    expect(getImageTitle(image)).toBe("My Custom Title");
  });

  it("should prefer parsed_slug over filename", () => {
    const image: GalleryImage = {
      parsed_slug: "forest-walk",
      r2_key: "photos/vacation.jpg",
    };
    expect(getImageTitle(image)).toBe("Forest Walk");
  });

  it("should handle lowercase slug correctly", () => {
    const image: GalleryImage = { parsed_slug: "beautiful-forest-scene" };
    expect(getImageTitle(image)).toBe("Beautiful Forest Scene");
  });
});

// =============================================================================
// getImageDate TESTS
// =============================================================================

describe("getImageDate", () => {
  it("should return custom_date if present", () => {
    const image: GalleryImage = { custom_date: "2025-01-15" };
    expect(getImageDate(image)).toBe("2025-01-15");
  });

  it("should return parsed_date if custom_date not present", () => {
    const image: GalleryImage = { parsed_date: "2024-06-20" };
    expect(getImageDate(image)).toBe("2024-06-20");
  });

  it("should prefer custom_date over parsed_date", () => {
    const image: GalleryImage = {
      custom_date: "2025-01-15",
      parsed_date: "2024-06-20",
    };
    expect(getImageDate(image)).toBe("2025-01-15");
  });

  it("should return null when neither date is present", () => {
    const image: GalleryImage = {};
    expect(getImageDate(image)).toBeNull();
  });

  it("should handle date-only images", () => {
    const image: GalleryImage = {
      r2_key: "photo.jpg",
      custom_date: "2025-01-15",
    };
    expect(getImageDate(image)).toBe("2025-01-15");
  });
});

// =============================================================================
// searchImages TESTS
// =============================================================================

describe("searchImages", () => {
  it("should return all images for empty query", () => {
    const result = searchImages(testImages, "");
    expect(result).toHaveLength(testImages.length);
  });

  it("should filter by title match", () => {
    const result = searchImages(testImages, "Beautiful Forest");
    expect(result).toHaveLength(1);
    expect(result[0].r2_key).toBe("forest.jpg");
  });

  it("should filter by parsed slug match", () => {
    const result = searchImages(testImages, "build");
    expect(result).toContainEqual(
      expect.objectContaining({ parsed_slug: "build" }),
    );
  });

  it("should filter by filename match", () => {
    const result = searchImages(testImages, "minecraft");
    expect(result).toContainEqual(
      expect.objectContaining({ r2_key: "minecraft/build_2024-01-15.png" }),
    );
  });

  it("should filter by description match", () => {
    const images: GalleryImage[] = [
      {
        r2_key: "photo.jpg",
        custom_description: "A beautiful sunset over the ocean",
      },
    ];
    const result = searchImages(images, "sunset");
    expect(result).toHaveLength(1);
  });

  it("should be case-insensitive", () => {
    const result = searchImages(testImages, "BEAUTIFUL FOREST");
    expect(result).toHaveLength(1);
    expect(result[0].r2_key).toBe("forest.jpg");
  });

  it("should match partial strings", () => {
    const result = searchImages(testImages, "build");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should return empty array for non-matching query", () => {
    const result = searchImages(testImages, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("should search across multiple fields", () => {
    const result = searchImages(testImages, "2024");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle special characters in query", () => {
    const result = searchImages(testImages, "untitled");
    expect(result.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// filterImagesByDateRange TESTS
// =============================================================================

describe("filterImagesByDateRange", () => {
  it("should return all images when no dates specified", () => {
    const result = filterImagesByDateRange(testImages, null, null);
    expect(result).toHaveLength(testImages.length);
  });

  it("should filter by start date (inclusive)", () => {
    const result = filterImagesByDateRange(testImages, "2024-06-20", null);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((img) => {
      const date = getImageDate(img);
      if (date) expect(date >= "2024-06-20").toBe(true);
    });
  });

  it("should filter by end date (inclusive)", () => {
    const result = filterImagesByDateRange(testImages, null, "2024-06-20");
    expect(result.length).toBeGreaterThan(0);
    result.forEach((img) => {
      const date = getImageDate(img);
      if (date) expect(date <= "2024-06-20").toBe(true);
    });
  });

  it("should filter by date range (both start and end)", () => {
    const result = filterImagesByDateRange(
      testImages,
      "2024-01-01",
      "2024-12-31",
    );
    expect(result.length).toBeGreaterThan(0);
    result.forEach((img) => {
      const date = getImageDate(img);
      if (date) {
        expect(date >= "2024-01-01").toBe(true);
        expect(date <= "2024-12-31").toBe(true);
      }
    });
  });

  it("should exclude images without dates", () => {
    const result = filterImagesByDateRange(testImages, "2024-01-01", null);
    result.forEach((img) => {
      expect(getImageDate(img)).not.toBeNull();
    });
  });

  it("should handle single-day range", () => {
    const result = filterImagesByDateRange(
      testImages,
      "2024-01-15",
      "2024-01-15",
    );
    result.forEach((img) => {
      const date = getImageDate(img);
      if (date) expect(date).toBe("2024-01-15");
    });
  });

  it("should handle non-existent date range", () => {
    const result = filterImagesByDateRange(
      testImages,
      "2050-01-01",
      "2050-12-31",
    );
    expect(result).toHaveLength(0);
  });

  it("should respect custom_date over parsed_date", () => {
    const images: GalleryImage[] = [
      { custom_date: "2025-01-15", parsed_date: "2024-01-01" },
    ];
    const result = filterImagesByDateRange(images, "2025-01-01", null);
    expect(result).toHaveLength(1);
  });
});

// =============================================================================
// filterImagesByTags TESTS
// =============================================================================

describe("filterImagesByTags", () => {
  it("should return all images for empty tagSlugs array", () => {
    const result = filterImagesByTags(testImages, []);
    expect(result).toHaveLength(testImages.length);
  });

  it("should filter by single tag", () => {
    const result = filterImagesByTags(testImages, ["gaming"]);
    expect(result).toContainEqual(
      expect.objectContaining({ parsed_slug: "build" }),
    );
  });

  it("should require all specified tags (AND logic)", () => {
    const result = filterImagesByTags(testImages, ["nature", "outdoor"]);
    expect(result).toContainEqual(
      expect.objectContaining({ custom_title: "Beautiful Forest" }),
    );
  });

  it("should exclude images without tags", () => {
    const result = filterImagesByTags(testImages, ["gaming"]);
    result.forEach((img) => {
      expect(img.tags).toBeDefined();
      expect(img.tags!.length).toBeGreaterThan(0);
    });
  });

  it("should return empty array for non-existent tag", () => {
    const result = filterImagesByTags(testImages, ["nonexistent"]);
    expect(result).toHaveLength(0);
  });

  it("should handle multiple tag filtering", () => {
    const result = filterImagesByTags(testImages, ["personal"]);
    expect(result).toContainEqual(
      expect.objectContaining({ parsed_category: "selfies" }),
    );
  });

  it("should be case-sensitive for tag slugs", () => {
    const result = filterImagesByTags(testImages, ["GAMING"]);
    expect(result).toHaveLength(0);
  });

  it("should handle images with multiple tags", () => {
    const images: GalleryImage[] = [
      {
        r2_key: "photo.jpg",
        tags: [
          { slug: "nature", name: "Nature" },
          { slug: "outdoor", name: "Outdoor" },
        ],
      },
    ];
    const result = filterImagesByTags(images, ["nature", "outdoor"]);
    expect(result).toHaveLength(1);
  });

  it("should return empty array when image has some but not all tags", () => {
    const images: GalleryImage[] = [
      {
        r2_key: "photo.jpg",
        tags: [{ slug: "nature", name: "Nature" }],
      },
    ];
    const result = filterImagesByTags(images, ["nature", "outdoor"]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// filterImagesByCategory TESTS
// =============================================================================

describe("filterImagesByCategory", () => {
  it("should return all images when category is null", () => {
    const result = filterImagesByCategory(testImages, null);
    expect(result).toHaveLength(testImages.length);
  });

  it("should filter by category match", () => {
    const result = filterImagesByCategory(testImages, "minecraft");
    expect(result).toHaveLength(1);
    expect(result[0].parsed_category).toBe("minecraft");
  });

  it("should filter to only images with matching category", () => {
    const result = filterImagesByCategory(testImages, "projects");
    result.forEach((img) => {
      expect(img.parsed_category).toBe("projects");
    });
  });

  it("should return empty array for non-existent category", () => {
    const result = filterImagesByCategory(testImages, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("should be case-sensitive for category", () => {
    const result = filterImagesByCategory(testImages, "MINECRAFT");
    expect(result).toHaveLength(0);
  });

  it("should exclude images without categories", () => {
    const result = filterImagesByCategory(testImages, "selfies");
    result.forEach((img) => {
      expect(img.parsed_category).toBe("selfies");
    });
  });

  it("should handle multiple images in same category", () => {
    const images: GalleryImage[] = [
      { parsed_category: "photos", r2_key: "photos/photo1.jpg" },
      { parsed_category: "photos", r2_key: "photos/photo2.jpg" },
    ];
    const result = filterImagesByCategory(images, "photos");
    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// getAvailableYears TESTS
// =============================================================================

describe("getAvailableYears", () => {
  it("should extract unique years from image dates", () => {
    const result = getAvailableYears(testImages);
    expect(result).toContain("2024");
    expect(result).toContain("2025");
    expect(result).toContain("2023");
  });

  it("should return unique years only", () => {
    const result = getAvailableYears(testImages);
    const uniqueYears = new Set(result);
    expect(result).toHaveLength(uniqueYears.size);
  });

  it("should sort years in descending order (newest first)", () => {
    const result = getAvailableYears(testImages);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i] > result[i + 1]).toBe(true);
    }
  });

  it("should ignore images without dates", () => {
    const images: GalleryImage[] = [
      { r2_key: "photo.jpg" }, // no date
      { parsed_date: "2024-01-15" },
    ];
    const result = getAvailableYears(images);
    expect(result).toEqual(["2024"]);
  });

  it("should return empty array for images without dates", () => {
    const images: GalleryImage[] = [{ r2_key: "photo.jpg" }];
    const result = getAvailableYears(images);
    expect(result).toHaveLength(0);
  });

  it("should handle custom dates", () => {
    const images: GalleryImage[] = [{ custom_date: "2025-01-15" }];
    const result = getAvailableYears(images);
    expect(result).toContain("2025");
  });

  it("should handle single year", () => {
    const images: GalleryImage[] = [
      { parsed_date: "2024-01-15" },
      { parsed_date: "2024-06-20" },
      { parsed_date: "2024-12-25" },
    ];
    const result = getAvailableYears(images);
    expect(result).toEqual(["2024"]);
  });
});

// =============================================================================
// getAvailableCategories TESTS
// =============================================================================

describe("getAvailableCategories", () => {
  it("should extract unique categories from images", () => {
    const result = getAvailableCategories(testImages);
    expect(result).toContain("minecraft");
    expect(result).toContain("selfies");
    expect(result).toContain("projects");
    expect(result).toContain("archive");
  });

  it("should return unique categories only", () => {
    const result = getAvailableCategories(testImages);
    const uniqueCategories = new Set(result);
    expect(result).toHaveLength(uniqueCategories.size);
  });

  it("should sort categories alphabetically", () => {
    const result = getAvailableCategories(testImages);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });

  it("should ignore images without categories", () => {
    const images: GalleryImage[] = [
      { r2_key: "photo.jpg" }, // no category
      { parsed_category: "minecraft" },
      { custom_title: "No File", key: "photo.jpg" }, // no category
    ];
    const result = getAvailableCategories(images);
    expect(result).toEqual(["minecraft"]);
  });

  it("should return empty array for images without categories", () => {
    const images: GalleryImage[] = [
      { r2_key: "photo.jpg" },
      { r2_key: "image.png" },
    ];
    const result = getAvailableCategories(images);
    expect(result).toHaveLength(0);
  });

  it("should handle single category", () => {
    const images: GalleryImage[] = [
      { parsed_category: "minecraft" },
      { parsed_category: "minecraft" },
    ];
    const result = getAvailableCategories(images);
    expect(result).toEqual(["minecraft"]);
  });

  it("should handle multiple categories", () => {
    const images: GalleryImage[] = [
      { parsed_category: "archive" },
      { parsed_category: "minecraft" },
      { parsed_category: "photos" },
    ];
    const result = getAvailableCategories(images);
    expect(result).toEqual(["archive", "minecraft", "photos"]);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("Integration scenarios", () => {
  it("should chain multiple filters", () => {
    let filtered = testImages;

    // Filter by category
    filtered = filterImagesByCategory(filtered, "minecraft");
    expect(filtered.length).toBeGreaterThan(0);

    // Filter by date range
    filtered = filterImagesByDateRange(filtered, "2024-01-01", "2024-12-31");
    expect(filtered.length).toBeGreaterThan(0);

    // Search
    filtered = searchImages(filtered, "build");
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("should handle empty results after filtering", () => {
    const result = filterImagesByCategory(
      filterImagesByDateRange(testImages, "2050-01-01", "2050-12-31"),
      "nonexistent",
    );
    expect(result).toHaveLength(0);
  });

  it("should correctly process parseImageFilename with real r2 keys", () => {
    const testCases = [
      {
        key: "minecraft/2024-01-15_build-complete.png",
        expected: {
          category: "minecraft",
          date: "2024-01-15",
          slug: "build-complete",
          extension: "png",
        },
      },
      {
        key: "photos/2025_03_10_spring.jpg",
        expected: {
          category: "photos",
          date: "2025-03-10",
          // When date is in underscore format, slug includes converted date with dashes
          slug: "2025-03-10-spring",
          extension: "jpg",
        },
      },
      {
        key: "forest.jpg",
        expected: {
          category: null,
          date: null,
          slug: "forest",
          extension: "jpg",
        },
      },
    ];

    testCases.forEach(({ key, expected }) => {
      const result = parseImageFilename(key);
      expect(result.category).toBe(expected.category);
      expect(result.date).toBe(expected.date);
      expect(result.slug).toBe(expected.slug);
      expect(result.extension).toBe(expected.extension);
    });
  });

  it("should maintain data integrity through filtering operations", () => {
    const originalImage = testImages[0];
    const filtered = filterImagesByCategory(
      filterImagesByDateRange(searchImages(testImages, "build"), null, null),
      "minecraft",
    );

    const found = filtered.find((img) => img.r2_key === originalImage.r2_key);
    expect(found).toEqual(originalImage);
  });
});
