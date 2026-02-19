import { describe, it, expect } from "vitest";
import {
  generateGardenId,
  generateLinkId,
  isValidGardenStyle,
  isValidUrl,
  sanitizeText,
  sanitizeTitle,
  sanitizeLinkTitle,
  buildFaviconUrl,
  toDisplayGarden,
  GARDEN_STYLE_OPTIONS,
  VALID_GARDEN_STYLES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
  MAX_LINK_TITLE_LENGTH,
  MAX_LINK_DESCRIPTION_LENGTH,
  MAX_CATEGORY_LENGTH,
  type LinkGardenRecord,
  type LinkItemRecord,
} from "./index";

// =============================================================================
// generateGardenId / generateLinkId
// =============================================================================

describe("generateGardenId", () => {
  it("should return a string starting with 'lg_'", () => {
    expect(generateGardenId()).toMatch(/^lg_/);
  });

  it("should return unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateGardenId()));
    expect(ids.size).toBe(50);
  });
});

describe("generateLinkId", () => {
  it("should return a string starting with 'li_'", () => {
    expect(generateLinkId()).toMatch(/^li_/);
  });

  it("should return unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateLinkId()));
    expect(ids.size).toBe(50);
  });
});

// =============================================================================
// isValidGardenStyle
// =============================================================================

describe("isValidGardenStyle", () => {
  it("should accept valid styles", () => {
    expect(isValidGardenStyle("list")).toBe(true);
    expect(isValidGardenStyle("grid")).toBe(true);
    expect(isValidGardenStyle("buttons")).toBe(true);
    expect(isValidGardenStyle("marquee")).toBe(true);
  });

  it("should reject invalid styles", () => {
    expect(isValidGardenStyle("table")).toBe(false);
    expect(isValidGardenStyle("")).toBe(false);
  });
});

// =============================================================================
// isValidUrl
// =============================================================================

describe("isValidUrl", () => {
  it("should accept valid http/https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com/path")).toBe(true);
    expect(isValidUrl("https://sub.domain.com/page?q=1")).toBe(true);
  });

  it("should reject non-http protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("should reject invalid URLs", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

// =============================================================================
// sanitizeText
// =============================================================================

describe("sanitizeText", () => {
  it("should return null for null/undefined/empty", () => {
    expect(sanitizeText(null, 100)).toBeNull();
    expect(sanitizeText(undefined, 100)).toBeNull();
    expect(sanitizeText("", 100)).toBeNull();
    expect(sanitizeText("   ", 100)).toBeNull();
  });

  it("should strip HTML tags", () => {
    expect(sanitizeText("<b>Hello</b>", 100)).toBe("Hello");
  });

  it("should truncate to maxLength", () => {
    expect(sanitizeText("a".repeat(50), 10)).toHaveLength(10);
  });

  it("should pass through valid text", () => {
    expect(sanitizeText("A cool site", 100)).toBe("A cool site");
  });
});

// =============================================================================
// sanitizeTitle
// =============================================================================

describe("sanitizeTitle", () => {
  it("should default to 'Links' for empty", () => {
    expect(sanitizeTitle(null)).toBe("Links");
    expect(sanitizeTitle(undefined)).toBe("Links");
    expect(sanitizeTitle("")).toBe("Links");
    expect(sanitizeTitle("  ")).toBe("Links");
  });

  it("should strip HTML", () => {
    expect(sanitizeTitle("<b>My Links</b>")).toBe("My Links");
  });

  it("should truncate to MAX_TITLE_LENGTH", () => {
    const result = sanitizeTitle("a".repeat(200));
    expect(result).toHaveLength(MAX_TITLE_LENGTH);
  });
});

// =============================================================================
// sanitizeLinkTitle
// =============================================================================

describe("sanitizeLinkTitle", () => {
  it("should default to 'Untitled Link' for empty", () => {
    expect(sanitizeLinkTitle(null)).toBe("Untitled Link");
    expect(sanitizeLinkTitle("")).toBe("Untitled Link");
  });

  it("should strip HTML", () => {
    expect(sanitizeLinkTitle("<a>Site</a>")).toBe("Site");
  });

  it("should truncate to MAX_LINK_TITLE_LENGTH", () => {
    const result = sanitizeLinkTitle("a".repeat(200));
    expect(result).toHaveLength(MAX_LINK_TITLE_LENGTH);
  });
});

// =============================================================================
// buildFaviconUrl
// =============================================================================

describe("buildFaviconUrl", () => {
  it("should build a Google favicon URL", () => {
    const result = buildFaviconUrl("https://example.com/page");
    expect(result).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
  });

  it("should handle subdomains", () => {
    const result = buildFaviconUrl("https://blog.example.com");
    expect(result).toContain("blog.example.com");
  });

  it("should return null for invalid URLs", () => {
    expect(buildFaviconUrl("not-a-url")).toBeNull();
  });
});

// =============================================================================
// toDisplayGarden
// =============================================================================

describe("toDisplayGarden", () => {
  const garden: LinkGardenRecord = {
    id: "lg_test",
    tenantId: "t_1",
    title: "Cool Sites",
    description: "My favorites",
    style: "list",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const links: LinkItemRecord[] = [
    {
      id: "li_2",
      gardenId: "lg_test",
      tenantId: "t_1",
      url: "https://b.com",
      title: "B Site",
      description: null,
      faviconUrl: null,
      buttonImageUrl: null,
      category: null,
      sortOrder: 1,
      addedAt: "2026-01-01",
    },
    {
      id: "li_1",
      gardenId: "lg_test",
      tenantId: "t_1",
      url: "https://a.com",
      title: "A Site",
      description: "First",
      faviconUrl: "https://favicon.com/a",
      buttonImageUrl: null,
      category: "Friends",
      sortOrder: 0,
      addedAt: "2026-01-01",
    },
  ];

  it("should transform garden and links to display format", () => {
    const display = toDisplayGarden(garden, links);
    expect(display.id).toBe("lg_test");
    expect(display.title).toBe("Cool Sites");
    expect(display.description).toBe("My favorites");
    expect(display.style).toBe("list");
    expect(display.links).toHaveLength(2);
  });

  it("should sort links by sortOrder", () => {
    const display = toDisplayGarden(garden, links);
    expect(display.links[0].title).toBe("A Site");
    expect(display.links[1].title).toBe("B Site");
  });

  it("should handle empty links", () => {
    const display = toDisplayGarden(garden, []);
    expect(display.links).toHaveLength(0);
  });
});

// =============================================================================
// Constants
// =============================================================================

describe("constants", () => {
  it("should have 4 garden style options", () => {
    expect(GARDEN_STYLE_OPTIONS).toHaveLength(4);
  });

  it("should have matching valid styles set", () => {
    expect(VALID_GARDEN_STYLES.size).toBe(4);
  });

  it("should have reasonable max lengths", () => {
    expect(MAX_TITLE_LENGTH).toBe(100);
    expect(MAX_DESCRIPTION_LENGTH).toBe(300);
    expect(MAX_URL_LENGTH).toBe(2048);
    expect(MAX_LINK_TITLE_LENGTH).toBe(150);
    expect(MAX_LINK_DESCRIPTION_LENGTH).toBe(300);
    expect(MAX_CATEGORY_LENGTH).toBe(50);
  });

  it("should have all style options with required fields", () => {
    for (const option of GARDEN_STYLE_OPTIONS) {
      expect(option.value).toBeTruthy();
      expect(option.label).toBeTruthy();
      expect(option.description).toBeTruthy();
    }
  });
});
