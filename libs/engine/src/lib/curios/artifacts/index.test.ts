import { describe, it, expect } from "vitest";
import {
  generateArtifactId,
  isValidArtifactType,
  isValidPlacement,
  isValidVisibility,
  isValidRevealAnimation,
  isValidContainer,
  sanitizeConfig,
  sanitizeMarqueeText,
  parseDiscoveryRules,
  getDailyIndex,
  get8BallAnswer,
  getDailyFortune,
  getDailyTarot,
  rollDice,
  flipCoin,
  toDisplayArtifact,
  evaluateDiscoveryRules,
  rowToRecord,
  ARTIFACT_TYPES,
  PLACEMENT_OPTIONS,
  VISIBILITY_OPTIONS,
  REVEAL_ANIMATION_OPTIONS,
  CONTAINER_OPTIONS,
  DEFAULT_8BALL_ANSWERS,
  DEFAULT_FORTUNES,
  TAROT_MAJOR_ARCANA,
  DICE_FACES,
  MAX_MARQUEE_TEXT_LENGTH,
  type ArtifactRecord,
  type DiscoveryCondition,
} from "./index";

// =============================================================================
// Constants
// =============================================================================

describe("Artifacts constants", () => {
  it("has 20 artifact types", () => {
    expect(ARTIFACT_TYPES).toHaveLength(20);
  });

  it("has 5 categories", () => {
    const categories = new Set(ARTIFACT_TYPES.map((t) => t.category));
    expect(categories.size).toBe(5);
    expect(categories).toContain("mystical");
    expect(categories).toContain("interactive");
    expect(categories).toContain("classic");
    expect(categories).toContain("nature");
    expect(categories).toContain("whimsical");
  });

  it("has 6 placement zones", () => {
    expect(PLACEMENT_OPTIONS).toHaveLength(6);
    expect(PLACEMENT_OPTIONS.map((p) => p.value)).toEqual([
      "sidebar",
      "header",
      "footer",
      "inline",
      "floating",
      "hidden",
    ]);
  });

  it("has 3 visibility modes", () => {
    expect(VISIBILITY_OPTIONS).toHaveLength(3);
  });

  it("has 5 reveal animations", () => {
    expect(REVEAL_ANIMATION_OPTIONS).toHaveLength(5);
  });

  it("has 2 container options", () => {
    expect(CONTAINER_OPTIONS).toHaveLength(2);
  });

  it("has 20 default 8-ball answers", () => {
    expect(DEFAULT_8BALL_ANSWERS.length).toBe(20);
  });

  it("has 15 default fortunes", () => {
    expect(DEFAULT_FORTUNES.length).toBe(15);
  });

  it("has 22 Major Arcana cards", () => {
    expect(TAROT_MAJOR_ARCANA.length).toBe(22);
    expect(TAROT_MAJOR_ARCANA[0].name).toBe("The Fool");
    expect(TAROT_MAJOR_ARCANA[21].name).toBe("The World");
  });

  it("has correct dice faces", () => {
    expect(DICE_FACES.d4).toBe(4);
    expect(DICE_FACES.d6).toBe(6);
    expect(DICE_FACES.d20).toBe(20);
  });
});

// =============================================================================
// ID Generation
// =============================================================================

describe("generateArtifactId", () => {
  it("generates art_ prefixed ID", () => {
    expect(generateArtifactId()).toMatch(/^art_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateArtifactId()));
    expect(ids.size).toBe(20);
  });
});

// =============================================================================
// Type Guards
// =============================================================================

describe("isValidArtifactType", () => {
  it("accepts all 20 valid types", () => {
    for (const t of ARTIFACT_TYPES) {
      expect(isValidArtifactType(t.value)).toBe(true);
    }
  });

  it("accepts new types", () => {
    expect(isValidArtifactType("crystalball")).toBe(true);
    expect(isValidArtifactType("moodcandle")).toBe(true);
    expect(isValidArtifactType("glasscathedral")).toBe(true);
    expect(isValidArtifactType("terrariumglobe")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(isValidArtifactType("invalid")).toBe(false);
    expect(isValidArtifactType("")).toBe(false);
  });
});

describe("isValidPlacement", () => {
  it("accepts new zone placements", () => {
    expect(isValidPlacement("sidebar")).toBe(true);
    expect(isValidPlacement("header")).toBe(true);
    expect(isValidPlacement("footer")).toBe(true);
    expect(isValidPlacement("inline")).toBe(true);
    expect(isValidPlacement("floating")).toBe(true);
    expect(isValidPlacement("hidden")).toBe(true);
  });

  it("rejects old placement names", () => {
    expect(isValidPlacement("right-vine")).toBe(false);
    expect(isValidPlacement("left-vine")).toBe(false);
  });

  it("rejects invalid placements", () => {
    expect(isValidPlacement("center")).toBe(false);
  });
});

describe("isValidVisibility", () => {
  it("accepts valid visibility modes", () => {
    expect(isValidVisibility("always")).toBe(true);
    expect(isValidVisibility("hidden")).toBe(true);
    expect(isValidVisibility("easter-egg")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidVisibility("secret")).toBe(false);
  });
});

describe("isValidRevealAnimation", () => {
  it("accepts valid animations", () => {
    expect(isValidRevealAnimation("fade")).toBe(true);
    expect(isValidRevealAnimation("sparkle")).toBe(true);
    expect(isValidRevealAnimation("slide")).toBe(true);
    expect(isValidRevealAnimation("grow")).toBe(true);
    expect(isValidRevealAnimation("flicker")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidRevealAnimation("bounce")).toBe(false);
  });
});

describe("isValidContainer", () => {
  it("accepts valid containers", () => {
    expect(isValidContainer("none")).toBe(true);
    expect(isValidContainer("glass-card")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidContainer("box")).toBe(false);
  });
});

// =============================================================================
// Sanitizers
// =============================================================================

describe("sanitizeConfig", () => {
  it("returns empty object for null/undefined", () => {
    expect(sanitizeConfig(null)).toEqual({});
    expect(sanitizeConfig(undefined)).toEqual({});
    expect(sanitizeConfig("")).toEqual({});
  });

  it("parses valid JSON object", () => {
    expect(sanitizeConfig('{"key": "value"}')).toEqual({ key: "value" });
  });

  it("returns empty object for non-object JSON", () => {
    expect(sanitizeConfig("[1,2]")).toEqual({});
    expect(sanitizeConfig('"string"')).toEqual({});
    expect(sanitizeConfig("null")).toEqual({});
  });

  it("returns empty object for invalid JSON", () => {
    expect(sanitizeConfig("not json")).toEqual({});
  });
});

describe("sanitizeMarqueeText", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeMarqueeText(null)).toBeNull();
    expect(sanitizeMarqueeText("")).toBeNull();
  });

  it("strips HTML", () => {
    expect(sanitizeMarqueeText("<b>Welcome!</b>")).toBe("Welcome!");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(300);
    expect(sanitizeMarqueeText(long)).toHaveLength(MAX_MARQUEE_TEXT_LENGTH);
  });
});

describe("parseDiscoveryRules", () => {
  it("returns empty array for null/undefined", () => {
    expect(parseDiscoveryRules(null)).toEqual([]);
    expect(parseDiscoveryRules(undefined)).toEqual([]);
    expect(parseDiscoveryRules("")).toEqual([]);
  });

  it("parses valid rule array", () => {
    const rules = JSON.stringify([
      { type: "dark-mode", value: "true" },
      { type: "scroll-depth", value: 80 },
    ]);
    const result = parseDiscoveryRules(rules);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("dark-mode");
    expect(result[1].value).toBe(80);
  });

  it("filters out invalid rule objects", () => {
    const rules = JSON.stringify([
      { type: "dark-mode", value: "true" },
      { invalid: true },
      "not an object",
    ]);
    const result = parseDiscoveryRules(rules);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseDiscoveryRules('{"not": "array"}')).toEqual([]);
  });
});

// =============================================================================
// Daily Index & Seeded Functions
// =============================================================================

describe("getDailyIndex", () => {
  it("returns consistent index for same date + tenant", () => {
    const a = getDailyIndex("tenant1", 10, "2025-01-01");
    const b = getDailyIndex("tenant1", 10, "2025-01-01");
    expect(a).toBe(b);
  });

  it("returns different index for different dates", () => {
    const a = getDailyIndex("tenant1", 100, "2025-01-01");
    const b = getDailyIndex("tenant1", 100, "2025-06-15");
    expect(a).not.toBe(b);
  });

  it("returns index within range", () => {
    const idx = getDailyIndex("test", 5, "2025-01-01");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(5);
  });
});

describe("get8BallAnswer", () => {
  it("returns a default answer", () => {
    const answer = get8BallAnswer();
    expect(DEFAULT_8BALL_ANSWERS).toContain(answer);
  });

  it("uses custom answers when provided", () => {
    const custom = ["Yes!", "No!"];
    const answer = get8BallAnswer(custom);
    expect(custom).toContain(answer);
  });
});

describe("getDailyFortune", () => {
  it("returns a fortune string", () => {
    const fortune = getDailyFortune("tenant1", undefined, "2025-01-01");
    expect(typeof fortune).toBe("string");
    expect(fortune.length).toBeGreaterThan(0);
  });

  it("returns consistent fortune for same date", () => {
    const a = getDailyFortune("t1", undefined, "2025-06-01");
    const b = getDailyFortune("t1", undefined, "2025-06-01");
    expect(a).toBe(b);
  });

  it("uses custom fortunes when provided", () => {
    const custom = ["Custom fortune one", "Custom fortune two"];
    const fortune = getDailyFortune("t1", custom, "2025-01-01");
    expect(custom).toContain(fortune);
  });
});

describe("getDailyTarot", () => {
  it("returns a tarot card", () => {
    const card = getDailyTarot("tenant1", "2025-01-01");
    expect(card).toHaveProperty("name");
    expect(card).toHaveProperty("meaning");
    expect(card).toHaveProperty("number");
  });

  it("returns consistent card for same date", () => {
    const a = getDailyTarot("t1", "2025-06-01");
    const b = getDailyTarot("t1", "2025-06-01");
    expect(a.name).toBe(b.name);
  });

  it("returns card number in 0-21 range", () => {
    const card = getDailyTarot("test", "2025-03-15");
    expect(card.number).toBeGreaterThanOrEqual(0);
    expect(card.number).toBeLessThanOrEqual(21);
  });
});

// =============================================================================
// Dice & Coin
// =============================================================================

describe("rollDice", () => {
  it("returns value within dice range", () => {
    for (let i = 0; i < 50; i++) {
      const val = rollDice("d6");
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });

  it("works for d20", () => {
    for (let i = 0; i < 50; i++) {
      const val = rollDice("d20");
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(20);
    }
  });
});

describe("flipCoin", () => {
  it("returns heads or tails", () => {
    for (let i = 0; i < 20; i++) {
      const result = flipCoin();
      expect(["heads", "tails"]).toContain(result);
    }
  });
});

// =============================================================================
// Record Transform
// =============================================================================

describe("rowToRecord", () => {
  it("transforms a database row with all v2 fields", () => {
    const record = rowToRecord({
      id: "art_123",
      tenant_id: "t1",
      artifact_type: "moodcandle",
      placement: "sidebar",
      config: '{"flameColor": "amber"}',
      sort_order: 0,
      visibility: "hidden",
      discovery_rules: '[{"type":"dark-mode","value":"true"}]',
      reveal_animation: "sparkle",
      container: "glass-card",
      position_x: 50,
      position_y: 25,
      z_index: 15,
      fallback_zone: "floating",
      created_at: "2025-01-01",
    });

    expect(record.id).toBe("art_123");
    expect(record.artifactType).toBe("moodcandle");
    expect(record.placement).toBe("sidebar");
    expect(record.visibility).toBe("hidden");
    expect(record.discoveryRules).toHaveLength(1);
    expect(record.revealAnimation).toBe("sparkle");
    expect(record.container).toBe("glass-card");
    expect(record.positionX).toBe(50);
    expect(record.positionY).toBe(25);
    expect(record.zIndex).toBe(15);
    expect(record.fallbackZone).toBe("floating");
  });

  it("uses defaults for missing v2 fields", () => {
    const record = rowToRecord({
      id: "art_456",
      tenant_id: "t2",
      artifact_type: "magic8ball",
      placement: "sidebar",
      config: "{}",
      sort_order: 1,
      created_at: "2025-01-01",
    });

    expect(record.visibility).toBe("always");
    expect(record.discoveryRules).toEqual([]);
    expect(record.revealAnimation).toBe("fade");
    expect(record.container).toBe("none");
    expect(record.positionX).toBeNull();
    expect(record.positionY).toBeNull();
    expect(record.zIndex).toBe(10);
    expect(record.fallbackZone).toBe("floating");
  });
});

describe("toDisplayArtifact", () => {
  it("transforms record to display with v2 fields", () => {
    const record: ArtifactRecord = {
      id: "art_123",
      tenantId: "t1",
      artifactType: "magic8ball",
      placement: "sidebar",
      config: { customAnswers: ["Yes"] },
      sortOrder: 0,
      visibility: "always",
      discoveryRules: [],
      revealAnimation: "fade",
      container: "none",
      positionX: null,
      positionY: null,
      zIndex: 10,
      fallbackZone: "floating",
      createdAt: "2025-01-01",
    };
    const display = toDisplayArtifact(record);
    expect(display).toEqual({
      id: "art_123",
      artifactType: "magic8ball",
      placement: "sidebar",
      config: { customAnswers: ["Yes"] },
      visibility: "always",
      discoveryRules: [],
      revealAnimation: "fade",
      container: "none",
      positionX: null,
      positionY: null,
      zIndex: 10,
      fallbackZone: "floating",
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("sortOrder");
  });
});

// =============================================================================
// Discovery Engine
// =============================================================================

describe("evaluateDiscoveryRules", () => {
  it("returns true for empty rules", () => {
    expect(evaluateDiscoveryRules([], {})).toBe(true);
  });

  it("evaluates dark-mode rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "dark-mode", value: "true" },
    ];
    expect(evaluateDiscoveryRules(rules, { isDarkMode: true })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { isDarkMode: false })).toBe(false);
  });

  it("evaluates scroll-depth rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "scroll-depth", value: 80 },
    ];
    expect(evaluateDiscoveryRules(rules, { scrollDepth: 90 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { scrollDepth: 50 })).toBe(false);
  });

  it("evaluates time-of-day rule (normal range)", () => {
    const rules: DiscoveryCondition[] = [
      { type: "time-of-day", value: "10-18" },
    ];
    expect(evaluateDiscoveryRules(rules, { hour: 14 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { hour: 22 })).toBe(false);
  });

  it("evaluates time-of-day rule (overnight range)", () => {
    const rules: DiscoveryCondition[] = [
      { type: "time-of-day", value: "22-6" },
    ];
    expect(evaluateDiscoveryRules(rules, { hour: 23 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { hour: 3 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { hour: 14 })).toBe(false);
  });

  it("evaluates day-of-week rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "day-of-week", value: "5,6" },
    ];
    expect(evaluateDiscoveryRules(rules, { dayOfWeek: 5 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { dayOfWeek: 1 })).toBe(false);
  });

  it("evaluates season rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "season", value: "winter" },
    ];
    expect(evaluateDiscoveryRules(rules, { season: "winter" })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { season: "summer" })).toBe(false);
  });

  it("evaluates specific-date rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "specific-date", value: "10-31" },
    ];
    expect(evaluateDiscoveryRules(rules, { date: "10-31" })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { date: "03-15" })).toBe(false);
  });

  it("evaluates pages-visited rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "pages-visited", value: 3 },
    ];
    expect(evaluateDiscoveryRules(rules, { pagesVisited: 5 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { pagesVisited: 1 })).toBe(false);
  });

  it("evaluates time-on-site rule", () => {
    const rules: DiscoveryCondition[] = [
      { type: "time-on-site", value: 120 },
    ];
    expect(evaluateDiscoveryRules(rules, { timeOnSite: 150 })).toBe(true);
    expect(evaluateDiscoveryRules(rules, { timeOnSite: 60 })).toBe(false);
  });

  it("uses AND logic for multiple rules", () => {
    const rules: DiscoveryCondition[] = [
      { type: "dark-mode", value: "true" },
      { type: "scroll-depth", value: 50 },
    ];
    expect(
      evaluateDiscoveryRules(rules, { isDarkMode: true, scrollDepth: 80 }),
    ).toBe(true);
    expect(
      evaluateDiscoveryRules(rules, { isDarkMode: true, scrollDepth: 20 }),
    ).toBe(false);
    expect(
      evaluateDiscoveryRules(rules, { isDarkMode: false, scrollDepth: 80 }),
    ).toBe(false);
  });
});
