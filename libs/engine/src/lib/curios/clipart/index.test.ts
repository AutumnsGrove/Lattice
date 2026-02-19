import { describe, it, expect } from "vitest";
import {
  generatePlacementId,
  isValidCategory,
  isValidScale,
  isValidRotation,
  isValidPosition,
  isValidZIndex,
  toDisplayPlacement,
  ASSET_CATEGORY_OPTIONS,
  VALID_CATEGORIES,
  MIN_SCALE,
  MAX_SCALE,
  MIN_ROTATION,
  MAX_ROTATION,
  MIN_Z_INDEX,
  MAX_Z_INDEX,
  type ClipArtPlacementRecord,
} from "./index";

describe("Clipart constants", () => {
  it("has 5 asset category options", () => {
    expect(ASSET_CATEGORY_OPTIONS).toHaveLength(5);
  });

  it("has valid categories set matching options", () => {
    for (const c of ASSET_CATEGORY_OPTIONS) {
      expect(VALID_CATEGORIES.has(c.value)).toBe(true);
    }
  });

  it("has sensible scale range", () => {
    expect(MIN_SCALE).toBe(0.25);
    expect(MAX_SCALE).toBe(3.0);
  });

  it("has sensible rotation range", () => {
    expect(MIN_ROTATION).toBe(0);
    expect(MAX_ROTATION).toBe(360);
  });

  it("has sensible z-index range", () => {
    expect(MIN_Z_INDEX).toBe(1);
    expect(MAX_Z_INDEX).toBe(100);
  });
});

describe("generatePlacementId", () => {
  it("generates clip-prefixed IDs", () => {
    const id = generatePlacementId();
    expect(id).toMatch(/^clip_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(
      Array.from({ length: 10 }, () => generatePlacementId()),
    );
    expect(ids.size).toBe(10);
  });
});

describe("isValidCategory", () => {
  it("accepts valid categories", () => {
    expect(isValidCategory("foliage")).toBe(true);
    expect(isValidCategory("critters")).toBe(true);
    expect(isValidCategory("effects")).toBe(true);
    expect(isValidCategory("labels")).toBe(true);
    expect(isValidCategory("decorative")).toBe(true);
  });

  it("rejects invalid categories", () => {
    expect(isValidCategory("flowers")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });
});

describe("isValidScale", () => {
  it("accepts valid scales", () => {
    expect(isValidScale(0.25)).toBe(true);
    expect(isValidScale(1.0)).toBe(true);
    expect(isValidScale(3.0)).toBe(true);
    expect(isValidScale(1.5)).toBe(true);
  });

  it("rejects out-of-range scales", () => {
    expect(isValidScale(0.1)).toBe(false);
    expect(isValidScale(3.5)).toBe(false);
    expect(isValidScale(0)).toBe(false);
    expect(isValidScale(-1)).toBe(false);
  });
});

describe("isValidRotation", () => {
  it("accepts valid rotations", () => {
    expect(isValidRotation(0)).toBe(true);
    expect(isValidRotation(180)).toBe(true);
    expect(isValidRotation(360)).toBe(true);
    expect(isValidRotation(45.5)).toBe(true);
  });

  it("rejects out-of-range rotations", () => {
    expect(isValidRotation(-1)).toBe(false);
    expect(isValidRotation(361)).toBe(false);
  });
});

describe("isValidPosition", () => {
  it("accepts valid positions", () => {
    expect(isValidPosition(0)).toBe(true);
    expect(isValidPosition(50)).toBe(true);
    expect(isValidPosition(100)).toBe(true);
  });

  it("rejects out-of-range positions", () => {
    expect(isValidPosition(-1)).toBe(false);
    expect(isValidPosition(101)).toBe(false);
  });
});

describe("isValidZIndex", () => {
  it("accepts valid z-indices", () => {
    expect(isValidZIndex(1)).toBe(true);
    expect(isValidZIndex(50)).toBe(true);
    expect(isValidZIndex(100)).toBe(true);
  });

  it("rejects out-of-range z-indices", () => {
    expect(isValidZIndex(0)).toBe(false);
    expect(isValidZIndex(101)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidZIndex(5.5)).toBe(false);
  });
});

describe("toDisplayPlacement", () => {
  it("transforms record to display", () => {
    const record: ClipArtPlacementRecord = {
      id: "clip_1",
      tenantId: "t1",
      assetId: "foliage-vine-01",
      pagePath: "/",
      xPosition: 10,
      yPosition: 20,
      scale: 1.5,
      rotation: 45,
      zIndex: 5,
      createdAt: "2025-01-01",
    };
    const display = toDisplayPlacement(record);
    expect(display).toEqual({
      id: "clip_1",
      assetId: "foliage-vine-01",
      pagePath: "/",
      xPosition: 10,
      yPosition: 20,
      scale: 1.5,
      rotation: 45,
      zIndex: 5,
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("createdAt");
  });
});
