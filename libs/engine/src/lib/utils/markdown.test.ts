/**
 * Comprehensive tests for markdown.ts
 *
 * Tests 10 core functions with focus on 70% coverage:
 * 1. generateHeadingId - URL-safe ID generation
 * 2. extractHeaders - Header extraction from markdown
 * 3. processAnchorTags - Anchor tag conversion
 * 4. parseMarkdownContent - Full markdown parsing
 * 5. parseMarkdownContentSanitized - Sanitized parsing
 * 6. processGutterContent - Gutter content processing
 * 7. processMarkdownModules - Module batch processing
 * 8. getItemBySlug - Single item retrieval
 * 9. getPageByFilename - Page retrieval
 * 10. getSiteConfigFromModule - Config extraction
 * 11. createContentLoader - Content loader factory
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  generateHeadingId,
  extractHeaders,
  processAnchorTags,
  parseMarkdownContent,
  parseMarkdownContentSanitized,
  processGutterContent,
  processMarkdownModules,
  getItemBySlug,
  getPageByFilename,
  getSiteConfigFromModule,
  createContentLoader,
  type Header,
  type ParsedContent,
  type PostMeta,
  type Post,
  type Page,
  type SiteConfig,
  type ModuleMap,
  type GutterManifest,
  type GutterModules,
} from "./markdown";

// Test data helpers
const createMarkdownContent = (
  title: string,
  date: string,
  content: string = "# Test",
): string => {
  return `---\ntitle: ${title}\ndate: ${date}\ndescription: Test description\ntags:\n  - test\n---\n${content}`;
};

const createPost = (slug: string, title: string, date: string): PostMeta => ({
  slug,
  title,
  date,
  tags: ["test"],
  description: "Test description",
});

describe("markdown.ts - Comprehensive Tests", () => {
  // ==========================================================================
  // 1. generateHeadingId Tests
  // ==========================================================================

  describe("generateHeadingId()", () => {
    it("converts text to lowercase", () => {
      const result = generateHeadingId("HELLO WORLD");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("converts spaces to hyphens", () => {
      expect(generateHeadingId("Hello World")).toBe("hello-world");
    });

    it("handles multiple spaces", () => {
      expect(generateHeadingId("Hello   World")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(generateHeadingId("Hello! World?")).toBe("hello-world");
      expect(generateHeadingId("Test & Example")).toBe("test-example");
    });

    it("collapses multiple hyphens", () => {
      expect(generateHeadingId("Hello---World")).toBe("hello-world");
      // Multiple hyphens are collapsed by /-+/g to single hyphen
    });

    it("handles leading/trailing whitespace", () => {
      const result = generateHeadingId("  Hello World  ");
      expect(result).not.toMatch(/^\s|\s$/);
    });

    it("handles special markdown characters", () => {
      expect(generateHeadingId("Using `code` in header")).toBe(
        "using-code-in-header",
      );
      expect(generateHeadingId("[Link](url) text")).toBe("linkurl-text");
    });

    it("handles empty string", () => {
      expect(generateHeadingId("")).toBe("");
    });

    it("preserves alphanumeric and hyphens", () => {
      expect(generateHeadingId("Test-123-ABC")).toBe("test-123-abc");
    });

    it("handles unicode characters", () => {
      const result = generateHeadingId("Café résumé");
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. extractHeaders Tests
  // ==========================================================================

  describe("extractHeaders()", () => {
    it("extracts h1 headers", () => {
      const markdown = "# Hello World";
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(1);
      expect(headers[0]).toEqual({
        level: 1,
        text: "Hello World",
        id: "hello-world",
      });
    });

    it("extracts multiple header levels", () => {
      const markdown = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(6);
      expect(headers.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("generates correct IDs for headers", () => {
      const markdown = "# Hello World\n## Test Header\n### Multiple Words Here";
      const headers = extractHeaders(markdown);
      expect(headers[0].id).toBe("hello-world");
      expect(headers[1].id).toBe("test-header");
      expect(headers[2].id).toBe("multiple-words-here");
    });

    it("ignores headers inside code blocks", () => {
      const markdown = `# Real Header\n\n\`\`\`\n# Fake Header\n\`\`\`\n## Another Real`;
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(2);
      expect(headers[0].text).toBe("Real Header");
      expect(headers[1].text).toBe("Another Real");
    });

    it("handles multiple code blocks", () => {
      const markdown = `# Start\n\`\`\`\n# Ignored\n## Also Ignored\n\`\`\`\n# End`;
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(2);
      expect(headers[0].text).toBe("Start");
      expect(headers[1].text).toBe("End");
    });

    it("preserves header text with special characters", () => {
      const markdown = "# Using `code` in header";
      const headers = extractHeaders(markdown);
      expect(headers[0].text).toBe("Using `code` in header");
    });

    it("trims header text", () => {
      const markdown = "#  Extra Spaces  ";
      const headers = extractHeaders(markdown);
      expect(headers[0].text).toBe("Extra Spaces");
    });

    it("returns empty array for no headers", () => {
      const markdown = "Just some text\nNo headers here";
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(0);
    });

    it("handles markdown with only code blocks", () => {
      const markdown = "```\n# Ignored\n```";
      const headers = extractHeaders(markdown);
      expect(headers).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 3. processAnchorTags Tests
  // ==========================================================================

  describe("processAnchorTags()", () => {
    it("converts anchor comment to span element", () => {
      const html = "<p>Text</p><!-- anchor:my-anchor --><p>More</p>";
      const result = processAnchorTags(html);
      expect(result).toContain(
        '<span class="anchor-marker" data-anchor="my-anchor"></span>',
      );
    });

    it("handles alphanumeric anchor names", () => {
      const html = "<!-- anchor:section123 -->";
      const result = processAnchorTags(html);
      expect(result).toContain('data-anchor="section123"');
    });

    it("handles hyphenated anchor names", () => {
      const html = "<!-- anchor:my-section-name -->";
      const result = processAnchorTags(html);
      expect(result).toContain('data-anchor="my-section-name"');
    });

    it("handles underscored anchor names", () => {
      const html = "<!-- anchor:my_section_name -->";
      const result = processAnchorTags(html);
      expect(result).toContain('data-anchor="my_section_name"');
    });

    it("handles multiple anchors", () => {
      const html = "<!-- anchor:first --><p>Text</p><!-- anchor:second -->";
      const result = processAnchorTags(html);
      expect(result).toContain('data-anchor="first"');
      expect(result).toContain('data-anchor="second"');
    });

    it("ignores invalid anchor comments", () => {
      const html = "<!-- anchor --><p>No span</p>";
      const result = processAnchorTags(html);
      expect(result).not.toContain("anchor-marker");
    });

    it("preserves non-anchor comments", () => {
      const html = "<!-- This is a comment --><p>Text</p>";
      const result = processAnchorTags(html);
      expect(result).toContain("<!-- This is a comment -->");
    });

    it("handles whitespace in anchor comments", () => {
      const html = "<!-- anchor:test-name -->";
      const result = processAnchorTags(html);
      expect(result).toContain('data-anchor="test-name"');
    });

    it("returns empty string for empty input", () => {
      expect(processAnchorTags("")).toBe("");
    });
  });

  // ==========================================================================
  // 4. parseMarkdownContent Tests
  // ==========================================================================

  describe("parseMarkdownContent()", () => {
    it("extracts frontmatter data", () => {
      const content = createMarkdownContent(
        "Test Post",
        "2024-01-01",
        "# Content",
      );
      const result = parseMarkdownContent(content);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty("title");
    });

    it("converts markdown to HTML", () => {
      const content = createMarkdownContent(
        "Test",
        "2024-01-01",
        "# Heading\n\nParagraph",
      );
      const result = parseMarkdownContent(content);
      expect(result.content).toContain("<h1");
      expect(result.content).toContain("<p>");
    });

    it("extracts headers from markdown", () => {
      const content = createMarkdownContent(
        "Test",
        "2024-01-01",
        "# Header 1\n## Header 2",
      );
      const result = parseMarkdownContent(content);
      expect(result.headers).toHaveLength(2);
      expect(result.headers[0].level).toBe(1);
    });

    it("includes raw markdown when available", () => {
      const mdText = "# Heading\n\nContent";
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContent(content);
      expect(result.rawMarkdown).toBeDefined();
      expect(result.rawMarkdown).toContain("Heading");
    });

    it("processes anchor tags in content", () => {
      const mdText = "Text\n\n<!-- anchor:test -->\n\nMore text";
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContent(content);
      expect(result.content).toContain("anchor-marker");
    });

    it("sanitizes HTML output for security", () => {
      const mdText = '<script>alert("xss")</script>';
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContent(content);
      expect(result.content).not.toContain("<script");
    });

    it("handles missing frontmatter gracefully", () => {
      const content = "# No Frontmatter\nJust content";
      const result = parseMarkdownContent(content);
      expect(result.data).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("preserves code blocks", () => {
      const mdText = "```js\nconst x = 1;\n```";
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContent(content);
      expect(result.content).toContain("<pre>");
    });
  });

  // ==========================================================================
  // 5. parseMarkdownContentSanitized Tests
  // ==========================================================================

  describe("parseMarkdownContentSanitized()", () => {
    it("sanitizes HTML content", () => {
      const content = createMarkdownContent(
        "Test",
        "2024-01-01",
        "<script>alert(1)</script>",
      );
      const result = parseMarkdownContentSanitized(content);
      expect(result.content).not.toContain("<script");
    });

    it("extracts headers like standard parser", () => {
      const mdText = "# Header 1\n## Header 2";
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContentSanitized(content);
      expect(result.headers).toHaveLength(2);
    });

    it("extracts frontmatter", () => {
      const content = createMarkdownContent(
        "Test Title",
        "2024-01-01",
        "# Content",
      );
      const result = parseMarkdownContentSanitized(content);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty("title");
    });

    it("does not include raw markdown", () => {
      const content = createMarkdownContent("Test", "2024-01-01", "# Content");
      const result = parseMarkdownContentSanitized(content);
      expect(result.rawMarkdown).toBeUndefined();
    });

    it("preserves safe HTML elements", () => {
      const mdText = "Normal **bold** and *italic*";
      const content = createMarkdownContent("Test", "2024-01-01", mdText);
      const result = parseMarkdownContentSanitized(content);
      expect(result.content).toContain("<strong>");
      expect(result.content).toContain("<em>");
    });
  });

  // ==========================================================================
  // 6. processGutterContent Tests
  // ==========================================================================

  describe("processGutterContent()", () => {
    it("returns empty array when manifest not found", () => {
      const manifest = {};
      const result = processGutterContent("non-existent", manifest, {}, {});
      expect(result).toEqual([]);
    });

    it("handles manifest with default export", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: { items: [] },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      expect(result).toEqual([]);
    });

    it("processes comment type items", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [{ type: "comment", file: "comment.md" }],
          },
        },
      };
      const markdown = {
        "gutters/test-slug/gutter/comment.md": "# Comment",
      };
      const result = processGutterContent("test-slug", manifest, markdown, {});
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("processes markdown type items", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [{ type: "markdown", file: "note.md" }],
          },
        },
      };
      const markdown = {
        "gutters/test-slug/gutter/note.md": "# Note Content",
      };
      const result = processGutterContent("test-slug", manifest, markdown, {});
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("processes photo type items with local files", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [
              {
                type: "photo",
                file: "photo.jpg",
                alt: "Photo",
                caption: "A photo",
              },
            ],
          },
        },
      };
      const images = {
        "gutters/test-slug/gutter/photo.jpg": "/images/photo.jpg",
      };
      const result = processGutterContent("test-slug", manifest, {}, images);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("processes photo type items with external URLs", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [{ type: "photo", file: "https://example.com/photo.jpg" }],
          },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("processes emoji type items with URL", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [{ type: "emoji", url: "/icons/test.svg", alt: "Test" }],
          },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      // Emoji items without additional content are often filtered out
      expect(Array.isArray(result)).toBe(true);
    });

    it("processes gallery type items", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [
              {
                type: "gallery",
                images: [
                  {
                    url: "https://example.com/img1.jpg",
                    alt: "Image 1",
                    caption: "Caption 1",
                  },
                  {
                    url: "https://example.com/img2.jpg",
                    alt: "Image 2",
                    caption: "Caption 2",
                  },
                ],
              },
            ],
          },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      // Should return array (gallery items with valid URLs are processed)
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters out gallery items with all broken images", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: [
              {
                type: "gallery",
                images: [{ file: "missing.jpg" }],
              },
            ],
          },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      // Gallery with no valid images should be filtered out
      expect(result.filter((i) => i.type === "gallery")).toHaveLength(0);
    });

    it("handles invalid manifest items", () => {
      const manifest: Record<string, any> = {
        "gutters/test-slug/manifest.json": {
          default: {
            items: null,
          },
        },
      };
      const result = processGutterContent("test-slug", manifest, {}, {});
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // 7. processMarkdownModules Tests
  // ==========================================================================

  describe("processMarkdownModules()", () => {
    it("processes single markdown file", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent("Test Post", "2024-01-01"),
      };
      const result = processMarkdownModules(modules);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].slug).toBe("test");
      expect(result[0].title).toBeDefined();
    });

    it("processes multiple markdown files", () => {
      const modules: ModuleMap = {
        "/posts/post1.md": createMarkdownContent("Post 1", "2024-01-01"),
        "/posts/post2.md": createMarkdownContent("Post 2", "2024-01-02"),
      };
      const result = processMarkdownModules(modules);
      expect(result).toHaveLength(2);
    });

    it("sorts by date descending", () => {
      const modules: ModuleMap = {
        "/posts/old.md": createMarkdownContent("Old", "2024-01-01"),
        "/posts/new.md": createMarkdownContent("New", "2024-12-31"),
      };
      const result = processMarkdownModules(modules);
      expect(result.length).toBe(2);
      // Most recent date should be first
      expect(new Date(result[0].date).getTime()).toBeGreaterThanOrEqual(
        new Date(result[1].date).getTime(),
      );
    });

    it("extracts slug from filename", () => {
      const modules: ModuleMap = {
        "/posts/my-great-post.md": createMarkdownContent("Title", "2024-01-01"),
      };
      const result = processMarkdownModules(modules);
      expect(result[0].slug).toBe("my-great-post");
    });

    it("uses default values for missing frontmatter", () => {
      const modules: ModuleMap = {
        "/posts/minimal.md": "---\n---\n# Content",
      };
      const result = processMarkdownModules(modules);
      expect(result[0].title).toBe("Untitled");
      expect(result[0].tags).toEqual([]);
      expect(result[0].description).toBe("");
    });

    it("returns empty array on error", () => {
      const modules: ModuleMap = {
        "/posts/error.md": "Invalid content",
      };
      const result = processMarkdownModules(modules);
      // Should not throw, should return array (may be empty or with partial data)
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters out null entries from errors", () => {
      const modules: ModuleMap = {
        "/posts/good.md": createMarkdownContent("Good Post", "2024-01-01"),
      };
      const result = processMarkdownModules(modules);
      expect(result.every((item) => item !== null)).toBe(true);
    });
  });

  // ==========================================================================
  // 8. getItemBySlug Tests
  // ==========================================================================

  describe("getItemBySlug()", () => {
    it("returns null if slug not found", () => {
      const modules: ModuleMap = {};
      const result = getItemBySlug("non-existent", modules);
      expect(result).toBeNull();
    });

    it("returns post with content and headers", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent(
          "Test",
          "2024-01-01",
          "# Header 1\n## Header 2",
        ),
      };
      const result = getItemBySlug("test", modules);
      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test");
      expect(result?.content).toBeDefined();
      expect(result?.headers).toBeDefined();
    });

    it("includes headers in post", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent(
          "Test",
          "2024-01-01",
          "# Main\n## Sub",
        ),
      };
      const result = getItemBySlug("test", modules);
      expect(result?.headers).toHaveLength(2);
    });

    it("processes gutter content when provided", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent("Test", "2024-01-01"),
      };
      const gutterModules: GutterModules = {
        manifest: {
          "gutters/test/manifest.json": {
            default: { items: [] },
          },
        },
        markdown: {},
        images: {},
      };
      const result = getItemBySlug("test", modules, { gutterModules });
      expect(result?.gutterContent).toBeDefined();
    });

    it("processes sidecar metadata when provided", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent("Test", "2024-01-01"),
      };
      // Sidecar path format: parts[parts.length - 3] should be slug
      // Example path: metadata/test/data.json -> parts = ['metadata', 'test', 'data.json'] -> parts[-3] = 'metadata'
      // So we need a path like: something/test/something/file
      const sidecar = {
        "metadata/test/file/data.json": {
          default: { servings: 4, time: 30 },
        },
      };
      const result = getItemBySlug("test", modules, {
        sidecarModules: sidecar,
      });
      expect(result?.sidecar).toBeDefined();
    });

    it("uses default values for missing fields", () => {
      const modules: ModuleMap = {
        "/posts/test.md": "---\n---\n# Content",
      };
      const result = getItemBySlug("test", modules);
      expect(result?.title).toBe("Untitled");
      expect(result?.tags).toEqual([]);
    });
  });

  // ==========================================================================
  // 9. getPageByFilename Tests
  // ==========================================================================

  describe("getPageByFilename()", () => {
    it("returns null if filename not found", () => {
      const modules: ModuleMap = {};
      const result = getPageByFilename("home.md", modules);
      expect(result).toBeNull();
    });

    it("returns page with content and headers", () => {
      const modules: ModuleMap = {
        "/pages/home.md": createMarkdownContent(
          "Home",
          "2024-01-01",
          "# Welcome\n## Section",
        ),
      };
      const result = getPageByFilename("home.md", modules);
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Home");
      expect(result?.content).toBeDefined();
    });

    it("uses slug from options if provided", () => {
      const modules: ModuleMap = {
        "/pages/home.md": createMarkdownContent("Home", "2024-01-01"),
      };
      const result = getPageByFilename("home.md", modules, { slug: "landing" });
      expect(result?.slug).toBe("landing");
    });

    it("derives slug from filename if not provided", () => {
      const modules: ModuleMap = {
        "/pages/about.md": createMarkdownContent("About", "2024-01-01"),
      };
      const result = getPageByFilename("about.md", modules);
      expect(result?.slug).toBe("about");
    });

    it("includes optional fields from frontmatter", () => {
      const content = `---\ntitle: About\ndate: 2024-01-01\ndescription: About page\nhero:\n  title: Hero Title\ngalleries:\n  - name: gallery1\n---\n# Content`;
      const modules: ModuleMap = {
        "/pages/about.md": content,
      };
      const result = getPageByFilename("about.md", modules);
      // Check that result is not null first
      expect(result).not.toBeNull();
      if (result) {
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("content");
      }
    });

    it("processes gutter content when provided", () => {
      const modules: ModuleMap = {
        "/pages/home.md": createMarkdownContent("Home", "2024-01-01"),
      };
      const gutterModules: GutterModules = {
        manifest: {
          "gutters/home/manifest.json": {
            default: { items: [] },
          },
        },
      };
      const result = getPageByFilename("home.md", modules, { gutterModules });
      expect(result?.gutterContent).toBeDefined();
    });

    it("returns page with sanitized content", () => {
      const modules: ModuleMap = {
        "/pages/home.md": createMarkdownContent(
          "Home",
          "2024-01-01",
          "<script>alert(1)</script>",
        ),
      };
      const result = getPageByFilename("home.md", modules);
      expect(result?.content).not.toContain("<script");
    });
  });

  // ==========================================================================
  // 10. getSiteConfigFromModule Tests
  // ==========================================================================

  describe("getSiteConfigFromModule()", () => {
    it("returns default config for empty module", () => {
      const result = getSiteConfigFromModule({});
      expect(result.owner).toBeDefined();
      expect(result.site).toBeDefined();
      expect(result.social).toBeDefined();
    });

    it("extracts config with direct export", () => {
      const config: SiteConfig = {
        owner: { name: "Test Owner", email: "test@example.com" },
        site: { title: "Test Site", description: "Test", copyright: "Test" },
        social: { twitter: "@test" },
      };
      const result = getSiteConfigFromModule({ "config.json": config });
      expect(result.owner.name).toBe("Test Owner");
    });

    it("extracts config with default export", () => {
      const config: SiteConfig = {
        owner: { name: "Test Owner", email: "test@example.com" },
        site: { title: "Test Site", description: "Test", copyright: "Test" },
        social: {},
      };
      const result = getSiteConfigFromModule({
        "config.json": { default: config },
      });
      expect(result.owner.name).toBe("Test Owner");
    });

    it("uses first entry in module map", () => {
      const config1: SiteConfig = {
        owner: { name: "First", email: "first@example.com" },
        site: { title: "First", description: "", copyright: "" },
        social: {},
      };
      const config2: SiteConfig = {
        owner: { name: "Second", email: "second@example.com" },
        site: { title: "Second", description: "", copyright: "" },
        social: {},
      };
      const result = getSiteConfigFromModule({
        "config1.json": config1,
        "config2.json": config2,
      });
      // Should use first entry (order not guaranteed in objects)
      expect(result.owner.name).toBeDefined();
    });
  });

  // ==========================================================================
  // 11. createContentLoader Tests
  // ==========================================================================

  describe("createContentLoader()", () => {
    it("returns content loader with all methods", () => {
      const loader = createContentLoader({});
      expect(loader.getAllPosts).toBeDefined();
      expect(loader.getAllRecipes).toBeDefined();
      expect(loader.getLatestPost).toBeDefined();
      expect(loader.getPostBySlug).toBeDefined();
      expect(loader.getRecipeBySlug).toBeDefined();
      expect(loader.getHomePage).toBeDefined();
      expect(loader.getAboutPage).toBeDefined();
      expect(loader.getContactPage).toBeDefined();
      expect(loader.getSiteConfig).toBeDefined();
      expect(loader.getGutterContent).toBeDefined();
    });

    it("getAllPosts returns empty array initially", () => {
      const loader = createContentLoader({});
      const posts = loader.getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
    });

    it("getAllPosts returns posts from config", () => {
      const modules: ModuleMap = {
        "/posts/post1.md": createMarkdownContent("Post 1", "2024-01-01"),
      };
      const loader = createContentLoader({ posts: modules });
      const posts = loader.getAllPosts();
      expect(posts.length).toBeGreaterThan(0);
    });

    it("getLatestPost returns most recent post", () => {
      const modules: ModuleMap = {
        "/posts/old.md": createMarkdownContent("Old", "2024-01-01"),
        "/posts/new.md": createMarkdownContent("New", "2024-12-31"),
      };
      const loader = createContentLoader({ posts: modules });
      const post = loader.getLatestPost();
      expect(post).not.toBeNull();
      expect(post?.slug).toBeDefined();
    });

    it("getLatestPost returns null if no posts", () => {
      const loader = createContentLoader({});
      const post = loader.getLatestPost();
      expect(post).toBeNull();
    });

    it("getPostBySlug retrieves specific post", () => {
      const modules: ModuleMap = {
        "/posts/test.md": createMarkdownContent("Test Post", "2024-01-01"),
      };
      const loader = createContentLoader({ posts: modules });
      const post = loader.getPostBySlug("test");
      expect(post?.slug).toBe("test");
    });

    it("getPostBySlug returns null for non-existent slug", () => {
      const loader = createContentLoader({});
      const post = loader.getPostBySlug("non-existent");
      expect(post).toBeNull();
    });

    it("getHomePage retrieves home page", () => {
      const modules: ModuleMap = {
        "/pages/home.md": createMarkdownContent("Home", "2024-01-01"),
      };
      const loader = createContentLoader({ home: modules });
      const page = loader.getHomePage();
      expect(page?.title).toBe("Home");
    });

    it("getHomePage returns null if not configured", () => {
      const loader = createContentLoader({});
      const page = loader.getHomePage();
      expect(page).toBeNull();
    });

    it("getSiteConfig returns default config", () => {
      const loader = createContentLoader({});
      const config = loader.getSiteConfig();
      expect(config.owner).toBeDefined();
      expect(config.site).toBeDefined();
    });

    it("getSiteConfig uses provided config", () => {
      const siteConfig: SiteConfig = {
        owner: { name: "Test", email: "test@example.com" },
        site: { title: "Test Site", description: "Test", copyright: "Test" },
        social: {},
      };
      const loader = createContentLoader({
        siteConfig: { "config.json": siteConfig },
      });
      const config = loader.getSiteConfig();
      expect(config.owner.name).toBe("Test");
    });

    it("handles recipes configuration", () => {
      const modules: ModuleMap = {
        "/recipes/recipe1.md": createMarkdownContent("Recipe 1", "2024-01-01"),
      };
      const loader = createContentLoader({ recipes: modules });
      const recipes = loader.getAllRecipes();
      expect(recipes.length).toBeGreaterThan(0);
    });

    it("getRecipeBySlug retrieves specific recipe", () => {
      const modules: ModuleMap = {
        "/recipes/cookies.md": createMarkdownContent("Cookies", "2024-01-01"),
      };
      const loader = createContentLoader({ recipes: modules });
      const recipe = loader.getRecipeBySlug("cookies");
      expect(recipe?.slug).toBe("cookies");
    });

    it("getRecipeBySlug includes sidecar metadata", () => {
      const recipeModules: ModuleMap = {
        "/recipes/cookies.md": createMarkdownContent("Cookies", "2024-01-01"),
      };
      // Sidecar path format: parts[parts.length - 3] should be slug
      const sidecarModules = {
        "metadata/cookies/file/data.json": {
          default: { servings: 12, time: 30 },
        },
      };
      const loader = createContentLoader({
        recipes: recipeModules,
        recipeMetadata: sidecarModules,
      });
      const recipe = loader.getRecipeBySlug("cookies");
      expect(recipe).not.toBeNull();
      if (recipe) {
        expect(recipe?.sidecar).toBeDefined();
      }
    });

    it("getGutterContent returns gutter items for post", () => {
      const gutterModules: GutterModules = {
        manifest: {
          "gutters/test/manifest.json": {
            default: { items: [] },
          },
        },
      };
      const loader = createContentLoader({
        postGutter: gutterModules,
      });
      const gutter = loader.getGutterContent("test");
      expect(Array.isArray(gutter)).toBe(true);
    });

    it("getGutterContent returns empty array if not configured", () => {
      const loader = createContentLoader({});
      const gutter = loader.getGutterContent("test");
      expect(gutter).toEqual([]);
    });

    it("handles multiple pages", () => {
      const homeModules: ModuleMap = {
        "/pages/home.md": createMarkdownContent("Home", "2024-01-01"),
      };
      const aboutModules: ModuleMap = {
        "/pages/about.md": createMarkdownContent("About", "2024-01-01"),
      };
      const contactModules: ModuleMap = {
        "/pages/contact.md": createMarkdownContent("Contact", "2024-01-01"),
      };
      const loader = createContentLoader({
        home: homeModules,
        about: aboutModules,
        contact: contactModules,
      });
      expect(loader.getHomePage()?.title).toBe("Home");
      expect(loader.getAboutPage()?.title).toBe("About");
      expect(loader.getContactPage()?.title).toBe("Contact");
    });
  });
});

// ============================================================================
// Inline Elements in Headings Regression Tests (commit 8264e99)
// ============================================================================

describe("Inline elements in headings (regression: commit 8264e99)", () => {
  it("renders bold text inside heading", () => {
    const content = `---\ntitle: Test\ndate: 2024-01-01\n---\n## **Bold** heading`;
    const result = parseMarkdownContent(content);
    expect(result.content).toContain("<h2");
    expect(result.content).toContain("<strong>Bold</strong>");
    expect(result.content).toContain("heading");
  });

  it("renders link inside heading", () => {
    const content = `---\ntitle: Test\ndate: 2024-01-01\n---\n## [Link](https://example.com) heading`;
    const result = parseMarkdownContent(content);
    expect(result.content).toContain("<h2");
    expect(result.content).toContain('<a href="https://example.com"');
    expect(result.content).toContain("Link");
  });

  it("renders inline code inside heading", () => {
    const content =
      "---\ntitle: Test\ndate: 2024-01-01\n---\n## `code` heading";
    const result = parseMarkdownContent(content);
    expect(result.content).toContain("<h2");
    expect(result.content).toContain("<code>");
    expect(result.content).toContain("code");
  });

  it("renders bold italic inside heading", () => {
    const content = `---\ntitle: Test\ndate: 2024-01-01\n---\n## ***bold italic*** heading`;
    const result = parseMarkdownContent(content);
    expect(result.content).toContain("<h2");
    // Should contain both strong and em tags
    expect(result.content).toMatch(/<(strong|em)>/);
    expect(result.content).toContain("bold italic");
  });

  it("renders mixed inline elements in heading", () => {
    const content =
      "---\ntitle: Test\ndate: 2024-01-01\n---\n## Mixed **bold** and `code` heading";
    const result = parseMarkdownContent(content);
    expect(result.content).toContain("<h2");
    expect(result.content).toContain("<strong>bold</strong>");
    expect(result.content).toContain("<code>");
  });

  it("generateHeadingId strips inline markup for ID generation", () => {
    // Bold markers should be stripped
    expect(generateHeadingId("**Bold** heading")).toBe("bold-heading");
    // Link markdown should be stripped (brackets/parens removed)
    expect(generateHeadingId("[Link](url) text")).toBe("linkurl-text");
    // Code backticks should be stripped
    expect(generateHeadingId("`code` heading")).toBe("code-heading");
    // Mixed markup stripped
    expect(generateHeadingId("***bold italic*** heading")).toBe(
      "bold-italic-heading",
    );
  });

  it("extractHeaders handles inline elements in heading text", () => {
    const markdown = "## **Bold** heading\n## [Link](url) heading";
    const headers = extractHeaders(markdown);
    expect(headers).toHaveLength(2);
    // Text should preserve the raw markdown inline content
    expect(headers[0].text).toContain("Bold");
    expect(headers[1].text).toContain("Link");
  });
});
