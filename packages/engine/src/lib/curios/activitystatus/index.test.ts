import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isStatusExpired,
  getPreset,
  isValidStatusType,
  sanitizeStatusText,
  sanitizeStatusEmoji,
  calculateExpiration,
  toDisplayStatus,
  formatStatusTime,
  STATUS_PRESETS,
  VALID_STATUS_TYPES,
  VALID_PRESET_IDS,
  MAX_STATUS_TEXT_LENGTH,
  MAX_EXPIRATION_HOURS,
  type ActivityStatusRecord,
} from "./index";

// =============================================================================
// isStatusExpired
// =============================================================================

describe("isStatusExpired", () => {
  it("should return false for null expiration", () => {
    expect(isStatusExpired(null)).toBe(false);
  });

  it("should return true for past dates", () => {
    expect(isStatusExpired("2020-01-01T00:00:00Z")).toBe(true);
  });

  it("should return false for future dates", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isStatusExpired(future)).toBe(false);
  });
});

// =============================================================================
// getPreset
// =============================================================================

describe("getPreset", () => {
  it("should return a preset by ID", () => {
    const preset = getPreset("writing");
    expect(preset).toBeDefined();
    expect(preset!.text).toBe("Writing");
    expect(preset!.emoji).toBe("✎");
  });

  it("should return undefined for invalid ID", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });

  it("should find all defined presets", () => {
    for (const preset of STATUS_PRESETS) {
      expect(getPreset(preset.id)).toBeDefined();
    }
  });
});

// =============================================================================
// isValidStatusType
// =============================================================================

describe("isValidStatusType", () => {
  it("should accept valid types", () => {
    expect(isValidStatusType("manual")).toBe(true);
    expect(isValidStatusType("preset")).toBe(true);
    expect(isValidStatusType("auto")).toBe(true);
  });

  it("should reject invalid types", () => {
    expect(isValidStatusType("custom")).toBe(false);
    expect(isValidStatusType("")).toBe(false);
    expect(isValidStatusType("system")).toBe(false);
  });
});

// =============================================================================
// sanitizeStatusText
// =============================================================================

describe("sanitizeStatusText", () => {
  it("should return null for null/undefined/empty", () => {
    expect(sanitizeStatusText(null)).toBeNull();
    expect(sanitizeStatusText(undefined)).toBeNull();
    expect(sanitizeStatusText("")).toBeNull();
    expect(sanitizeStatusText("   ")).toBeNull();
  });

  it("should strip HTML tags", () => {
    expect(sanitizeStatusText("<b>Coding</b>")).toBe("Coding");
    expect(sanitizeStatusText("<script>alert('xss')</script>")).toBe(
      "alert('xss')",
    );
  });

  it("should trim whitespace", () => {
    expect(sanitizeStatusText("  writing  ")).toBe("writing");
  });

  it("should truncate to MAX_STATUS_TEXT_LENGTH", () => {
    const long = "a".repeat(150);
    const result = sanitizeStatusText(long);
    expect(result).toHaveLength(MAX_STATUS_TEXT_LENGTH);
  });

  it("should pass through valid text", () => {
    expect(sanitizeStatusText("Coding late at night")).toBe(
      "Coding late at night",
    );
  });
});

// =============================================================================
// sanitizeStatusEmoji
// =============================================================================

describe("sanitizeStatusEmoji", () => {
  it("should return null for null/undefined/empty", () => {
    expect(sanitizeStatusEmoji(null)).toBeNull();
    expect(sanitizeStatusEmoji(undefined)).toBeNull();
    expect(sanitizeStatusEmoji("")).toBeNull();
  });

  it("should accept a simple emoji", () => {
    expect(sanitizeStatusEmoji("🌱")).toBe("🌱");
  });

  it("should reject overly long strings", () => {
    expect(sanitizeStatusEmoji("a".repeat(11))).toBeNull();
  });

  it("should trim whitespace", () => {
    expect(sanitizeStatusEmoji(" 🎮 ")).toBe("🎮");
  });
});

// =============================================================================
// calculateExpiration
// =============================================================================

describe("calculateExpiration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return null for null/zero/negative", () => {
    expect(calculateExpiration(null)).toBeNull();
    expect(calculateExpiration(0)).toBeNull();
    expect(calculateExpiration(-5)).toBeNull();
  });

  it("should calculate correct expiration", () => {
    const result = calculateExpiration(4);
    expect(result).toBeTruthy();
    const date = new Date(result!);
    expect(date.getTime()).toBe(new Date("2026-01-15T16:00:00Z").getTime());
  });

  it("should clamp to MAX_EXPIRATION_HOURS", () => {
    const result = calculateExpiration(999);
    expect(result).toBeTruthy();
    const date = new Date(result!);
    const expected = new Date(
      Date.now() + MAX_EXPIRATION_HOURS * 60 * 60 * 1000,
    );
    expect(date.getTime()).toBe(expected.getTime());
  });
});

// =============================================================================
// toDisplayStatus
// =============================================================================

describe("toDisplayStatus", () => {
  const baseRecord: ActivityStatusRecord = {
    tenantId: "t_1",
    statusText: "Coding",
    statusEmoji: "💻",
    statusType: "manual",
    preset: null,
    autoSource: null,
    expiresAt: null,
    updatedAt: "2026-01-15T10:00:00Z",
  };

  it("should transform a record to display format", () => {
    const display = toDisplayStatus(baseRecord);
    expect(display.text).toBe("Coding");
    expect(display.emoji).toBe("💻");
    expect(display.type).toBe("manual");
    expect(display.isExpired).toBe(false);
  });

  it("should null out text/emoji when expired", () => {
    const record = {
      ...baseRecord,
      expiresAt: "2020-01-01T00:00:00Z",
    };
    const display = toDisplayStatus(record);
    expect(display.text).toBeNull();
    expect(display.emoji).toBeNull();
    expect(display.isExpired).toBe(true);
  });

  it("should keep text/emoji when not expired", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const record = { ...baseRecord, expiresAt: future };
    const display = toDisplayStatus(record);
    expect(display.text).toBe("Coding");
    expect(display.emoji).toBe("💻");
    expect(display.isExpired).toBe(false);
  });
});

// =============================================================================
// formatStatusTime
// =============================================================================

describe("formatStatusTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for very recent times', () => {
    const now = new Date("2026-01-15T11:59:50Z").toISOString();
    expect(formatStatusTime(now)).toBe("just now");
  });

  it("should show minutes for recent times", () => {
    const fiveMinAgo = new Date("2026-01-15T11:55:00Z").toISOString();
    expect(formatStatusTime(fiveMinAgo)).toBe("5m ago");
  });

  it("should show hours for same-day", () => {
    const threeHoursAgo = new Date("2026-01-15T09:00:00Z").toISOString();
    expect(formatStatusTime(threeHoursAgo)).toBe("3h ago");
  });

  it('should show "yesterday" for 1 day ago', () => {
    const yesterday = new Date("2026-01-14T12:00:00Z").toISOString();
    expect(formatStatusTime(yesterday)).toBe("yesterday");
  });

  it("should show days for recent past", () => {
    const threeDaysAgo = new Date("2026-01-12T12:00:00Z").toISOString();
    expect(formatStatusTime(threeDaysAgo)).toBe("3d ago");
  });

  it("should show date for older times", () => {
    const oldDate = new Date("2025-12-01T00:00:00Z").toISOString();
    const result = formatStatusTime(oldDate);
    expect(result).toContain("Dec");
    expect(result).toContain("1");
  });
});

// =============================================================================
// Constants
// =============================================================================

describe("constants", () => {
  it("should have 15 presets", () => {
    expect(STATUS_PRESETS).toHaveLength(15);
  });

  it("should have 3 status types", () => {
    expect(VALID_STATUS_TYPES.size).toBe(3);
  });

  it("should have matching preset IDs set", () => {
    expect(VALID_PRESET_IDS.size).toBe(15);
    for (const preset of STATUS_PRESETS) {
      expect(VALID_PRESET_IDS.has(preset.id)).toBe(true);
    }
  });

  it("should have unique preset IDs", () => {
    const ids = STATUS_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have all presets with required fields", () => {
    for (const preset of STATUS_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.emoji).toBeTruthy();
      expect(preset.text).toBeTruthy();
      expect(["activity", "away", "mood"]).toContain(preset.category);
    }
  });

  it("should have MAX_STATUS_TEXT_LENGTH of 100", () => {
    expect(MAX_STATUS_TEXT_LENGTH).toBe(100);
  });

  it("should have MAX_EXPIRATION_HOURS of 168", () => {
    expect(MAX_EXPIRATION_HOURS).toBe(168);
  });
});
