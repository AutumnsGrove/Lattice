/**
 * PostContentDO Tests
 *
 * Tests for the post content Durable Object that handles:
 * - Markdown content storage
 * - HTML rendered content caching
 * - Gutter content (supplementary data)
 * - Content versioning
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createJsonRequest,
  resetTestCounters,
  getPostContentDOStub,
} from "../utils/test-helpers.js";

// ============================================================================
// Test Setup
// ============================================================================

function getContentStub(tenantId: string, slug: string) {
  return getPostContentDOStub(tenantId, slug);
}

beforeEach(() => {
  resetTestCounters();
});

// ============================================================================
// Content Storage Tests
// ============================================================================

describe("PostContentDO Content Storage", () => {
  it("should store and retrieve content", async () => {
    const stub = getContentStub("tenant-1", "test-post");

    // Store content
    const putResponse = await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: "# Hello World\n\nThis is my first post.",
        html: "<h1>Hello World</h1><p>This is my first post.</p>",
        gutter: "[]",
      }),
    );

    expect(putResponse.ok).toBe(true);

    // Retrieve content
    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );

    expect(getResponse.ok).toBe(true);
    const content = await getResponse.json();

    expect(content.markdown).toBe("# Hello World\n\nThis is my first post.");
    expect(content.html).toBe(
      "<h1>Hello World</h1><p>This is my first post.</p>",
    );
    expect(content.gutter).toBe("[]");
  });

  it("should return 404 for non-existent content", async () => {
    const stub = getContentStub("tenant-2", "missing-post");

    const response = await stub.fetch(
      new Request("https://content.internal/content"),
    );

    expect(response.status).toBe(404);
  });

  it("should update existing content", async () => {
    const stub = getContentStub("tenant-3", "update-post");

    // Store initial content
    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: "# Original Title",
        html: "<h1>Original Title</h1>",
        gutter: "[]",
      }),
    );

    // Update content
    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: "# Updated Title\n\nWith new content.",
        html: "<h1>Updated Title</h1><p>With new content.</p>",
        gutter: '[{"type": "note", "text": "Added annotation"}]',
      }),
    );

    // Retrieve updated content
    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    expect(content.markdown).toBe("# Updated Title\n\nWith new content.");
    expect(content.gutter).toBe(
      '[{"type": "note", "text": "Added annotation"}]',
    );
  });

  it("should handle large markdown content", async () => {
    const stub = getContentStub("tenant-4", "large-post");

    // Generate large content (simulating a long blog post)
    const largeMarkdown = "# Long Post\n\n" + "Lorem ipsum ".repeat(1000);
    const largeHtml =
      "<h1>Long Post</h1><p>" + "Lorem ipsum ".repeat(1000) + "</p>";

    const putResponse = await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: largeMarkdown,
        html: largeHtml,
        gutter: "[]",
      }),
    );

    expect(putResponse.ok).toBe(true);

    // Verify retrieval
    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    expect(content.markdown.length).toBeGreaterThan(10000);
  });

  it("should handle special characters in content", async () => {
    const stub = getContentStub("tenant-5", "special-chars");

    const specialMarkdown =
      "# Special Characters: <>&\"'\n\n```javascript\nconst x = '<div>';\n```";
    const specialHtml =
      "<h1>Special Characters: &lt;&gt;&amp;\"'</h1><pre><code>const x = '<div>';</code></pre>";

    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: specialMarkdown,
        html: specialHtml,
        gutter: "[]",
      }),
    );

    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    expect(content.markdown).toBe(specialMarkdown);
    expect(content.html).toBe(specialHtml);
  });

  it("should handle unicode content", async () => {
    const stub = getContentStub("tenant-6", "unicode-post");

    const unicodeMarkdown =
      "# 日本語タイトル 🌳\n\nThis post contains émojis 🎉 and mültïlïñgüål text.";
    const unicodeHtml =
      "<h1>日本語タイトル 🌳</h1><p>This post contains émojis 🎉 and mültïlïñgüål text.</p>";

    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: unicodeMarkdown,
        html: unicodeHtml,
        gutter: "[]",
      }),
    );

    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    expect(content.markdown).toBe(unicodeMarkdown);
    expect(content.html).toBe(unicodeHtml);
  });
});

// ============================================================================
// Gutter Content Tests
// ============================================================================

describe("PostContentDO Gutter Content", () => {
  it("should store complex gutter content", async () => {
    const stub = getContentStub("tenant-7", "gutter-post");

    const gutterContent = JSON.stringify([
      { type: "annotation", line: 5, text: "Important note here" },
      { type: "footnote", id: "fn1", content: "Referenced source" },
      { type: "sidenote", line: 10, content: "Additional context" },
    ]);

    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: "# Post with Gutter",
        html: "<h1>Post with Gutter</h1>",
        gutter: gutterContent,
      }),
    );

    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    const gutter = JSON.parse(content.gutter);
    expect(gutter.length).toBe(3);
    expect(gutter[0].type).toBe("annotation");
    expect(gutter[1].type).toBe("footnote");
    expect(gutter[2].type).toBe("sidenote");
  });

  it("should handle empty gutter content", async () => {
    const stub = getContentStub("tenant-8", "empty-gutter");

    await stub.fetch(
      createJsonRequest("https://content.internal/content", "PUT", {
        markdown: "# Simple Post",
        html: "<h1>Simple Post</h1>",
        gutter: "[]",
      }),
    );

    const getResponse = await stub.fetch(
      new Request("https://content.internal/content"),
    );
    const content = await getResponse.json();

    expect(content.gutter).toBe("[]");
    expect(JSON.parse(content.gutter)).toEqual([]);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("PostContentDO Error Handling", () => {
  it("should return 404 for unknown routes", async () => {
    const stub = getContentStub("tenant-9", "error-route");

    const response = await stub.fetch(
      new Request("https://content.internal/unknown-endpoint"),
    );

    expect(response.status).toBe(404);
  });
});
