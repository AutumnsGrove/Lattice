import { describe, it, expect } from "vitest";
import { loadDocBySlug } from "./docs-loader";

describe("docs-loader.ts", () => {
  describe("loadDocBySlug", () => {
    describe("slug sanitization", () => {
      it("should return null for empty slug", () => {
        const result = loadDocBySlug("", "help");
        expect(result).toBeNull();
      });

      it("should return null for slug with path traversal (..)", () => {
        const result = loadDocBySlug("../../../etc/passwd", "help");
        expect(result).toBeNull();
      });

      it("should return null for slug with forward slash", () => {
        const result = loadDocBySlug("path/to/file", "help");
        expect(result).toBeNull();
      });

      it("should return null for slug with backslash", () => {
        const result = loadDocBySlug("path\\to\\file", "help");
        expect(result).toBeNull();
      });

      it("should return null for slug containing only ..", () => {
        const result = loadDocBySlug("..", "help");
        expect(result).toBeNull();
      });

      it("should return null for slug with encoded path traversal", () => {
        // %2e%2e is URL-encoded ..
        // This tests that we catch .. even if it appears within a string
        const result = loadDocBySlug("foo..bar", "help");
        // This should still be rejected because it contains ..
        expect(result).toBeNull();
      });
    });

    describe("document loading - integration tests", () => {
      // These tests run against actual filesystem during prerender build
      // They verify the loader works with real docs

      it("should return null for non-existent document", () => {
        const result = loadDocBySlug(
          "this-slug-definitely-does-not-exist-abc123",
          "help",
        );
        expect(result).toBeNull();
      });

      it("should load a known help article", () => {
        // This test requires the actual docs to exist
        const result = loadDocBySlug("what-is-grove", "help");

        expect(result).not.toBeNull();
        expect(result?.slug).toBe("what-is-grove");
        expect(result?.category).toBe("help");
        expect(result?.title).toBeTruthy();
        expect(result?.html).toBeTruthy();
        expect(result?.content).toBeTruthy();
      });

      it("should load a known spec document", () => {
        const result = loadDocBySlug("rings-spec", "specs");

        expect(result).not.toBeNull();
        expect(result?.slug).toBe("rings-spec");
        expect(result?.category).toBe("specs");
      });

      it("should return HTML content for loaded docs", () => {
        const result = loadDocBySlug("what-is-grove", "help");

        expect(result?.html).toContain("<");
        expect(result?.html).toContain(">");
      });

      it("should return markdown content for loaded docs", () => {
        const result = loadDocBySlug("what-is-grove", "help");

        expect(result?.content).toContain("#");
      });

      it("should not include internal _filePath in returned doc", () => {
        const result = loadDocBySlug("what-is-grove", "help");

        expect(result).not.toHaveProperty("_filePath");
      });
    });
  });
});
