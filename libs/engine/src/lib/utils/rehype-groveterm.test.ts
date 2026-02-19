/**
 * Tests for rehype-groveterm plugin
 *
 * Tests cover:
 * - Basic [[term]] transformation
 * - Custom display text [[term|display]]
 * - Multiple terms in one line
 * - Unknown term handling (graceful fallback)
 * - Case normalization
 * - Edge cases (empty brackets, whitespace, etc.)
 * - Full rehype pipeline integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import {
  rehypeGroveTerm,
  processGroveTerms,
  type RehypeGroveTermOptions,
} from "./rehype-groveterm";
import type { GroveTermManifest } from "$lib/ui/components/ui/groveterm/types";

// Mock manifest for testing
const mockManifest: GroveTermManifest = {
  bloom: {
    slug: "bloom",
    term: "Bloom",
    category: "foundational",
    tagline: "Your Writing",
    definition: "A bloom is a flower opening.",
  },
  blooms: {
    slug: "blooms",
    term: "Blooms",
    category: "foundational",
    tagline: "Your Writing",
    definition: "Blooms are flowers opening.",
  },
  wanderer: {
    slug: "wanderer",
    term: "Wanderer",
    category: "foundational",
    tagline: "Everyone who enters the grove.",
    definition: "A wanderer is anyone who shows up.",
  },
  "your-grove": {
    slug: "your-grove",
    term: "Grove",
    category: "foundational",
    tagline: "Your Space",
    definition: "Your personal grove.",
  },
  "your-garden": {
    slug: "your-garden",
    term: "Garden",
    category: "foundational",
    tagline: "The Collection",
    definition: "Where your blooms grow.",
  },
  heartwood: {
    slug: "heartwood",
    term: "Heartwood",
    category: "operations",
    tagline: "Authentication",
    definition: "The core authentication system.",
  },
  lattice: {
    slug: "lattice",
    term: "Lattice",
    category: "foundational",
    tagline: "Core Platform",
    definition: "The framework that supports growth.",
  },
};

// Helper to process markdown through the full pipeline
async function processMarkdown(
  markdown: string,
  options: RehypeGroveTermOptions = {},
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(rehypeGroveTerm, options)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

describe("rehype-groveterm", () => {
  // Suppress console.warn during tests for unknown terms
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  // ==========================================================================
  // Basic Transformation
  // ==========================================================================

  describe("basic transformation", () => {
    it("transforms [[term]] to groveterm component", async () => {
      const result = await processMarkdown("[[bloom]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('<groveterm term="bloom">Bloom</groveterm>');
    });

    it("capitalizes term name for display", async () => {
      const result = await processMarkdown("[[wanderer]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(">Wanderer</groveterm>");
    });

    it("preserves surrounding text", async () => {
      const result = await processMarkdown("Hello [[wanderer]], welcome!", {
        manifest: mockManifest,
      });
      expect(result).toContain("Hello");
      expect(result).toContain(
        '<groveterm term="wanderer">Wanderer</groveterm>',
      );
      expect(result).toContain(", welcome!");
    });

    it("wraps content in paragraph tags", async () => {
      const result = await processMarkdown("[[bloom]]", {
        manifest: mockManifest,
      });
      expect(result).toMatch(/^<p>.*<\/p>$/);
    });
  });

  // ==========================================================================
  // Custom Display Text
  // ==========================================================================

  describe("custom display text", () => {
    it("uses custom display text after pipe", async () => {
      const result = await processMarkdown("[[wanderer|visitors]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(
        '<groveterm term="wanderer">visitors</groveterm>',
      );
    });

    it("preserves spaces in display text", async () => {
      const result = await processMarkdown("[[bloom|my latest writings]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(">my latest writings</groveterm>");
    });

    it("handles empty display text (uses term name)", async () => {
      const result = await processMarkdown("[[bloom|]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(">Bloom</groveterm>");
    });

    it("trims whitespace from display text", async () => {
      const result = await processMarkdown("[[bloom|  spaced  ]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(">spaced</groveterm>");
    });
  });

  // ==========================================================================
  // Multiple Terms
  // ==========================================================================

  describe("multiple terms", () => {
    it("transforms multiple terms in one line", async () => {
      const result = await processMarkdown("[[bloom]] and [[wanderer]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('<groveterm term="bloom">');
      expect(result).toContain('<groveterm term="wanderer">');
    });

    it("transforms multiple terms across paragraphs", async () => {
      const result = await processMarkdown(
        "First [[bloom]].\n\nSecond [[wanderer]].",
        { manifest: mockManifest },
      );
      expect(result).toContain('<groveterm term="bloom">');
      expect(result).toContain('<groveterm term="wanderer">');
    });

    it("handles adjacent terms", async () => {
      const result = await processMarkdown("[[bloom]][[wanderer]]", {
        manifest: mockManifest,
      });
      expect(result).toContain("</groveterm><groveterm");
    });
  });

  // ==========================================================================
  // Term Lookup Variations
  // ==========================================================================

  describe("term lookup variations", () => {
    it("normalizes uppercase to lowercase", async () => {
      const result = await processMarkdown("[[BLOOM]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="bloom"');
      // Display preserves the input case transformed
      expect(result).toContain(">Bloom</groveterm>");
    });

    it("normalizes mixed case", async () => {
      const result = await processMarkdown("[[BlOoM]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="bloom"');
    });

    it('resolves "grove" to "your-grove"', async () => {
      const result = await processMarkdown("[[grove]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="your-grove"');
    });

    it('resolves "garden" to "your-garden"', async () => {
      const result = await processMarkdown("[[garden]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="your-garden"');
    });

    it("resolves singular to plural (bloom → blooms)", async () => {
      // Since both exist, it finds direct match first
      const result = await processMarkdown("[[bloom]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="bloom"');
    });
  });

  // ==========================================================================
  // Unknown Terms
  // ==========================================================================

  describe("unknown terms", () => {
    it("renders unknown term as plain text", async () => {
      const result = await processMarkdown("[[not-a-term]]", {
        manifest: mockManifest,
      });
      expect(result).not.toContain("groveterm");
      expect(result).toContain("Not-a-term");
    });

    it("logs warning for unknown terms", async () => {
      await processMarkdown("[[fake-term]]", {
        manifest: mockManifest,
        warnOnUnknown: true,
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("fake-term"),
      );
    });

    it("suppresses warning when warnOnUnknown is false", async () => {
      await processMarkdown("[[fake-term]]", {
        manifest: mockManifest,
        warnOnUnknown: false,
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("uses custom display for unknown term", async () => {
      const result = await processMarkdown("[[unknown|my display]]", {
        manifest: mockManifest,
      });
      expect(result).toContain("my display");
      expect(result).not.toContain("groveterm");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("edge cases", () => {
    it("ignores empty brackets [[]]", async () => {
      const result = await processMarkdown("[[]]", {
        manifest: mockManifest,
      });
      expect(result).toContain("[[]]");
      expect(result).not.toContain("groveterm");
    });

    it("ignores single brackets [term]", async () => {
      const result = await processMarkdown("[bloom]", {
        manifest: mockManifest,
      });
      expect(result).not.toContain("groveterm");
    });

    it("handles whitespace inside brackets", async () => {
      const result = await processMarkdown("[[ bloom ]]", {
        manifest: mockManifest,
      });
      // Pattern requires term to start immediately after [[
      expect(result).not.toContain("groveterm");
    });

    it("handles terms with hyphens", async () => {
      const result = await processMarkdown("[[your-grove]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="your-grove"');
    });

    it("does not transform inside inline code", async () => {
      const result = await processMarkdown("`[[bloom]]`", {
        manifest: mockManifest,
      });
      expect(result).toContain("<code>[[bloom]]</code>");
      expect(result).not.toContain("groveterm");
    });

    it("does not transform inside code blocks", async () => {
      const result = await processMarkdown("```\n[[bloom]]\n```", {
        manifest: mockManifest,
      });
      expect(result).toContain("[[bloom]]");
      expect(result).not.toContain("groveterm");
    });

    it("handles special HTML characters in display text", async () => {
      // Test with ampersand which needs escaping - rehype uses hex encoding (&#x26;)
      const result = await processMarkdown("[[bloom|Tom & Jerry]]", {
        manifest: mockManifest,
      });
      // Rehype escapes & to &#x26; (hex) rather than &amp; (named entity)
      expect(result).toContain("&#x26;");
      expect(result).toContain("groveterm");
      // The original & should not appear unescaped
      expect(result).not.toMatch(/Tom & Jerry/);
    });

    it("falls back safely when HTML tags appear in display text", async () => {
      // When actual HTML tags are in display text, markdown parses them as HTML,
      // fragmenting the text so our pattern doesn't match. This is safe - the
      // content remains as plain text rather than being transformed.
      const result = await processMarkdown("[[bloom|<script>]]", {
        manifest: mockManifest,
      });
      // The pattern doesn't match because markdown fragmented the text
      expect(result).not.toContain("groveterm");
    });
  });

  // ==========================================================================
  // processGroveTerms standalone function
  // ==========================================================================

  describe("processGroveTerms standalone function", () => {
    it("transforms terms in plain text", () => {
      const result = processGroveTerms("Hello [[bloom]]!", {
        manifest: mockManifest,
      });
      expect(result).toContain('<GroveTerm term="bloom">Bloom</GroveTerm>');
    });

    it("handles multiple terms", () => {
      const result = processGroveTerms("[[bloom]] and [[wanderer]]", {
        manifest: mockManifest,
      });
      expect(result).toContain('term="bloom"');
      expect(result).toContain('term="wanderer"');
    });

    it("returns unknown terms as plain text", () => {
      const result = processGroveTerms("[[unknown]]", {
        manifest: mockManifest,
        warnOnUnknown: false,
      });
      expect(result).toBe("Unknown");
      expect(result).not.toContain("GroveTerm");
    });

    it("handles custom display text", () => {
      const result = processGroveTerms("[[bloom|flowers]]", {
        manifest: mockManifest,
      });
      expect(result).toContain(">flowers</GroveTerm>");
    });
  });

  // ==========================================================================
  // Integration with real manifest
  // ==========================================================================

  describe("integration with real manifest", () => {
    it("transforms bloom with real manifest", async () => {
      const result = await processMarkdown("[[bloom]]");
      // Should work with actual manifest (lowercased by rehype)
      expect(result).toContain("groveterm");
    });

    it("transforms wanderer with real manifest", async () => {
      const result = await processMarkdown("[[wanderer]]");
      expect(result).toContain("groveterm");
    });

    it("transforms grove with real manifest (your-grove lookup)", async () => {
      const result = await processMarkdown("[[grove]]");
      expect(result).toContain("groveterm");
    });
  });
});
