import { describe, it, expect } from "vitest";
import {
  generateWebringId,
  isValidBadgeStyle,
  isValidPosition,
  isValidUrl,
  sanitizeRingName,
  toDisplayWebring,
  BADGE_STYLE_OPTIONS,
  POSITION_OPTIONS,
  VALID_BADGE_STYLES,
  VALID_POSITIONS,
  MAX_RING_NAME_LENGTH,
  MAX_URL_LENGTH,
  type WebringRecord,
  type WebringBadgeStyle,
  type WebringPosition,
} from "./index";

// =============================================================================
// Constants
// =============================================================================

describe("Webring constants", () => {
  it("has 4 badge style options", () => {
    expect(BADGE_STYLE_OPTIONS).toHaveLength(4);
    expect(BADGE_STYLE_OPTIONS.map((o) => o.value)).toEqual([
      "classic",
      "badge",
      "compact",
      "floating",
    ]);
  });

  it("has 4 position options", () => {
    expect(POSITION_OPTIONS).toHaveLength(4);
    expect(POSITION_OPTIONS.map((o) => o.value)).toEqual([
      "footer",
      "header",
      "right-vine",
      "floating",
    ]);
  });

  it("has valid badge styles set matching options", () => {
    for (const opt of BADGE_STYLE_OPTIONS) {
      expect(VALID_BADGE_STYLES.has(opt.value)).toBe(true);
    }
    expect(VALID_BADGE_STYLES.has("invalid")).toBe(false);
  });

  it("has valid positions set matching options", () => {
    for (const opt of POSITION_OPTIONS) {
      expect(VALID_POSITIONS.has(opt.value)).toBe(true);
    }
    expect(VALID_POSITIONS.has("invalid")).toBe(false);
  });

  it("has correct limits", () => {
    expect(MAX_RING_NAME_LENGTH).toBe(100);
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});

// =============================================================================
// generateWebringId
// =============================================================================

describe("generateWebringId", () => {
  it("generates a wr_ prefixed ID", () => {
    const id = generateWebringId();
    expect(id).toMatch(/^wr_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateWebringId()));
    expect(ids.size).toBe(20);
  });
});

// =============================================================================
// Validators
// =============================================================================

describe("isValidBadgeStyle", () => {
  it("accepts all valid styles", () => {
    expect(isValidBadgeStyle("classic")).toBe(true);
    expect(isValidBadgeStyle("badge")).toBe(true);
    expect(isValidBadgeStyle("compact")).toBe(true);
    expect(isValidBadgeStyle("floating")).toBe(true);
  });

  it("rejects invalid styles", () => {
    expect(isValidBadgeStyle("banner")).toBe(false);
    expect(isValidBadgeStyle("")).toBe(false);
    expect(isValidBadgeStyle("CLASSIC")).toBe(false);
  });
});

describe("isValidPosition", () => {
  it("accepts all valid positions", () => {
    expect(isValidPosition("footer")).toBe(true);
    expect(isValidPosition("header")).toBe(true);
    expect(isValidPosition("right-vine")).toBe(true);
    expect(isValidPosition("floating")).toBe(true);
  });

  it("rejects invalid positions", () => {
    expect(isValidPosition("left")).toBe(false);
    expect(isValidPosition("")).toBe(false);
    expect(isValidPosition("FOOTER")).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("accepts valid http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("accepts valid https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("https://example.com/path?q=1")).toBe(true);
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

// =============================================================================
// sanitizeRingName
// =============================================================================

describe("sanitizeRingName", () => {
  it("returns null for null/undefined/empty", () => {
    expect(sanitizeRingName(null)).toBeNull();
    expect(sanitizeRingName(undefined)).toBeNull();
    expect(sanitizeRingName("")).toBeNull();
  });

  it("strips HTML tags", () => {
    expect(sanitizeRingName("<b>Cool Ring</b>")).toBe("Cool Ring");
  });

  it("trims whitespace", () => {
    expect(sanitizeRingName("  My Ring  ")).toBe("My Ring");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(200);
    const result = sanitizeRingName(long);
    expect(result).toHaveLength(MAX_RING_NAME_LENGTH);
  });

  it("returns null for whitespace-only after strip", () => {
    expect(sanitizeRingName("<br/>")).toBeNull();
    expect(sanitizeRingName("   ")).toBeNull();
  });
});

// =============================================================================
// toDisplayWebring
// =============================================================================

describe("toDisplayWebring", () => {
  it("transforms record to display format", () => {
    const record: WebringRecord = {
      id: "wr_123",
      tenantId: "tenant_1",
      ringName: "Cool Ring",
      ringUrl: "https://coolring.com",
      prevUrl: "https://prev.com",
      nextUrl: "https://next.com",
      homeUrl: "https://home.com",
      badgeStyle: "classic",
      position: "footer",
      sortOrder: 0,
      joinedAt: "2025-01-01T00:00:00Z",
    };

    const display = toDisplayWebring(record);
    expect(display).toEqual({
      id: "wr_123",
      ringName: "Cool Ring",
      ringUrl: "https://coolring.com",
      prevUrl: "https://prev.com",
      nextUrl: "https://next.com",
      homeUrl: "https://home.com",
      badgeStyle: "classic",
    });
  });

  it("excludes tenant-specific fields", () => {
    const record: WebringRecord = {
      id: "wr_456",
      tenantId: "tenant_2",
      ringName: "Test",
      ringUrl: null,
      prevUrl: "https://prev.com",
      nextUrl: "https://next.com",
      homeUrl: null,
      badgeStyle: "badge",
      position: "header",
      sortOrder: 1,
      joinedAt: "2025-01-01T00:00:00Z",
    };

    const display = toDisplayWebring(record);
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("position");
    expect(display).not.toHaveProperty("sortOrder");
    expect(display).not.toHaveProperty("joinedAt");
  });

  it("preserves null optional fields", () => {
    const record: WebringRecord = {
      id: "wr_789",
      tenantId: "tenant_3",
      ringName: "Minimal Ring",
      ringUrl: null,
      prevUrl: "https://prev.example.com",
      nextUrl: "https://next.example.com",
      homeUrl: null,
      badgeStyle: "compact",
      position: "floating",
      sortOrder: 0,
      joinedAt: "2025-01-01T00:00:00Z",
    };

    const display = toDisplayWebring(record);
    expect(display.ringUrl).toBeNull();
    expect(display.homeUrl).toBeNull();
  });
});
