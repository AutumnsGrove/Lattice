/**
 * Gutter Utility Tests
 *
 * Comprehensive tests for gutter anchor utilities covering:
 * - parseAnchor: Parsing anchor strings to identify type and value
 * - getAnchorKey: Generating unique keys for anchors
 * - getUniqueAnchors: Extracting unique anchors from items
 * - getAnchorLabel: Creating human-readable labels
 * - getItemsForAnchor: Finding items by anchor
 * - getOrphanItems: Identifying items without valid anchors
 * - findAnchorElement: Locating DOM elements for anchors
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseAnchor,
  getAnchorKey,
  getUniqueAnchors,
  getAnchorLabel,
  getItemsForAnchor,
  getOrphanItems,
  findAnchorElement,
  type GutterItem,
  type Header,
} from "./gutter";

// =============================================================================
// Test Data
// =============================================================================

const mockHeaders: Header[] = [
  { id: "introduction", text: "Introduction", level: 2 },
  { id: "getting-started", text: "Getting Started", level: 2 },
  { id: "advanced-usage", text: "Advanced Usage", level: 3 },
];

const mockItems: GutterItem[] = [
  {
    anchor: "## Introduction",
    type: "comment",
    content: "This is the intro section",
  },
  {
    anchor: "paragraph:3",
    type: "image",
    src: "img.jpg",
    alt: "Sample image",
  },
  {
    anchor: "anchor:sidebar",
    type: "markdown",
    content: "Sidebar content",
  },
  {
    anchor: "paragraph:1",
    type: "comment",
    content: "First paragraph note",
  },
  {
    anchor: "## Getting Started",
    type: "image",
    src: "guide.jpg",
  },
  {
    type: "photo",
    src: "orphan.jpg",
    alt: "Orphan image",
  },
  {
    anchor: "anchor:custom-tag",
    type: "markdown",
    content: "Custom content",
  },
];

// =============================================================================
// parseAnchor Tests
// =============================================================================

describe("parseAnchor", () => {
  describe("null and undefined handling", () => {
    it("should return none type for null", () => {
      const result = parseAnchor(null);
      expect(result.type).toBe("none");
      expect(result.value).toBe(null);
    });

    it("should return none type for undefined", () => {
      const result = parseAnchor(undefined);
      expect(result.type).toBe("none");
      expect(result.value).toBe(null);
    });

    it("should return none type for empty string", () => {
      const result = parseAnchor("");
      expect(result.type).toBe("none");
      expect(result.value).toBe(null);
    });
  });

  describe("paragraph anchor parsing", () => {
    it("should parse paragraph:N format", () => {
      const result = parseAnchor("paragraph:1");
      expect(result.type).toBe("paragraph");
      expect(result.value).toBe(1);
    });

    it("should parse paragraph with multi-digit number", () => {
      const result = parseAnchor("paragraph:42");
      expect(result.type).toBe("paragraph");
      expect(result.value).toBe(42);
    });

    it("should convert paragraph value to number", () => {
      const result = parseAnchor("paragraph:100");
      expect(typeof result.value).toBe("number");
      expect(result.value).toBe(100);
    });

    it("should not match malformed paragraph anchor", () => {
      const result = parseAnchor("paragraph:abc");
      expect(result.type).toBe("header");
      expect(result.value).toBe("paragraph:abc");
    });

    it("should not match paragraph without number", () => {
      const result = parseAnchor("paragraph:");
      expect(result.type).toBe("header");
    });
  });

  describe("tag anchor parsing", () => {
    it("should parse anchor:tagname format", () => {
      const result = parseAnchor("anchor:sidebar");
      expect(result.type).toBe("tag");
      expect(result.value).toBe("sidebar");
    });

    it("should parse anchor with hyphens", () => {
      const result = parseAnchor("anchor:custom-tag-name");
      expect(result.type).toBe("tag");
      expect(result.value).toBe("custom-tag-name");
    });

    it("should parse anchor with underscores", () => {
      const result = parseAnchor("anchor:custom_tag_name");
      expect(result.type).toBe("tag");
      expect(result.value).toBe("custom_tag_name");
    });

    it("should parse anchor with numbers", () => {
      const result = parseAnchor("anchor:tag123");
      expect(result.type).toBe("tag");
      expect(result.value).toBe("tag123");
    });

    it("should not match anchor with spaces", () => {
      const result = parseAnchor("anchor:tag with spaces");
      expect(result.type).toBe("header");
    });

    it("should not match anchor without name", () => {
      const result = parseAnchor("anchor:");
      expect(result.type).toBe("header");
    });
  });

  describe("header anchor parsing", () => {
    it("should parse single-level header", () => {
      const result = parseAnchor("# Header");
      expect(result.type).toBe("header");
      expect(result.value).toBe("# Header");
    });

    it("should parse level 2 header", () => {
      const result = parseAnchor("## Header Text");
      expect(result.type).toBe("header");
      expect(result.value).toBe("## Header Text");
    });

    it("should parse level 3 header", () => {
      const result = parseAnchor("### Deep Header");
      expect(result.type).toBe("header");
      expect(result.value).toBe("### Deep Header");
    });

    it("should parse level 6 header", () => {
      const result = parseAnchor("###### Small Header");
      expect(result.type).toBe("header");
      expect(result.value).toBe("###### Small Header");
    });

    it("should preserve full header text including special chars", () => {
      const result = parseAnchor("## Getting Started: A Guide");
      expect(result.type).toBe("header");
      expect(result.value).toBe("## Getting Started: A Guide");
    });

    it("should handle multiple spaces after hashes", () => {
      const result = parseAnchor("##   Multiple Spaces");
      expect(result.type).toBe("header");
      expect(result.value).toBe("##   Multiple Spaces");
    });
  });

  describe("backwards compatibility", () => {
    it("should treat unknown format as header", () => {
      const result = parseAnchor("some-unknown-format");
      expect(result.type).toBe("header");
      expect(result.value).toBe("some-unknown-format");
    });

    it("should treat custom strings as headers", () => {
      const result = parseAnchor("custom-anchor-id");
      expect(result.type).toBe("header");
      expect(result.value).toBe("custom-anchor-id");
    });
  });
});

// =============================================================================
// getAnchorKey Tests
// =============================================================================

describe("getAnchorKey", () => {
  describe("header anchors", () => {
    it("should return header:id for matching header", () => {
      const key = getAnchorKey("## Introduction", mockHeaders);
      expect(key).toBe("header:introduction");
    });

    it("should return header:id for different level header", () => {
      const key = getAnchorKey("### Advanced Usage", mockHeaders);
      expect(key).toBe("header:advanced-usage");
    });

    it("should return header:anchor for non-matching header", () => {
      const key = getAnchorKey("## Unknown Header", mockHeaders);
      expect(key).toBe("header:## Unknown Header");
    });

    it("should work with empty headers array", () => {
      const key = getAnchorKey("## Introduction", []);
      expect(key).toBe("header:## Introduction");
    });

    it("should work without headers parameter (default)", () => {
      const key = getAnchorKey("## Introduction");
      expect(key).toBe("header:## Introduction");
    });

    it("should handle header with extra whitespace", () => {
      const key = getAnchorKey("##   Getting Started", mockHeaders);
      // The replace strips leading # and spaces, leaving just the text
      expect(key).toBe("header:getting-started");
    });
  });

  describe("paragraph anchors", () => {
    it("should return paragraph:N for paragraph anchor", () => {
      const key = getAnchorKey("paragraph:3", mockHeaders);
      expect(key).toBe("paragraph:3");
    });

    it("should return paragraph:1 for first paragraph", () => {
      const key = getAnchorKey("paragraph:1", mockHeaders);
      expect(key).toBe("paragraph:1");
    });

    it("should preserve paragraph number exactly", () => {
      const key = getAnchorKey("paragraph:42", mockHeaders);
      expect(key).toBe("paragraph:42");
    });
  });

  describe("tag anchors", () => {
    it("should return tag:tagname for tag anchor", () => {
      const key = getAnchorKey("anchor:sidebar", mockHeaders);
      expect(key).toBe("tag:sidebar");
    });

    it("should handle tag with hyphens", () => {
      const key = getAnchorKey("anchor:custom-tag", mockHeaders);
      expect(key).toBe("tag:custom-tag");
    });

    it("should handle tag with numbers", () => {
      const key = getAnchorKey("anchor:tag123", mockHeaders);
      expect(key).toBe("tag:tag123");
    });
  });

  describe("unknown anchors", () => {
    it("should return header:anchor for unknown format (backwards compat)", () => {
      const key = getAnchorKey("random-string", mockHeaders);
      // Unknown formats are treated as headers for backwards compatibility
      expect(key).toBe("header:random-string");
    });

    it("should return header:anchor for malformed paragraph (backwards compat)", () => {
      const key = getAnchorKey("paragraph:abc", mockHeaders);
      // Malformed formats are treated as headers for backwards compatibility
      expect(key).toBe("header:paragraph:abc");
    });
  });
});

// =============================================================================
// getUniqueAnchors Tests
// =============================================================================

describe("getUniqueAnchors", () => {
  describe("null and undefined handling", () => {
    it("should return empty array for null items", () => {
      const anchors = getUniqueAnchors(null);
      expect(anchors).toEqual([]);
    });

    it("should return empty array for undefined items", () => {
      const anchors = getUniqueAnchors(undefined);
      expect(anchors).toEqual([]);
    });
  });

  describe("empty array handling", () => {
    it("should return empty array for empty items", () => {
      const anchors = getUniqueAnchors([]);
      expect(anchors).toEqual([]);
    });

    it("should skip items without anchor", () => {
      const items: GutterItem[] = [
        { type: "comment", content: "No anchor" },
        { type: "image", src: "img.jpg" },
      ];
      const anchors = getUniqueAnchors(items);
      expect(anchors).toEqual([]);
    });
  });

  describe("unique anchor extraction", () => {
    it("should return unique anchors in order", () => {
      const anchors = getUniqueAnchors(mockItems);
      expect(anchors).toEqual([
        "## Introduction",
        "paragraph:3",
        "anchor:sidebar",
        "paragraph:1",
        "## Getting Started",
        "anchor:custom-tag",
      ]);
    });

    it("should remove duplicate anchors", () => {
      const items: GutterItem[] = [
        { anchor: "paragraph:1", type: "comment" },
        { anchor: "paragraph:1", type: "image" },
        { anchor: "paragraph:2", type: "markdown" },
        { anchor: "paragraph:1", type: "photo" },
      ];
      const anchors = getUniqueAnchors(items);
      expect(anchors).toEqual(["paragraph:1", "paragraph:2"]);
    });

    it("should preserve order when deduplicating", () => {
      const items: GutterItem[] = [
        { anchor: "a", type: "comment" },
        { anchor: "b", type: "comment" },
        { anchor: "a", type: "comment" },
        { anchor: "c", type: "comment" },
        { anchor: "b", type: "comment" },
      ];
      const anchors = getUniqueAnchors(items);
      expect(anchors).toEqual(["a", "b", "c"]);
    });

    it("should skip items with undefined anchor", () => {
      const items: GutterItem[] = [
        { anchor: "a", type: "comment" },
        { type: "comment" },
        { anchor: "b", type: "comment" },
      ];
      const anchors = getUniqueAnchors(items);
      expect(anchors).toEqual(["a", "b"]);
    });
  });
});

// =============================================================================
// getAnchorLabel Tests
// =============================================================================

describe("getAnchorLabel", () => {
  describe("header labels", () => {
    it("should strip # prefix from single-level header", () => {
      const label = getAnchorLabel("# Header");
      expect(label).toBe("Header");
    });

    it("should strip ## prefix from level 2 header", () => {
      const label = getAnchorLabel("## Getting Started");
      expect(label).toBe("Getting Started");
    });

    it("should strip multiple # prefixes", () => {
      const label = getAnchorLabel("### Advanced Usage");
      expect(label).toBe("Advanced Usage");
    });

    it("should handle extra spaces after hashes", () => {
      const label = getAnchorLabel("##   Spaced Header");
      expect(label).toBe("Spaced Header");
    });

    it("should preserve header text with special characters", () => {
      const label = getAnchorLabel("## Getting Started: A Guide");
      expect(label).toBe("Getting Started: A Guide");
    });
  });

  describe("paragraph labels", () => {
    it("should return formatted paragraph label", () => {
      const label = getAnchorLabel("paragraph:1");
      expect(label).toBe("Paragraph 1");
    });

    it("should format multi-digit paragraphs", () => {
      const label = getAnchorLabel("paragraph:42");
      expect(label).toBe("Paragraph 42");
    });

    it("should capitalize Paragraph", () => {
      const label = getAnchorLabel("paragraph:10");
      expect(label).toBe("Paragraph 10");
    });
  });

  describe("tag labels", () => {
    it("should return formatted tag label", () => {
      const label = getAnchorLabel("anchor:sidebar");
      expect(label).toBe("Tag: sidebar");
    });

    it("should handle tags with hyphens", () => {
      const label = getAnchorLabel("anchor:custom-tag");
      expect(label).toBe("Tag: custom-tag");
    });

    it('should include "Tag: " prefix', () => {
      const label = getAnchorLabel("anchor:note");
      expect(label).toContain("Tag:");
    });
  });

  describe("unknown anchors", () => {
    it("should return unknown anchor as-is", () => {
      const label = getAnchorLabel("random-string");
      expect(label).toBe("random-string");
    });

    it("should return malformed paragraph as-is", () => {
      const label = getAnchorLabel("paragraph:abc");
      expect(label).toBe("paragraph:abc");
    });

    it("should return custom anchor as-is", () => {
      const label = getAnchorLabel("custom-id-123");
      expect(label).toBe("custom-id-123");
    });
  });
});

// =============================================================================
// getItemsForAnchor Tests
// =============================================================================

describe("getItemsForAnchor", () => {
  describe("null and undefined handling", () => {
    it("should return empty array for null items", () => {
      const items = getItemsForAnchor(null, "paragraph:1");
      expect(items).toEqual([]);
    });

    it("should return empty array for undefined items", () => {
      const items = getItemsForAnchor(undefined, "paragraph:1");
      expect(items).toEqual([]);
    });
  });

  describe("anchor matching", () => {
    it("should return items matching the anchor", () => {
      const items = getItemsForAnchor(mockItems, "paragraph:3");
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("image");
    });

    it("should return multiple items with same anchor", () => {
      const testItems: GutterItem[] = [
        { anchor: "paragraph:1", type: "comment" },
        { anchor: "paragraph:1", type: "image" },
        { anchor: "paragraph:2", type: "markdown" },
      ];
      const items = getItemsForAnchor(testItems, "paragraph:1");
      expect(items).toHaveLength(2);
    });

    it("should return empty array when no items match", () => {
      const items = getItemsForAnchor(mockItems, "paragraph:999");
      expect(items).toEqual([]);
    });

    it("should match header anchors", () => {
      const items = getItemsForAnchor(mockItems, "## Introduction");
      expect(items).toHaveLength(1);
      expect(items[0].content).toBe("This is the intro section");
    });

    it("should match tag anchors", () => {
      const items = getItemsForAnchor(mockItems, "anchor:sidebar");
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("markdown");
    });
  });

  describe("empty result cases", () => {
    it("should return empty array for empty items array", () => {
      const items = getItemsForAnchor([], "paragraph:1");
      expect(items).toEqual([]);
    });

    it("should not return items without anchor", () => {
      const testItems: GutterItem[] = [{ type: "image", src: "img.jpg" }];
      const items = getItemsForAnchor(testItems, "paragraph:1");
      expect(items).toEqual([]);
    });
  });
});

// =============================================================================
// getOrphanItems Tests
// =============================================================================

describe("getOrphanItems", () => {
  describe("null and undefined handling", () => {
    it("should return empty array for null items", () => {
      const orphans = getOrphanItems(null, mockHeaders);
      expect(orphans).toEqual([]);
    });

    it("should return empty array for undefined items", () => {
      const orphans = getOrphanItems(undefined, mockHeaders);
      expect(orphans).toEqual([]);
    });
  });

  describe("orphan detection", () => {
    it("should return items without anchor", () => {
      const orphans = getOrphanItems(mockItems, mockHeaders);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].src).toBe("orphan.jpg");
    });

    it("should return items with invalid header anchors", () => {
      const items: GutterItem[] = [
        { anchor: "## Unknown Header", type: "comment" },
        { anchor: "## Introduction", type: "comment" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].anchor).toBe("## Unknown Header");
    });

    it("should not return items with valid paragraph anchors", () => {
      const items: GutterItem[] = [
        { anchor: "paragraph:1", type: "comment" },
        { anchor: "paragraph:5", type: "image" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toEqual([]);
    });

    it("should not return items with valid tag anchors", () => {
      const items: GutterItem[] = [
        { anchor: "anchor:sidebar", type: "markdown" },
        { anchor: "anchor:custom-tag", type: "comment" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toEqual([]);
    });

    it("should not return items with valid header anchors", () => {
      const items: GutterItem[] = [
        { anchor: "## Introduction", type: "comment" },
        { anchor: "## Getting Started", type: "image" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should work with empty headers array", () => {
      const items: GutterItem[] = [
        { anchor: "## Any Header", type: "comment" },
        { type: "image", src: "img.jpg" },
      ];
      const orphans = getOrphanItems(items, []);
      expect(orphans).toHaveLength(2);
    });

    it("should work without headers parameter (default)", () => {
      const items: GutterItem[] = [
        { type: "comment" },
        { anchor: "paragraph:1", type: "image" },
      ];
      const orphans = getOrphanItems(items);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].type).toBe("comment");
    });

    it("should handle mixed orphan types", () => {
      const items: GutterItem[] = [
        { type: "comment" },
        { anchor: "## Unknown", type: "image" },
        { anchor: "paragraph:1", type: "markdown" },
        { anchor: "anchor:tag", type: "photo" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toHaveLength(2);
    });

    it("should preserve order of orphans", () => {
      const items: GutterItem[] = [
        { type: "image", src: "first.jpg" },
        { anchor: "paragraph:1", type: "comment" },
        { type: "markdown", content: "second" },
        { anchor: "## Invalid Header", type: "photo" },
        { type: "photo", src: "third.jpg" },
      ];
      const orphans = getOrphanItems(items, mockHeaders);
      expect(orphans).toHaveLength(4);
      expect(orphans[0].src).toBe("first.jpg");
      expect(orphans[1].content).toBe("second");
      expect(orphans[2].anchor).toBe("## Invalid Header");
      expect(orphans[3].src).toBe("third.jpg");
    });
  });
});

// =============================================================================
// findAnchorElement Tests
// =============================================================================

describe("findAnchorElement", () => {
  let contentEl: HTMLElement;

  beforeEach(() => {
    // Create a mock DOM structure
    contentEl = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.id = "introduction";
    h2.textContent = "Introduction";
    contentEl.appendChild(h2);

    const p1 = document.createElement("p");
    p1.textContent = "First paragraph";
    contentEl.appendChild(p1);

    const p2 = document.createElement("p");
    p2.textContent = "Second paragraph";
    contentEl.appendChild(p2);

    const p3 = document.createElement("p");
    p3.textContent = "Third paragraph";
    contentEl.appendChild(p3);

    const h2b = document.createElement("h2");
    h2b.id = "getting-started";
    h2b.textContent = "Getting Started";
    contentEl.appendChild(h2b);

    const h3 = document.createElement("h3");
    h3.id = "advanced-usage";
    h3.textContent = "Advanced Usage";
    contentEl.appendChild(h3);

    const p4 = document.createElement("p");
    p4.textContent = "Another paragraph";
    contentEl.appendChild(p4);

    const div1 = document.createElement("div");
    div1.setAttribute("data-anchor", "sidebar");
    div1.textContent = "Sidebar content";
    contentEl.appendChild(div1);

    const div2 = document.createElement("div");
    div2.setAttribute("data-anchor", "custom-tag");
    div2.textContent = "Custom content";
    contentEl.appendChild(div2);
  });

  describe("null content element", () => {
    it("should return null for null contentEl", () => {
      const element = findAnchorElement("## Introduction", null, mockHeaders);
      expect(element).toBeNull();
    });

    it("should return null for header anchor with null contentEl", () => {
      const element = findAnchorElement("paragraph:1", null, mockHeaders);
      expect(element).toBeNull();
    });
  });

  describe("header anchor resolution", () => {
    it("should find header element by ID when in document", () => {
      // Add element to actual document to make getElementById work
      document.body.appendChild(contentEl);
      try {
        const element = findAnchorElement(
          "## Introduction",
          contentEl,
          mockHeaders,
        );
        expect(element).not.toBeNull();
        expect(element?.id).toBe("introduction");
      } finally {
        document.body.removeChild(contentEl);
      }
    });

    it("should find header with different level", () => {
      document.body.appendChild(contentEl);
      try {
        const element = findAnchorElement(
          "### Advanced Usage",
          contentEl,
          mockHeaders,
        );
        expect(element).not.toBeNull();
        expect(element?.id).toBe("advanced-usage");
      } finally {
        document.body.removeChild(contentEl);
      }
    });

    it("should return null for header with no matching ID", () => {
      const element = findAnchorElement(
        "## Unknown Header",
        contentEl,
        mockHeaders,
      );
      expect(element).toBeNull();
    });

    it("should return null for header anchor without headers", () => {
      const element = findAnchorElement("## Introduction", contentEl, []);
      expect(element).toBeNull();
    });

    it("should work without headers parameter (default)", () => {
      const element = findAnchorElement("## Introduction", contentEl);
      expect(element).toBeNull();
    });
  });

  describe("paragraph anchor resolution", () => {
    it("should find first paragraph (1-indexed)", () => {
      const element = findAnchorElement("paragraph:1", contentEl, mockHeaders);
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("First paragraph");
    });

    it("should find second paragraph", () => {
      const element = findAnchorElement("paragraph:2", contentEl, mockHeaders);
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Second paragraph");
    });

    it("should find third paragraph", () => {
      const element = findAnchorElement("paragraph:3", contentEl, mockHeaders);
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Third paragraph");
    });

    it("should return null for out-of-range paragraph", () => {
      const element = findAnchorElement("paragraph:99", contentEl, mockHeaders);
      expect(element).toBeNull();
    });

    it("should return null for paragraph:0", () => {
      const element = findAnchorElement("paragraph:0", contentEl, mockHeaders);
      expect(element).toBeNull();
    });

    it("should only select direct child paragraphs", () => {
      const complexContent = document.createElement("div");
      const p1 = document.createElement("p");
      p1.textContent = "Direct child 1";
      complexContent.appendChild(p1);

      const blockquote = document.createElement("blockquote");
      const pNested = document.createElement("p");
      pNested.textContent = "Nested in blockquote";
      blockquote.appendChild(pNested);
      complexContent.appendChild(blockquote);

      const p2 = document.createElement("p");
      p2.textContent = "Direct child 2";
      complexContent.appendChild(p2);

      const element = findAnchorElement(
        "paragraph:2",
        complexContent,
        mockHeaders,
      );
      expect(element?.textContent).toBe("Direct child 2");
    });
  });

  describe("tag anchor resolution", () => {
    it("should find element by data-anchor attribute", () => {
      const element = findAnchorElement(
        "anchor:sidebar",
        contentEl,
        mockHeaders,
      );
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Sidebar content");
    });

    it("should find element with different tag name", () => {
      const element = findAnchorElement(
        "anchor:custom-tag",
        contentEl,
        mockHeaders,
      );
      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Custom content");
    });

    it("should return null for non-existent tag anchor", () => {
      const element = findAnchorElement(
        "anchor:nonexistent",
        contentEl,
        mockHeaders,
      );
      expect(element).toBeNull();
    });

    it("should work with hyphens in tag name", () => {
      const testEl = document.createElement("div");
      const span = document.createElement("span");
      span.setAttribute("data-anchor", "my-custom-tag");
      span.textContent = "Content";
      testEl.appendChild(span);
      const element = findAnchorElement(
        "anchor:my-custom-tag",
        testEl,
        mockHeaders,
      );
      expect(element).not.toBeNull();
    });
  });

  describe("unknown anchor types", () => {
    it("should return null for unknown anchor format", () => {
      const element = findAnchorElement(
        "random-string",
        contentEl,
        mockHeaders,
      );
      expect(element).toBeNull();
    });

    it("should return null for malformed anchor", () => {
      const element = findAnchorElement(
        "paragraph:abc",
        contentEl,
        mockHeaders,
      );
      expect(element).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle empty content element", () => {
      const emptyEl = document.createElement("div");
      const element = findAnchorElement("paragraph:1", emptyEl, mockHeaders);
      expect(element).toBeNull();
    });

    it("should handle paragraphs with attributes", () => {
      const testEl = document.createElement("div");
      const p1 = document.createElement("p");
      p1.className = "intro";
      p1.textContent = "First paragraph";
      testEl.appendChild(p1);

      const p2 = document.createElement("p");
      p2.setAttribute("data-test", "value");
      p2.textContent = "Second paragraph";
      testEl.appendChild(p2);

      const element = findAnchorElement("paragraph:2", testEl, mockHeaders);
      expect(element?.textContent).toBe("Second paragraph");
    });

    it("should handle nested headers", () => {
      const testEl = document.createElement("div");
      const h2 = document.createElement("h2");
      h2.id = "test";
      h2.textContent = "Parent Header";
      testEl.appendChild(h2);

      const h3 = document.createElement("h3");
      h3.id = "nested";
      h3.textContent = "Nested Header";
      testEl.appendChild(h3);

      const headers: Header[] = [
        { id: "test", text: "Parent Header", level: 2 },
        { id: "nested", text: "Nested Header", level: 3 },
      ];
      document.body.appendChild(testEl);
      try {
        const element = findAnchorElement("### Nested Header", testEl, headers);
        expect(element?.id).toBe("nested");
      } finally {
        document.body.removeChild(testEl);
      }
    });

    it("should handle multiple elements with same data-anchor", () => {
      const testEl = document.createElement("div");
      const div1 = document.createElement("div");
      div1.setAttribute("data-anchor", "tag");
      div1.textContent = "First";
      testEl.appendChild(div1);

      const div2 = document.createElement("div");
      div2.setAttribute("data-anchor", "tag");
      div2.textContent = "Second";
      testEl.appendChild(div2);

      const element = findAnchorElement("anchor:tag", testEl, mockHeaders);
      expect(element?.textContent).toBe("First");
    });
  });
});
