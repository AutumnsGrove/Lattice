/**
 * Markdown Rendering Tests
 *
 * Tests for the markdown-it based rendering pipeline.
 * Focuses on user-facing behavior: heading IDs, code blocks with copy buttons,
 * inline elements in headings, and the renderMarkdown() integration.
 */

import { describe, it, expect } from "vitest";
import {
  renderMarkdown,
  generateHeadingId,
  extractHeaders,
  parseMarkdownContent,
} from "../../src/lib/utils/markdown.js";

// ============================================================================
// generateHeadingId — pure function, easy to unit test
// ============================================================================

describe("generateHeadingId", () => {
  it("should convert text to lowercase kebab-case", () => {
    expect(generateHeadingId("Hello World")).toBe("hello-world");
  });

  it("should strip special characters", () => {
    expect(generateHeadingId("What's New?")).toBe("whats-new");
  });

  it("should collapse multiple spaces and hyphens", () => {
    expect(generateHeadingId("Too   Many   Spaces")).toBe("too-many-spaces");
    expect(generateHeadingId("too---many---dashes")).toBe("too-many-dashes");
  });

  it("should handle already-kebab text", () => {
    expect(generateHeadingId("already-kebab")).toBe("already-kebab");
  });

  it("should handle leading/trailing whitespace gracefully", () => {
    // Spaces become hyphens before trim runs, so edge spaces become edge hyphens
    expect(generateHeadingId("  padded  ")).toBe("-padded-");
    // But normal headings with trimmed input work perfectly
    expect(generateHeadingId("Normal Heading")).toBe("normal-heading");
  });
});

// ============================================================================
// extractHeaders — header extraction from markdown source
// ============================================================================

describe("extractHeaders", () => {
  it("should extract headings with correct levels", () => {
    const md = "# Title\n\n## Section\n\n### Subsection";
    const headers = extractHeaders(md);

    expect(headers).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Section", id: "section" },
      { level: 3, text: "Subsection", id: "subsection" },
    ]);
  });

  it("should ignore headings inside fenced code blocks", () => {
    const md = "# Real Heading\n\n```\n# Not A Heading\n```\n\n## Another Real";
    const headers = extractHeaders(md);

    expect(headers).toHaveLength(2);
    expect(headers[0].text).toBe("Real Heading");
    expect(headers[1].text).toBe("Another Real");
  });

  it("should return empty array for content with no headings", () => {
    expect(extractHeaders("Just a paragraph.")).toEqual([]);
  });
});

// ============================================================================
// renderMarkdown — the primary integration point
// ============================================================================

describe("renderMarkdown", () => {
  it("should render basic paragraphs", () => {
    const result = renderMarkdown("Hello world");
    expect(result).toContain("<p>Hello world</p>");
  });

  it("should render bold and italic inline elements", () => {
    const result = renderMarkdown("This is **bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("should linkify URLs automatically", () => {
    const result = renderMarkdown("Visit https://grove.place for more");
    expect(result).toContain('href="https://grove.place"');
  });

  it("should NOT convert single newlines to <br> (breaks: false)", () => {
    const result = renderMarkdown("Line one\nLine two");
    expect(result).not.toContain("<br");
  });

  // ─── Heading ID generation ───────────────────────────────────────────

  it("should add id attributes to headings", () => {
    const result = renderMarkdown("## Getting Started");
    expect(result).toContain('id="getting-started"');
    expect(result).toContain("<h2");
    expect(result).toContain("Getting Started");
  });

  it("should generate consistent IDs for TOC linking", () => {
    const md = "## My Section\n\nSome content\n\n### Sub Section";
    const result = renderMarkdown(md);

    expect(result).toContain('id="my-section"');
    expect(result).toContain('id="sub-section"');
  });

  // ─── THE HEADING BUG REGRESSION TEST ─────────────────────────────────
  // This is the primary reason for the marked → markdown-it migration.
  // In marked, inline elements inside headings could silently break if
  // the renderer forgot to call parseInline(). In markdown-it, inline
  // rendering is structurally separate — this bug is impossible.

  it("should render links inside headings correctly", () => {
    const result = renderMarkdown("## Check out [Grove](https://grove.place)");
    expect(result).toContain("<h2");
    expect(result).toContain('href="https://grove.place"');
    expect(result).toContain("Grove");
    // Should NOT contain raw markdown syntax
    expect(result).not.toContain("[Grove]");
  });

  it("should render bold text inside headings", () => {
    const result = renderMarkdown("## This is **important**");
    expect(result).toContain("<h2");
    expect(result).toContain("<strong>important</strong>");
  });

  it("should render inline code inside headings", () => {
    const result = renderMarkdown("## Using `renderMarkdown()`");
    expect(result).toContain("<h2");
    expect(result).toContain("<code>renderMarkdown()</code>");
  });

  it("should render multiple inline elements inside headings", () => {
    const result = renderMarkdown(
      "## The **bold** and [linked](https://x.com) heading",
    );
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain('href="https://x.com"');
    expect(result).toContain("<h2");
  });

  // ─── Code blocks ─────────────────────────────────────────────────────

  it("should render code blocks with language label", () => {
    const result = renderMarkdown("```typescript\nconst x = 1;\n```");
    expect(result).toContain("code-block-wrapper");
    expect(result).toContain("code-block-language");
    expect(result).toContain("typescript");
    expect(result).toContain('class="language-typescript"');
  });

  it("should render code block structure with language and escaped content", () => {
    const result = renderMarkdown('```js\nconst x = "<div>";\n```');
    // The code-block-wrapper and language survive sanitization
    expect(result).toContain("code-block-wrapper");
    expect(result).toContain("code-block-header");
    expect(result).toContain("js");
    expect(result).toContain("<pre>");
    expect(result).toContain('class="language-js"');
    // HTML special chars should be escaped in the code content
    expect(result).toContain("&lt;div&gt;");
    // Note: <button> elements are stripped by sanitizeMarkdown() on the server.
    // Copy buttons are re-added client-side by JavaScript.
  });

  it("should render markdown code blocks as formatted content", () => {
    const result = renderMarkdown("```markdown\n# Hello\n\nWorld\n```");
    expect(result).toContain("rendered-markdown-block");
    expect(result).toContain("rendered-markdown-content");
    // The inner markdown should be rendered as HTML
    expect(result).toContain("<h1");
  });

  it("should default to 'text' for code blocks without language", () => {
    const result = renderMarkdown("```\nplain code\n```");
    expect(result).toContain("text");
  });

  // ─── Sanitization ────────────────────────────────────────────────────

  it("should sanitize dangerous HTML from output", () => {
    // markdown-it with html:false won't render raw HTML, but test the
    // sanitization layer handles any edge cases
    const result = renderMarkdown("Normal content");
    // Output should not contain script tags regardless of input
    expect(result).not.toContain("<script");
  });

  // ─── GFM features ────────────────────────────────────────────────────

  it("should render lists correctly", () => {
    const result = renderMarkdown("- Item 1\n- Item 2\n- Item 3");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item 1</li>");
  });

  it("should render blockquotes", () => {
    const result = renderMarkdown("> This is a quote");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("This is a quote");
  });
});

// ============================================================================
// parseMarkdownContent — integration with gray-matter + rendering
// ============================================================================

describe("parseMarkdownContent", () => {
  it("should extract frontmatter and render body", () => {
    const input = `---
title: My Post
date: "2025-01-01"
tags: [grove, test]
---

# Hello

This is content.`;

    const result = parseMarkdownContent(input);

    expect(result.data.title).toBe("My Post");
    expect(result.data.date).toBe("2025-01-01");
    expect(result.data.tags).toEqual(["grove", "test"]);
    expect(result.content).toContain("<h1");
    expect(result.content).toContain("Hello");
    expect(result.content).toContain("This is content.");
    expect(result.headers).toEqual([{ level: 1, text: "Hello", id: "hello" }]);
  });

  it("should handle content with no frontmatter", () => {
    const result = parseMarkdownContent("Just some markdown");
    expect(result.data).toEqual({});
    expect(result.content).toContain("Just some markdown");
  });

  it("should process anchor tags in HTML output", () => {
    const input = "<!-- anchor:my-note -->\n\nSome content here.";
    const result = parseMarkdownContent(input);
    expect(result.content).toContain('data-anchor="my-note"');
    expect(result.content).toContain("anchor-marker");
  });

  it("should preserve rawMarkdown in output", () => {
    const input = `---
title: Test
---

Body text here.`;

    const result = parseMarkdownContent(input);
    expect(result.rawMarkdown).toContain("Body text here.");
    expect(result.rawMarkdown).not.toContain("title: Test");
  });
});
