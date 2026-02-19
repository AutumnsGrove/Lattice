import { describe, it, expect } from "vitest";
import {
  generateBadgeId,
  getBadgeDefinition,
  isValidBadgeType,
  isValidBadgePosition,
  sanitizeCustomText,
  toDisplayBadge,
  formatBadgeDate,
  BADGE_DEFINITIONS,
  BADGE_POSITION_OPTIONS,
  VALID_BADGE_TYPES,
  VALID_BADGE_POSITIONS,
  MAX_CUSTOM_TEXT_LENGTH,
  type StatusBadgeRecord,
} from "./index";

// =============================================================================
// generateBadgeId
// =============================================================================

describe("generateBadgeId", () => {
  it("should return a string starting with 'sb_'", () => {
    const id = generateBadgeId();
    expect(id).toMatch(/^sb_/);
  });

  it("should return unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateBadgeId()));
    expect(ids.size).toBe(50);
  });

  it("should contain timestamp and random parts", () => {
    const id = generateBadgeId();
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("sb");
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// getBadgeDefinition
// =============================================================================

describe("getBadgeDefinition", () => {
  it("should return the correct definition for each badge type", () => {
    const def = getBadgeDefinition("under-construction");
    expect(def).toBeDefined();
    expect(def!.name).toBe("Under Construction");
    expect(def!.emoji).toBe("🚧");
  });

  it("should return undefined for an invalid type", () => {
    const def = getBadgeDefinition("nonexistent" as never);
    expect(def).toBeUndefined();
  });

  it("should find all 9 badge types", () => {
    const types = [
      "under-construction",
      "just-planted",
      "coming-soon",
      "new-and-shiny",
      "on-hiatus",
      "grand-opening",
      "night-owl",
      "last-updated",
      "fresh-post",
    ] as const;

    for (const type of types) {
      expect(getBadgeDefinition(type)).toBeDefined();
    }
  });
});

// =============================================================================
// isValidBadgeType
// =============================================================================

describe("isValidBadgeType", () => {
  it("should accept valid badge types", () => {
    expect(isValidBadgeType("under-construction")).toBe(true);
    expect(isValidBadgeType("just-planted")).toBe(true);
    expect(isValidBadgeType("grand-opening")).toBe(true);
    expect(isValidBadgeType("fresh-post")).toBe(true);
  });

  it("should reject invalid types", () => {
    expect(isValidBadgeType("invalid")).toBe(false);
    expect(isValidBadgeType("")).toBe(false);
    expect(isValidBadgeType("under_construction")).toBe(false);
  });
});

// =============================================================================
// isValidBadgePosition
// =============================================================================

describe("isValidBadgePosition", () => {
  it("should accept valid positions", () => {
    expect(isValidBadgePosition("floating")).toBe(true);
    expect(isValidBadgePosition("header-vine")).toBe(true);
    expect(isValidBadgePosition("right-vine")).toBe(true);
    expect(isValidBadgePosition("footer-vine")).toBe(true);
  });

  it("should reject invalid positions", () => {
    expect(isValidBadgePosition("left")).toBe(false);
    expect(isValidBadgePosition("")).toBe(false);
    expect(isValidBadgePosition("sidebar")).toBe(false);
  });
});

// =============================================================================
// sanitizeCustomText
// =============================================================================

describe("sanitizeCustomText", () => {
  it("should return null for null/undefined/empty", () => {
    expect(sanitizeCustomText(null)).toBeNull();
    expect(sanitizeCustomText(undefined)).toBeNull();
    expect(sanitizeCustomText("")).toBeNull();
    expect(sanitizeCustomText("   ")).toBeNull();
  });

  it("should strip HTML tags", () => {
    expect(sanitizeCustomText("<b>Hello</b>")).toBe("Hello");
    expect(sanitizeCustomText("<script>alert('xss')</script>")).toBe(
      "alert('xss')",
    );
    expect(sanitizeCustomText("Hello <em>world</em>")).toBe("Hello world");
  });

  it("should trim whitespace", () => {
    expect(sanitizeCustomText("  hello  ")).toBe("hello");
  });

  it("should truncate to MAX_CUSTOM_TEXT_LENGTH", () => {
    const long = "a".repeat(100);
    const result = sanitizeCustomText(long);
    expect(result).toHaveLength(MAX_CUSTOM_TEXT_LENGTH);
  });

  it("should pass through valid text", () => {
    expect(sanitizeCustomText("Work in progress!")).toBe("Work in progress!");
  });

  it("should return null if only HTML tags", () => {
    expect(sanitizeCustomText("<br/><div></div>")).toBeNull();
  });
});

// =============================================================================
// toDisplayBadge
// =============================================================================

describe("toDisplayBadge", () => {
  const baseRecord: StatusBadgeRecord = {
    id: "sb_test_123",
    tenantId: "t_1",
    badgeType: "under-construction",
    position: "floating",
    animated: true,
    customText: null,
    showDate: false,
    createdAt: "2026-01-15T10:00:00Z",
  };

  it("should transform record to display badge", () => {
    const display = toDisplayBadge(baseRecord);
    expect(display.id).toBe("sb_test_123");
    expect(display.badgeType).toBe("under-construction");
    expect(display.position).toBe("floating");
    expect(display.animated).toBe(true);
    expect(display.label).toBe("Under Construction");
    expect(display.emoji).toBe("🚧");
    expect(display.customText).toBeNull();
    expect(display.showDate).toBe(false);
    expect(display.dateText).toBeNull();
  });

  it("should include dateText when showDate is true", () => {
    const record = { ...baseRecord, showDate: true };
    const display = toDisplayBadge(record);
    expect(display.showDate).toBe(true);
    expect(display.dateText).toBeTruthy();
    expect(display.dateText).toContain("Jan");
    expect(display.dateText).toContain("2026");
  });

  it("should include customText when set", () => {
    const record = { ...baseRecord, customText: "Under renovation!" };
    const display = toDisplayBadge(record);
    expect(display.customText).toBe("Under renovation!");
  });

  it("should use fallback label for unknown badge types", () => {
    const record = {
      ...baseRecord,
      badgeType: "unknown" as StatusBadgeRecord["badgeType"],
    };
    const display = toDisplayBadge(record);
    expect(display.label).toBe("unknown");
    expect(display.emoji).toBe("🏷️");
  });
});

// =============================================================================
// formatBadgeDate
// =============================================================================

describe("formatBadgeDate", () => {
  it("should format a date string", () => {
    const result = formatBadgeDate("2026-01-15T10:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("should format a different date", () => {
    const result = formatBadgeDate("2025-12-25T00:00:00Z");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
    expect(result).toContain("2025");
  });
});

// =============================================================================
// Constants
// =============================================================================

describe("constants", () => {
  it("should have 9 badge definitions", () => {
    expect(BADGE_DEFINITIONS).toHaveLength(9);
  });

  it("should have 4 position options", () => {
    expect(BADGE_POSITION_OPTIONS).toHaveLength(4);
  });

  it("should have matching valid badge types set", () => {
    expect(VALID_BADGE_TYPES.size).toBe(9);
    for (const def of BADGE_DEFINITIONS) {
      expect(VALID_BADGE_TYPES.has(def.type)).toBe(true);
    }
  });

  it("should have matching valid positions set", () => {
    expect(VALID_BADGE_POSITIONS.size).toBe(4);
    for (const opt of BADGE_POSITION_OPTIONS) {
      expect(VALID_BADGE_POSITIONS.has(opt.value)).toBe(true);
    }
  });

  it("should have MAX_CUSTOM_TEXT_LENGTH of 80", () => {
    expect(MAX_CUSTOM_TEXT_LENGTH).toBe(80);
  });

  it("should have unique badge types", () => {
    const types = BADGE_DEFINITIONS.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("should have unique position values", () => {
    const values = BADGE_POSITION_OPTIONS.map((p) => p.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("should have all definitions with required fields", () => {
    for (const def of BADGE_DEFINITIONS) {
      expect(def.type).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.emoji).toBeTruthy();
      expect(["manual", "auto"]).toContain(def.trigger);
    }
  });

  it("should have 5 auto-detected badge types", () => {
    const autoTypes = BADGE_DEFINITIONS.filter((d) => d.trigger === "auto");
    expect(autoTypes).toHaveLength(5);
  });

  it("should have 4 manual badge types", () => {
    const manualTypes = BADGE_DEFINITIONS.filter((d) => d.trigger === "manual");
    expect(manualTypes).toHaveLength(4);
  });
});
