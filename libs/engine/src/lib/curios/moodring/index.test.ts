import { describe, it, expect } from "vitest";
import {
  generateMoodLogId,
  isValidMode,
  isValidDisplayStyle,
  isValidColorScheme,
  isValidHexColor,
  sanitizeMoodText,
  sanitizeNote,
  getTimeColor,
  getCurrentSeason,
  getSeasonalColor,
  getRandomColor,
  toDisplayMoodLog,
  MODE_OPTIONS,
  DISPLAY_STYLE_OPTIONS,
  COLOR_SCHEME_OPTIONS,
  TIME_COLORS,
  SEASONAL_COLORS,
  RANDOM_PALETTE,
  MAX_MOOD_TEXT_LENGTH,
  MAX_NOTE_LENGTH,
  type MoodLogEntry,
} from "./index";

describe("Mood Ring constants", () => {
  it("has 4 mode options", () => {
    expect(MODE_OPTIONS).toHaveLength(4);
    expect(MODE_OPTIONS.map((m) => m.value)).toEqual([
      "time",
      "manual",
      "seasonal",
      "random",
    ]);
  });

  it("has 3 display styles", () => {
    expect(DISPLAY_STYLE_OPTIONS).toHaveLength(3);
    expect(DISPLAY_STYLE_OPTIONS.map((s) => s.value)).toEqual([
      "ring",
      "gem",
      "orb",
    ]);
  });

  it("has 5 color schemes", () => {
    expect(COLOR_SCHEME_OPTIONS).toHaveLength(5);
  });

  it("has time color periods", () => {
    expect(TIME_COLORS.length).toBeGreaterThan(0);
  });

  it("has seasonal colors", () => {
    expect(SEASONAL_COLORS.spring).toBeDefined();
    expect(SEASONAL_COLORS.autumn).toBeDefined();
  });

  it("has random palette colors", () => {
    expect(RANDOM_PALETTE.length).toBeGreaterThan(0);
  });
});

describe("generateMoodLogId", () => {
  it("generates ml_ prefixed ID", () => {
    expect(generateMoodLogId()).toMatch(/^ml_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateMoodLogId()));
    expect(ids.size).toBe(20);
  });
});

describe("isValidMode", () => {
  it("accepts valid modes", () => {
    expect(isValidMode("time")).toBe(true);
    expect(isValidMode("manual")).toBe(true);
    expect(isValidMode("seasonal")).toBe(true);
    expect(isValidMode("random")).toBe(true);
  });

  it("rejects invalid modes", () => {
    expect(isValidMode("auto")).toBe(false);
    expect(isValidMode("")).toBe(false);
  });
});

describe("isValidDisplayStyle", () => {
  it("accepts ring, gem, orb", () => {
    expect(isValidDisplayStyle("ring")).toBe(true);
    expect(isValidDisplayStyle("gem")).toBe(true);
    expect(isValidDisplayStyle("orb")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidDisplayStyle("square")).toBe(false);
  });
});

describe("isValidColorScheme", () => {
  it("accepts valid schemes", () => {
    expect(isValidColorScheme("default")).toBe(true);
    expect(isValidColorScheme("forest")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidColorScheme("neon")).toBe(false);
  });
});

describe("isValidHexColor", () => {
  it("accepts valid hex colors", () => {
    expect(isValidHexColor("#ff0000")).toBe(true);
    expect(isValidHexColor("#AABBCC")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHexColor("ff0000")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
  });
});

describe("sanitizeMoodText", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeMoodText(null)).toBeNull();
    expect(sanitizeMoodText("")).toBeNull();
  });

  it("strips HTML", () => {
    expect(sanitizeMoodText("<b>Happy</b>")).toBe("Happy");
  });

  it("truncates to max length", () => {
    const long = "x".repeat(100);
    expect(sanitizeMoodText(long)).toHaveLength(MAX_MOOD_TEXT_LENGTH);
  });
});

describe("sanitizeNote", () => {
  it("returns null for empty/null", () => {
    expect(sanitizeNote(null)).toBeNull();
  });

  it("truncates to max length", () => {
    const long = "x".repeat(300);
    expect(sanitizeNote(long)).toHaveLength(MAX_NOTE_LENGTH);
  });
});

describe("getTimeColor", () => {
  it("returns dawn for hour 5", () => {
    const c = getTimeColor(5);
    expect(c.name).toBe("Dawn");
  });

  it("returns morning for hour 8", () => {
    const c = getTimeColor(8);
    expect(c.name).toBe("Morning");
  });

  it("returns night for hour 22", () => {
    const c = getTimeColor(22);
    expect(c.name).toBe("Night");
  });

  it("returns deep night for hour 2", () => {
    const c = getTimeColor(2);
    expect(c.name).toBe("Deep Night");
  });

  it("returns a valid color string", () => {
    const c = getTimeColor(12);
    expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("getCurrentSeason", () => {
  it("returns a valid season string", () => {
    const s = getCurrentSeason();
    expect(["spring", "summer", "autumn", "winter"]).toContain(s);
  });
});

describe("getSeasonalColor", () => {
  it("returns a named color object", () => {
    const c = getSeasonalColor();
    expect(c.name).toBeDefined();
    expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("getRandomColor", () => {
  it("returns a color from the palette", () => {
    const c = getRandomColor("tenant1");
    expect(RANDOM_PALETTE).toContain(c);
  });
});

describe("toDisplayMoodLog", () => {
  it("transforms entry to display format", () => {
    const entry: MoodLogEntry = {
      id: "ml_123",
      tenantId: "t1",
      mood: "Happy",
      color: "#ff0000",
      note: "Good day",
      loggedAt: "2025-01-01",
    };
    const display = toDisplayMoodLog(entry);
    expect(display).toEqual({
      mood: "Happy",
      color: "#ff0000",
      note: "Good day",
      loggedAt: "2025-01-01",
    });
    expect(display).not.toHaveProperty("id");
    expect(display).not.toHaveProperty("tenantId");
  });
});
