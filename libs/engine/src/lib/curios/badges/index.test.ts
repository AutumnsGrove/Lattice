import { describe, it, expect } from "vitest";
import {
  generateBadgeId,
  generateTenantBadgeId,
  generateCustomBadgeId,
  isValidCategory,
  isValidRarity,
  sanitizeBadgeName,
  sanitizeBadgeDescription,
  isValidIconUrl,
  getRarityColor,
  getSystemBadge,
  toDisplayBadge,
  BADGE_CATEGORY_OPTIONS,
  BADGE_RARITY_OPTIONS,
  SYSTEM_BADGES,
  COMMUNITY_BADGES,
  MAX_BADGE_NAME_LENGTH,
  MAX_BADGE_DESCRIPTION_LENGTH,
  MAX_CUSTOM_BADGES,
  type BadgeDefinitionRecord,
  type TenantBadgeRecord,
} from "./index";

describe("Badges constants", () => {
  it("has 3 category options", () => {
    expect(BADGE_CATEGORY_OPTIONS).toHaveLength(3);
    expect(BADGE_CATEGORY_OPTIONS.map((c) => c.value)).toEqual([
      "achievement",
      "community",
      "custom",
    ]);
  });

  it("has 3 rarity options", () => {
    expect(BADGE_RARITY_OPTIONS).toHaveLength(3);
    expect(BADGE_RARITY_OPTIONS.map((r) => r.value)).toEqual([
      "common",
      "uncommon",
      "rare",
    ]);
  });

  it("has 12 system badges", () => {
    expect(SYSTEM_BADGES).toHaveLength(12);
  });

  it("has 4 community badges", () => {
    expect(COMMUNITY_BADGES).toHaveLength(4);
  });

  it("has correct limits", () => {
    expect(MAX_BADGE_NAME_LENGTH).toBe(50);
    expect(MAX_BADGE_DESCRIPTION_LENGTH).toBe(200);
    expect(MAX_CUSTOM_BADGES).toBe(10);
  });

  it("all system badge IDs are unique", () => {
    const ids = SYSTEM_BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ID generators", () => {
  it("generateBadgeId has badge_ prefix", () => {
    expect(generateBadgeId()).toMatch(/^badge_/);
  });

  it("generateTenantBadgeId has tb_ prefix", () => {
    expect(generateTenantBadgeId()).toMatch(/^tb_/);
  });

  it("generateCustomBadgeId has cb_ prefix", () => {
    expect(generateCustomBadgeId()).toMatch(/^cb_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateBadgeId()));
    expect(ids.size).toBe(20);
  });
});

describe("isValidCategory", () => {
  it("accepts valid categories", () => {
    expect(isValidCategory("achievement")).toBe(true);
    expect(isValidCategory("community")).toBe(true);
    expect(isValidCategory("custom")).toBe(true);
  });

  it("rejects invalid categories", () => {
    expect(isValidCategory("special")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });
});

describe("isValidRarity", () => {
  it("accepts valid rarities", () => {
    expect(isValidRarity("common")).toBe(true);
    expect(isValidRarity("uncommon")).toBe(true);
    expect(isValidRarity("rare")).toBe(true);
  });

  it("rejects invalid rarities", () => {
    expect(isValidRarity("legendary")).toBe(false);
  });
});

describe("sanitizeBadgeName", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeBadgeName(null)).toBeNull();
    expect(sanitizeBadgeName("")).toBeNull();
  });

  it("strips HTML", () => {
    expect(sanitizeBadgeName("<b>Cool Badge</b>")).toBe("Cool Badge");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(100);
    expect(sanitizeBadgeName(long)).toHaveLength(MAX_BADGE_NAME_LENGTH);
  });
});

describe("sanitizeBadgeDescription", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeBadgeDescription(null)).toBeNull();
  });

  it("truncates to max length", () => {
    const long = "x".repeat(300);
    expect(sanitizeBadgeDescription(long)).toHaveLength(
      MAX_BADGE_DESCRIPTION_LENGTH,
    );
  });
});

describe("isValidIconUrl", () => {
  it("accepts valid https URLs", () => {
    expect(isValidIconUrl("https://example.com/badge.svg")).toBe(true);
  });

  it("rejects empty/null URLs", () => {
    expect(isValidIconUrl("")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isValidIconUrl("ftp://example.com/badge.svg")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidIconUrl("not a url")).toBe(false);
  });
});

describe("getRarityColor", () => {
  it("returns bronze for common", () => {
    expect(getRarityColor("common")).toBe("#cd7f32");
  });

  it("returns silver for uncommon", () => {
    expect(getRarityColor("uncommon")).toBe("#c0c0c0");
  });

  it("returns gold for rare", () => {
    expect(getRarityColor("rare")).toBe("#ffd700");
  });

  it("returns default for unknown", () => {
    expect(getRarityColor("legendary" as any)).toBe("#cd7f32");
  });
});

describe("getSystemBadge", () => {
  it("finds existing system badge", () => {
    const badge = getSystemBadge("badge_first_post");
    expect(badge).toBeDefined();
    expect(badge?.name).toBe("First Post");
  });

  it("returns undefined for unknown badge", () => {
    expect(getSystemBadge("badge_nonexistent")).toBeUndefined();
  });
});

describe("toDisplayBadge", () => {
  it("transforms definition + earned to display", () => {
    const def: BadgeDefinitionRecord = {
      id: "badge_first_post",
      name: "First Post",
      description: "Published your first blog post",
      iconUrl: "https://example.com/badge.svg",
      category: "achievement",
      rarity: "common",
      autoCriteria: "posts_count_gte_1",
      isSystem: true,
      createdAt: "2025-01-01",
    };
    const earned: TenantBadgeRecord = {
      id: "tb_123",
      tenantId: "t1",
      badgeId: "badge_first_post",
      earnedAt: "2025-06-01",
      displayOrder: 0,
      isShowcased: true,
    };
    const display = toDisplayBadge(def, earned);
    expect(display).toEqual({
      id: "badge_first_post",
      name: "First Post",
      description: "Published your first blog post",
      iconUrl: "https://example.com/badge.svg",
      category: "achievement",
      rarity: "common",
      earnedAt: "2025-06-01",
      isShowcased: true,
    });
  });
});
