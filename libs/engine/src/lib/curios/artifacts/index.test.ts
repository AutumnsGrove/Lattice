import { describe, it, expect } from "vitest";
import {
  generateArtifactId,
  isValidArtifactType,
  isValidPlacement,
  sanitizeConfig,
  sanitizeMarqueeText,
  getDailyIndex,
  get8BallAnswer,
  getDailyFortune,
  rollDice,
  flipCoin,
  toDisplayArtifact,
  ARTIFACT_TYPES,
  PLACEMENT_OPTIONS,
  DEFAULT_8BALL_ANSWERS,
  DEFAULT_FORTUNES,
  DICE_FACES,
  MAX_MARQUEE_TEXT_LENGTH,
  type ArtifactRecord,
} from "./index";

describe("Artifacts constants", () => {
  it("has 8 artifact types", () => {
    expect(ARTIFACT_TYPES).toHaveLength(8);
  });

  it("has 3 placement options", () => {
    expect(PLACEMENT_OPTIONS).toHaveLength(3);
    expect(PLACEMENT_OPTIONS.map((p) => p.value)).toEqual([
      "right-vine",
      "left-vine",
      "floating",
    ]);
  });

  it("has 20 default 8-ball answers", () => {
    expect(DEFAULT_8BALL_ANSWERS.length).toBe(20);
  });

  it("has 15 default fortunes", () => {
    expect(DEFAULT_FORTUNES.length).toBe(15);
  });

  it("has correct dice faces", () => {
    expect(DICE_FACES.d4).toBe(4);
    expect(DICE_FACES.d6).toBe(6);
    expect(DICE_FACES.d20).toBe(20);
  });
});

describe("generateArtifactId", () => {
  it("generates art_ prefixed ID", () => {
    expect(generateArtifactId()).toMatch(/^art_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateArtifactId()));
    expect(ids.size).toBe(20);
  });
});

describe("isValidArtifactType", () => {
  it("accepts valid types", () => {
    expect(isValidArtifactType("magic8ball")).toBe(true);
    expect(isValidArtifactType("diceroller")).toBe(true);
    expect(isValidArtifactType("marqueetext")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(isValidArtifactType("invalid")).toBe(false);
    expect(isValidArtifactType("")).toBe(false);
  });
});

describe("isValidPlacement", () => {
  it("accepts valid placements", () => {
    expect(isValidPlacement("right-vine")).toBe(true);
    expect(isValidPlacement("floating")).toBe(true);
  });

  it("rejects invalid placements", () => {
    expect(isValidPlacement("center")).toBe(false);
  });
});

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
    const fortune = getDailyFortune("tenant1", "2025-01-01");
    expect(typeof fortune).toBe("string");
    expect(fortune.length).toBeGreaterThan(0);
  });

  it("returns consistent fortune for same date", () => {
    const a = getDailyFortune("t1", "2025-06-01");
    const b = getDailyFortune("t1", "2025-06-01");
    expect(a).toBe(b);
  });
});

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

describe("toDisplayArtifact", () => {
  it("transforms record to display", () => {
    const record: ArtifactRecord = {
      id: "art_123",
      tenantId: "t1",
      artifactType: "magic8ball",
      placement: "right-vine",
      config: { customAnswers: ["Yes"] },
      sortOrder: 0,
      createdAt: "2025-01-01",
    };
    const display = toDisplayArtifact(record);
    expect(display).toEqual({
      id: "art_123",
      artifactType: "magic8ball",
      placement: "right-vine",
      config: { customAnswers: ["Yes"] },
    });
    expect(display).not.toHaveProperty("tenantId");
  });
});
