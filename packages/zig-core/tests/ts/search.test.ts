import { describe, it, expect, beforeEach } from "vitest";
import {
  buildIndex,
  clearIndex,
  search,
  tokenize,
  type SearchDocument,
} from "../../lib/search.js";

const testDocs: SearchDocument[] = [
  {
    id: 1,
    title: "Introduction to Zig",
    content: "Zig is a systems programming language",
  },
  {
    id: 2,
    title: "WebAssembly Guide",
    content: "WASM enables high performance web applications",
  },
  {
    id: 3,
    title: "Rust vs Zig",
    content: "Comparing Rust and Zig for systems programming",
  },
  {
    id: 4,
    title: "JavaScript Performance",
    content: "Optimizing JavaScript applications for speed",
  },
  {
    id: 5,
    title: "Building with WASM",
    content: "How to build and deploy WebAssembly modules",
  },
];

describe("Tokenizer", () => {
  it("splits text into tokens", () => {
    const tokens = tokenize("hello world");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("removes stop words", () => {
    const tokens = tokenize("the quick brown fox");
    expect(tokens).not.toContain("the");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
  });

  it("filters short tokens", () => {
    const tokens = tokenize("I a am go");
    expect(tokens).not.toContain("i");
    expect(tokens).not.toContain("a");
    // "am" is a stop word, "go" passes
    expect(tokens).toContain("go");
  });

  it("handles punctuation", () => {
    const tokens = tokenize("hello, world! how are you?");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
    expect(tokens).toContain("how");
    expect(tokens).toContain("you");
  });
});

describe("Search Index", () => {
  beforeEach(() => {
    clearIndex();
  });

  it("builds index from documents", async () => {
    const result = await buildIndex(testDocs);
    expect(result).toBe(true);
  });

  it("finds documents by keyword", async () => {
    await buildIndex(testDocs);
    const results = await search("zig");

    expect(results.length).toBeGreaterThan(0);
    // Should find docs 1 and 3 (both mention Zig)
    const ids = results.map((r) => r.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it("ranks more relevant documents higher", async () => {
    await buildIndex(testDocs);
    const results = await search("webassembly wasm");

    expect(results.length).toBeGreaterThan(0);
    // Docs 2 and 5 both mention WASM-related terms
    const topIds = results.slice(0, 2).map((r) => r.id);
    expect(topIds.some((id) => id === 2 || id === 5)).toBe(true);
  });

  it("returns empty for no matches", async () => {
    await buildIndex(testDocs);
    const results = await search("nonexistentterm123");

    expect(results.length).toBe(0);
  });

  it("returns empty for empty query", async () => {
    await buildIndex(testDocs);
    const results = await search("");

    expect(results.length).toBe(0);
  });

  it("limits results to maxResults", async () => {
    await buildIndex(testDocs);
    const results = await search("programming", 2);

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("results have scores", async () => {
    await buildIndex(testDocs);
    const results = await search("zig programming");

    for (const result of results) {
      expect(result.score).toBeGreaterThan(0);
    }
  });

  it("results are sorted by score descending", async () => {
    await buildIndex(testDocs);
    const results = await search("programming language");

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
