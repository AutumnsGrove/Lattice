import { describe, it, expect } from "vitest";
import {
  generateShrineId,
  isValidShrineType,
  isValidSize,
  isValidFrameStyle,
  sanitizeTitle,
  sanitizeDescription,
  parseContents,
  toDisplayShrine,
  SHRINE_TYPE_OPTIONS,
  SIZE_OPTIONS,
  FRAME_STYLE_OPTIONS,
  VALID_SHRINE_TYPES,
  VALID_SIZES,
  VALID_FRAME_STYLES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  type ShrineRecord,
} from "./index";

describe("Shrines constants", () => {
  it("has 6 shrine type options", () => {
    expect(SHRINE_TYPE_OPTIONS).toHaveLength(6);
  });

  it("has 3 size options", () => {
    expect(SIZE_OPTIONS).toHaveLength(3);
  });

  it("has 6 frame style options", () => {
    expect(FRAME_STYLE_OPTIONS).toHaveLength(6);
  });

  it("has valid types set matching options", () => {
    for (const t of SHRINE_TYPE_OPTIONS) {
      expect(VALID_SHRINE_TYPES.has(t.value)).toBe(true);
    }
  });

  it("has valid sizes set matching options", () => {
    for (const s of SIZE_OPTIONS) {
      expect(VALID_SIZES.has(s.value)).toBe(true);
    }
  });

  it("has valid frame styles set matching options", () => {
    for (const f of FRAME_STYLE_OPTIONS) {
      expect(VALID_FRAME_STYLES.has(f.value)).toBe(true);
    }
  });
});

describe("generateShrineId", () => {
  it("generates shrine-prefixed IDs", () => {
    const id = generateShrineId();
    expect(id).toMatch(/^shrine_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateShrineId()));
    expect(ids.size).toBe(10);
  });
});

describe("isValidShrineType", () => {
  it("accepts valid types", () => {
    expect(isValidShrineType("memory")).toBe(true);
    expect(isValidShrineType("fandom")).toBe(true);
    expect(isValidShrineType("achievement")).toBe(true);
    expect(isValidShrineType("gratitude")).toBe(true);
    expect(isValidShrineType("inspiration")).toBe(true);
    expect(isValidShrineType("blank")).toBe(true);
  });

  it("rejects invalid types", () => {
    expect(isValidShrineType("memorial")).toBe(false);
    expect(isValidShrineType("")).toBe(false);
  });
});

describe("isValidSize", () => {
  it("accepts valid sizes", () => {
    expect(isValidSize("small")).toBe(true);
    expect(isValidSize("medium")).toBe(true);
    expect(isValidSize("large")).toBe(true);
  });

  it("rejects invalid sizes", () => {
    expect(isValidSize("xl")).toBe(false);
    expect(isValidSize("")).toBe(false);
  });
});

describe("isValidFrameStyle", () => {
  it("accepts valid frame styles", () => {
    expect(isValidFrameStyle("wood")).toBe(true);
    expect(isValidFrameStyle("stone")).toBe(true);
    expect(isValidFrameStyle("crystal")).toBe(true);
    expect(isValidFrameStyle("floral")).toBe(true);
    expect(isValidFrameStyle("cosmic")).toBe(true);
    expect(isValidFrameStyle("minimal")).toBe(true);
  });

  it("rejects invalid frame styles", () => {
    expect(isValidFrameStyle("gold")).toBe(false);
    expect(isValidFrameStyle("")).toBe(false);
  });
});

describe("sanitizeTitle", () => {
  it("strips HTML tags", () => {
    expect(sanitizeTitle("<b>My Shrine</b>")).toBe("My Shrine");
  });

  it("truncates long titles", () => {
    const long = "t".repeat(200);
    expect(sanitizeTitle(long)?.length).toBe(MAX_TITLE_LENGTH);
  });

  it("returns null for empty", () => {
    expect(sanitizeTitle("")).toBe(null);
    expect(sanitizeTitle(null)).toBe(null);
    expect(sanitizeTitle(undefined)).toBe(null);
  });

  it("returns null for HTML-only input", () => {
    expect(sanitizeTitle("<br><hr>")).toBe(null);
  });
});

describe("sanitizeDescription", () => {
  it("strips HTML", () => {
    expect(sanitizeDescription("<p>A shrine</p>")).toBe("A shrine");
  });

  it("truncates long descriptions", () => {
    const long = "d".repeat(600);
    expect(sanitizeDescription(long)?.length).toBe(MAX_DESCRIPTION_LENGTH);
  });

  it("returns null for empty", () => {
    expect(sanitizeDescription("")).toBe(null);
  });
});

describe("parseContents", () => {
  it("parses valid JSON array", () => {
    const json = JSON.stringify([
      { type: "text", x: 10, y: 20, data: { text: "Hello" } },
      { type: "image", x: 50, y: 50, data: { url: "test.png" } },
    ]);
    const result = parseContents(json);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("text");
  });

  it("filters out invalid items", () => {
    const json = JSON.stringify([
      { type: "text", x: 10, y: 20, data: {} },
      { invalid: true },
      "not an object",
      { type: "image" }, // missing x, y
    ]);
    const result = parseContents(json);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseContents('{"not": "array"}')).toEqual([]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseContents("invalid")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseContents("")).toEqual([]);
  });
});

describe("toDisplayShrine", () => {
  it("transforms record to display", () => {
    const record: ShrineRecord = {
      id: "shrine_1",
      tenantId: "t1",
      title: "My Shrine",
      shrineType: "memory",
      description: "A precious memory",
      size: "medium",
      frameStyle: "floral",
      contents: [{ type: "text", x: 10, y: 20, data: { text: "Hello" } }],
      isPublished: true,
      sortOrder: 0,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
    };
    const display = toDisplayShrine(record);
    expect(display).toEqual({
      id: "shrine_1",
      title: "My Shrine",
      shrineType: "memory",
      description: "A precious memory",
      size: "medium",
      frameStyle: "floral",
      contents: [{ type: "text", x: 10, y: 20, data: { text: "Hello" } }],
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("isPublished");
    expect(display).not.toHaveProperty("sortOrder");
  });
});
