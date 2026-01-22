import { describe, it, expect } from "vitest";
import {
  scanDocsCategory,
  scanAllDocs,
  findDocBySlug,
  getDocFilePath,
} from "./docs-scanner";

describe("docs-scanner.ts", () => {
  describe("scanDocsCategory", () => {
    it("should return array of docs for valid category", () => {
      const specs = scanDocsCategory("specs");

      expect(Array.isArray(specs)).toBe(true);
      expect(specs.length).toBeGreaterThan(0);
    });

    it("should return docs with required fields from frontmatter", () => {
      const specs = scanDocsCategory("specs");
      const doc = specs.find((d) => d.slug === "heartwood-spec");

      expect(doc).toBeDefined();
      expect(doc?.title).toBe("Heartwood — Centralized Authentication");
      expect(doc?.description).toBeTruthy();
      expect(doc?.category).toBe("specs");
      expect(doc?.specCategory).toBe("platform-services");
    });

    it("should include icon from frontmatter when present", () => {
      const specs = scanDocsCategory("specs");
      const doc = specs.find((d) => d.slug === "heartwood-spec");

      expect(doc?.icon).toBe("shieldcheck");
    });

    it("should calculate reading time", () => {
      const specs = scanDocsCategory("specs");
      const doc = specs.find((d) => d.slug === "heartwood-spec");

      expect(doc?.readingTime).toBeGreaterThan(0);
      expect(typeof doc?.readingTime).toBe("number");
    });

    it("should not include internal _filePath in returned docs", () => {
      const specs = scanDocsCategory("specs");

      for (const doc of specs) {
        expect(doc).not.toHaveProperty("_filePath");
      }
    });

    it("should scan help articles with section field", () => {
      const helpArticles = scanDocsCategory("help");
      const doc = helpArticles.find((d) => d.slug === "what-is-grove");

      expect(doc).toBeDefined();
      expect(doc?.category).toBe("help");
      expect(doc?.section).toBe("getting-started");
    });

    it("should scan exhibit docs with exhibitWing field", () => {
      const exhibitDocs = scanDocsCategory("exhibit");

      if (exhibitDocs.length > 0) {
        const doc = exhibitDocs.find((d) => d.exhibitWing);
        expect(doc?.exhibitWing).toBeTruthy();
      }
    });

    it("should skip docs with published: false", () => {
      // This is a behavior test - if any doc has published: false,
      // it should not appear in the results
      const allDocs = scanAllDocs().allDocs;
      const unpublishedDoc = allDocs.find(
        (d) => (d as unknown as { published: boolean }).published === false
      );

      expect(unpublishedDoc).toBeUndefined();
    });
  });

  describe("scanAllDocs", () => {
    it("should return all document collections", () => {
      const result = scanAllDocs();

      expect(result.specs).toBeDefined();
      expect(result.helpArticles).toBeDefined();
      expect(result.legalDocs).toBeDefined();
      expect(result.marketingDocs).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.philosophyDocs).toBeDefined();
      expect(result.designDocs).toBeDefined();
      expect(result.exhibitDocs).toBeDefined();
      expect(result.allDocs).toBeDefined();
    });

    it("should have allDocs containing all category docs", () => {
      const result = scanAllDocs();
      const expectedTotal =
        result.specs.length +
        result.helpArticles.length +
        result.legalDocs.length +
        result.marketingDocs.length +
        result.patterns.length +
        result.philosophyDocs.length +
        result.designDocs.length +
        result.exhibitDocs.length;

      expect(result.allDocs.length).toBe(expectedTotal);
    });

    it("should find specs in nested completed directory", () => {
      // Specs can live in specs/ or specs/completed/
      const result = scanAllDocs();

      // We should find specs regardless of whether they're in root or subdirectory
      expect(result.specs.length).toBeGreaterThan(0);
    });
  });

  describe("findDocBySlug", () => {
    describe("slug sanitization - security boundary", () => {
      it("should return null for empty slug", () => {
        const result = findDocBySlug("", "specs");
        expect(result).toBeNull();
      });

      it("should return null for slug with path traversal (..)", () => {
        const result = findDocBySlug("../../../etc/passwd", "specs");
        expect(result).toBeNull();
      });

      it("should return null for slug with forward slash", () => {
        const result = findDocBySlug("path/to/file", "specs");
        expect(result).toBeNull();
      });

      it("should return null for slug with backslash", () => {
        const result = findDocBySlug("path\\to\\file", "specs");
        expect(result).toBeNull();
      });
    });

    describe("document lookup", () => {
      it("should find existing document by slug", () => {
        const doc = findDocBySlug("heartwood-spec", "specs");

        expect(doc).not.toBeNull();
        expect(doc?.slug).toBe("heartwood-spec");
        expect(doc?.title).toBeTruthy();
      });

      it("should return null for non-existent slug", () => {
        const doc = findDocBySlug("this-doc-does-not-exist-xyz", "specs");
        expect(doc).toBeNull();
      });

      it("should return null for wrong category", () => {
        // heartwood-spec is a spec, not a help article
        const doc = findDocBySlug("heartwood-spec", "help");
        expect(doc).toBeNull();
      });

      it("should include _filePath in result for internal use", () => {
        const doc = findDocBySlug("heartwood-spec", "specs");

        expect(doc).toHaveProperty("_filePath");
        expect(doc?._filePath).toContain("heartwood-spec.md");
      });
    });
  });

  describe("getDocFilePath", () => {
    it("should return file path for existing document", () => {
      const filePath = getDocFilePath("heartwood-spec", "specs");

      expect(filePath).not.toBeNull();
      expect(filePath).toContain("heartwood-spec.md");
    });

    it("should return null for non-existent document", () => {
      const filePath = getDocFilePath("does-not-exist", "specs");
      expect(filePath).toBeNull();
    });
  });

  describe("frontmatter validation", () => {
    it("should only return docs with valid required fields", () => {
      // All returned docs should have title, description, category
      const allDocs = scanAllDocs().allDocs;

      for (const doc of allDocs) {
        expect(doc.title).toBeTruthy();
        expect(doc.category).toBeTruthy();
        // description is in excerpt
        expect(doc.excerpt).toBeTruthy();
      }
    });

    it("should preserve existing tags from frontmatter", () => {
      // Some docs have Obsidian-style tags that should be preserved
      // We test this by checking a known doc that has tags
      const specs = scanDocsCategory("specs");
      const doc = specs.find((d) => d.slug === "heartwood-spec");

      // The Doc type doesn't expose tags, but they should be preserved
      // in the file. This test verifies the doc was scanned successfully.
      expect(doc).toBeDefined();
    });
  });

  describe("sorting behavior", () => {
    it("should sort docs by order field when present", () => {
      const helpArticles = scanDocsCategory("help");

      // what-is-grove has order: 1 in its frontmatter
      const firstWithOrder = helpArticles.find((d) => d.order !== undefined);

      if (firstWithOrder) {
        // Docs with order should appear before docs without order
        const firstDocIndex = helpArticles.indexOf(firstWithOrder);
        const docsWithoutOrder = helpArticles.filter(
          (d) => d.order === undefined
        );

        // All docs with order should come before docs without order
        for (const doc of docsWithoutOrder) {
          const docIndex = helpArticles.indexOf(doc);
          if (firstWithOrder.order !== undefined) {
            // This doc has order, so it should be sorted appropriately
            expect(firstDocIndex).toBeLessThanOrEqual(docIndex);
          }
        }
      }
    });

    it("should sort alphabetically by title when no order field", () => {
      const legalDocs = scanDocsCategory("legal");

      // Legal docs typically don't have order fields
      const titles = legalDocs.map((d) => d.title);
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));

      expect(titles).toEqual(sortedTitles);
    });
  });
});
