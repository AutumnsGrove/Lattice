import { describe, it, expect } from "vitest";
import {
  isValidPreset,
  isValidTrailEffect,
  isValidTrailLength,
  isValidCursorUrl,
  toDisplayCursorConfig,
  CURSOR_PRESETS,
  TRAIL_EFFECT_OPTIONS,
  VALID_PRESETS,
  VALID_TRAIL_EFFECTS,
  MIN_TRAIL_LENGTH,
  MAX_TRAIL_LENGTH,
  type CursorConfigRecord,
} from "./index";

describe("Cursors constants", () => {
  it("has 13 cursor presets", () => {
    expect(CURSOR_PRESETS).toHaveLength(13);
  });

  it("has 5 trail effect options", () => {
    expect(TRAIL_EFFECT_OPTIONS).toHaveLength(5);
  });

  it("has valid presets set matching options", () => {
    for (const p of CURSOR_PRESETS) {
      expect(VALID_PRESETS.has(p.value)).toBe(true);
    }
  });

  it("has valid trail effects set matching options", () => {
    for (const e of TRAIL_EFFECT_OPTIONS) {
      expect(VALID_TRAIL_EFFECTS.has(e.value)).toBe(true);
    }
  });
});

describe("isValidPreset", () => {
  it("accepts valid presets", () => {
    expect(isValidPreset("leaf")).toBe(true);
    expect(isValidPreset("butterfly")).toBe(true);
    expect(isValidPreset("snowflake")).toBe(true);
  });

  it("rejects invalid presets", () => {
    expect(isValidPreset("invalid")).toBe(false);
    expect(isValidPreset("")).toBe(false);
    expect(isValidPreset("LEAF")).toBe(false);
  });
});

describe("isValidTrailEffect", () => {
  it("accepts valid effects", () => {
    expect(isValidTrailEffect("sparkle")).toBe(true);
    expect(isValidTrailEffect("none")).toBe(true);
  });

  it("rejects invalid effects", () => {
    expect(isValidTrailEffect("fire")).toBe(false);
  });
});

describe("isValidTrailLength", () => {
  it("accepts valid lengths", () => {
    expect(isValidTrailLength(MIN_TRAIL_LENGTH)).toBe(true);
    expect(isValidTrailLength(MAX_TRAIL_LENGTH)).toBe(true);
    expect(isValidTrailLength(8)).toBe(true);
  });

  it("rejects out-of-range lengths", () => {
    expect(isValidTrailLength(2)).toBe(false);
    expect(isValidTrailLength(21)).toBe(false);
    expect(isValidTrailLength(0)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidTrailLength(5.5)).toBe(false);
  });
});

describe("isValidCursorUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidCursorUrl("https://example.com/cursor.png")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isValidCursorUrl("http://example.com/cursor.png")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidCursorUrl("ftp://example.com")).toBe(false);
    expect(isValidCursorUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidCursorUrl("not a url")).toBe(false);
  });
});

describe("toDisplayCursorConfig", () => {
  it("transforms record to display", () => {
    const record: CursorConfigRecord = {
      tenantId: "t1",
      cursorType: "preset",
      preset: "leaf",
      customUrl: null,
      trailEnabled: true,
      trailEffect: "sparkle",
      trailLength: 8,
      updatedAt: "2025-01-01",
    };
    const display = toDisplayCursorConfig(record);
    expect(display).toEqual({
      cursorType: "preset",
      preset: "leaf",
      customUrl: null,
      trailEnabled: true,
      trailEffect: "sparkle",
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("trailLength");
  });
});
