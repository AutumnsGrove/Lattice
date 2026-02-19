import { describe, it, expect } from "vitest";
import {
  isValidSoundSet,
  isValidVolume,
  isValidUrl,
  toDisplayAmbientConfig,
  SOUND_SET_OPTIONS,
  VALID_SOUND_SETS,
  MIN_VOLUME,
  MAX_VOLUME,
  DEFAULT_VOLUME,
  type AmbientConfigRecord,
} from "./index";

describe("Ambient constants", () => {
  it("has 7 sound set options", () => {
    expect(SOUND_SET_OPTIONS).toHaveLength(7);
  });

  it("has valid sound sets matching options", () => {
    for (const s of SOUND_SET_OPTIONS) {
      expect(VALID_SOUND_SETS.has(s.value)).toBe(true);
    }
  });

  it("has sensible volume defaults", () => {
    expect(MIN_VOLUME).toBe(0);
    expect(MAX_VOLUME).toBe(100);
    expect(DEFAULT_VOLUME).toBeGreaterThan(0);
    expect(DEFAULT_VOLUME).toBeLessThanOrEqual(MAX_VOLUME);
  });
});

describe("isValidSoundSet", () => {
  it("accepts valid sound sets", () => {
    expect(isValidSoundSet("forest-rain")).toBe(true);
    expect(isValidSoundSet("morning-birds")).toBe(true);
    expect(isValidSoundSet("creek")).toBe(true);
    expect(isValidSoundSet("night")).toBe(true);
    expect(isValidSoundSet("lo-fi")).toBe(true);
    expect(isValidSoundSet("fireplace")).toBe(true);
    expect(isValidSoundSet("seasonal")).toBe(true);
  });

  it("rejects invalid sound sets", () => {
    expect(isValidSoundSet("thunder")).toBe(false);
    expect(isValidSoundSet("")).toBe(false);
    expect(isValidSoundSet("FOREST-RAIN")).toBe(false);
  });
});

describe("isValidVolume", () => {
  it("accepts valid volumes", () => {
    expect(isValidVolume(0)).toBe(true);
    expect(isValidVolume(50)).toBe(true);
    expect(isValidVolume(100)).toBe(true);
  });

  it("rejects out-of-range volumes", () => {
    expect(isValidVolume(-1)).toBe(false);
    expect(isValidVolume(101)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidVolume(50.5)).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://example.com/audio.mp3")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com/audio.mp3")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});

describe("toDisplayAmbientConfig", () => {
  it("transforms record to display", () => {
    const record: AmbientConfigRecord = {
      tenantId: "t1",
      soundSet: "forest-rain",
      volume: 30,
      enabled: true,
      customUrl: null,
      updatedAt: "2025-01-01",
    };
    const display = toDisplayAmbientConfig(record);
    expect(display).toEqual({
      soundSet: "forest-rain",
      volume: 30,
      enabled: true,
      customUrl: null,
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("updatedAt");
  });

  it("preserves customUrl when present", () => {
    const record: AmbientConfigRecord = {
      tenantId: "t1",
      soundSet: "lo-fi",
      volume: 60,
      enabled: true,
      customUrl: "https://example.com/beats.mp3",
      updatedAt: "2025-01-01",
    };
    const display = toDisplayAmbientConfig(record);
    expect(display.customUrl).toBe("https://example.com/beats.mp3");
  });
});
