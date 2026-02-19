import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateBlogrollId,
  isValidUrl,
  sanitizeTitle,
  sanitizeDescription,
  buildFaviconUrl,
  formatPostDate,
  toDisplayBlogrollItem,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
  type BlogrollItemRecord,
} from "./index";

describe("Blogroll constants", () => {
  it("has correct limits", () => {
    expect(MAX_TITLE_LENGTH).toBe(100);
    expect(MAX_DESCRIPTION_LENGTH).toBe(300);
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});

describe("generateBlogrollId", () => {
  it("generates br_ prefixed ID", () => {
    expect(generateBlogrollId()).toMatch(/^br_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateBlogrollId()));
    expect(ids.size).toBe(20);
  });
});

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("https://blog.example.com/posts/hello")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:void(0)")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("sanitizeTitle", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeTitle(null)).toBeNull();
    expect(sanitizeTitle("")).toBeNull();
  });

  it("strips HTML", () => {
    expect(sanitizeTitle("<em>My Blog</em>")).toBe("My Blog");
  });

  it("trims whitespace", () => {
    expect(sanitizeTitle("  Hello  ")).toBe("Hello");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(200);
    expect(sanitizeTitle(long)).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe("sanitizeDescription", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeDescription(null)).toBeNull();
  });

  it("truncates to max length", () => {
    const long = "x".repeat(500);
    expect(sanitizeDescription(long)).toHaveLength(MAX_DESCRIPTION_LENGTH);
  });
});

describe("buildFaviconUrl", () => {
  it("builds Google S2 favicon URL", () => {
    const url = buildFaviconUrl("https://example.com/blog");
    expect(url).toContain("google.com/s2/favicons");
    expect(url).toContain("example.com");
  });

  it("returns empty string for invalid URL", () => {
    expect(buildFaviconUrl("not a url")).toBe("");
  });
});

describe("formatPostDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for null", () => {
    expect(formatPostDate(null)).toBeNull();
  });

  it("returns 'today' for same day", () => {
    expect(formatPostDate("2025-06-15T08:00:00Z")).toBe("today");
  });

  it("returns 'yesterday' for previous day", () => {
    expect(formatPostDate("2025-06-14T12:00:00Z")).toBe("yesterday");
  });

  it("returns days ago for recent dates", () => {
    expect(formatPostDate("2025-06-12T12:00:00Z")).toBe("3 days ago");
  });

  it("returns weeks ago for older dates", () => {
    expect(formatPostDate("2025-06-01T12:00:00Z")).toBe("2 weeks ago");
  });

  it("returns null for invalid date", () => {
    expect(formatPostDate("not-a-date")).toBeNull();
  });
});

describe("toDisplayBlogrollItem", () => {
  it("transforms record to display format", () => {
    const record: BlogrollItemRecord = {
      id: "br_123",
      tenantId: "t1",
      url: "https://example.com",
      title: "Example Blog",
      description: "A great blog",
      feedUrl: "https://example.com/feed.xml",
      faviconUrl: "https://favicon.example.com",
      lastPostTitle: "Latest Post",
      lastPostUrl: "https://example.com/latest",
      lastPostDate: "2025-06-01",
      lastFeedCheck: "2025-06-15",
      sortOrder: 0,
      addedAt: "2025-01-01",
      updatedAt: "2025-06-15",
    };
    const display = toDisplayBlogrollItem(record);
    expect(display).toEqual({
      id: "br_123",
      url: "https://example.com",
      title: "Example Blog",
      description: "A great blog",
      faviconUrl: "https://favicon.example.com",
      lastPostTitle: "Latest Post",
      lastPostUrl: "https://example.com/latest",
      lastPostDate: "2025-06-01",
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("feedUrl");
  });
});
