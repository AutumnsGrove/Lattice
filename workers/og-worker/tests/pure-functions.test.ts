/**
 * Tests for pure utility functions used in OG image generation
 *
 * These functions are small and pure, making them ideal for unit testing.
 * They handle HTML escaping, URL processing, and color schemes.
 */
import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  decodeHtmlEntities,
  extractDomain,
  resolveExternalUrl,
  getColors,
} from "../src/pure-functions";
import type { ColorScheme, Variant } from "../src/pure-functions";

describe("escapeHtml", () => {
  describe("XSS prevention characters", () => {
    it("should escape ampersand (&)", () => {
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("should escape less than (<)", () => {
      expect(escapeHtml("<script>alert(1)</script>")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });

    it("should escape greater than (>)", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b");
    });

    it("should handle multiple escapable characters", () => {
      expect(escapeHtml("<div>Hello & Goodbye</div>")).toBe(
        "&lt;div&gt;Hello &amp; Goodbye&lt;/div&gt;",
      );
    });
  });

  describe("Satori-safe characters (NOT escaped)", () => {
    // Satori (the SVG renderer) doesn't interpret HTML entities for quotes
    // so escaping them would show literal &quot; in the output
    it("should NOT escape single quotes (Satori behavior)", () => {
      expect(escapeHtml("It's working")).toBe("It's working");
    });

    it("should NOT escape double quotes (Satori behavior)", () => {
      expect(escapeHtml('Say "hello"')).toBe('Say "hello"');
    });
  });

  describe("passthrough cases", () => {
    it("should pass through normal text unchanged", () => {
      expect(escapeHtml("Hello world")).toBe("Hello world");
    });

    it("should pass through empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should pass through unicode characters", () => {
      expect(escapeHtml("🌲 Grove 日本語")).toBe("🌲 Grove 日本語");
    });
  });
});

describe("decodeHtmlEntities", () => {
  describe("common HTML entities", () => {
    it("should decode &amp; to &", () => {
      expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    });

    it("should decode &lt; to <", () => {
      expect(decodeHtmlEntities("1 &lt; 2")).toBe("1 < 2");
    });

    it("should decode &gt; to >", () => {
      expect(decodeHtmlEntities("2 &gt; 1")).toBe("2 > 1");
    });

    it("should decode &quot; to double quote", () => {
      expect(decodeHtmlEntities("Say &quot;hello&quot;")).toBe('Say "hello"');
    });

    it("should decode &#39; to single quote", () => {
      expect(decodeHtmlEntities("It&#39;s working")).toBe("It's working");
    });

    it("should decode &apos; to single quote", () => {
      expect(decodeHtmlEntities("It&apos;s working")).toBe("It's working");
    });

    it("should decode &nbsp; to space", () => {
      expect(decodeHtmlEntities("Hello&nbsp;world")).toBe("Hello world");
    });
  });

  describe("multiple entities in same string", () => {
    it("should decode all entities in a string", () => {
      expect(
        decodeHtmlEntities("&lt;div&gt;Hello &amp; Goodbye&lt;/div&gt;"),
      ).toBe("<div>Hello & Goodbye</div>");
    });
  });

  describe("passthrough cases", () => {
    it("should pass through text without entities", () => {
      expect(decodeHtmlEntities("Hello world")).toBe("Hello world");
    });

    it("should pass through unrecognized entities", () => {
      expect(decodeHtmlEntities("&unknown;")).toBe("&unknown;");
    });
  });
});

describe("extractDomain", () => {
  it("should remove www. prefix", () => {
    const url = new URL("https://www.example.com/path");
    expect(extractDomain(url)).toBe("example.com");
  });

  it("should keep non-www hostnames unchanged", () => {
    const url = new URL("https://example.com/path");
    expect(extractDomain(url)).toBe("example.com");
  });

  it("should handle subdomains correctly", () => {
    const url = new URL("https://blog.example.com/post");
    expect(extractDomain(url)).toBe("blog.example.com");
  });

  it("should handle www.subdomain correctly", () => {
    const url = new URL("https://www.blog.example.com/");
    expect(extractDomain(url)).toBe("blog.example.com");
  });

  it("should work with localhost", () => {
    const url = new URL("http://localhost:3000/");
    expect(extractDomain(url)).toBe("localhost");
  });
});

describe("resolveExternalUrl", () => {
  const base = new URL("https://example.com/blog/post");

  describe("protocol-relative URLs", () => {
    it("should resolve // URLs with base protocol", () => {
      expect(resolveExternalUrl(base, "//cdn.example.com/image.jpg")).toBe(
        "https://cdn.example.com/image.jpg",
      );
    });
  });

  describe("relative URLs", () => {
    it("should resolve relative paths", () => {
      expect(resolveExternalUrl(base, "/favicon.ico")).toBe(
        "https://example.com/favicon.ico",
      );
    });

    it("should resolve relative paths without leading slash", () => {
      expect(resolveExternalUrl(base, "image.jpg")).toBe(
        "https://example.com/blog/image.jpg",
      );
    });
  });

  describe("absolute URLs", () => {
    it("should return absolute URLs unchanged", () => {
      expect(resolveExternalUrl(base, "https://other.com/image.jpg")).toBe(
        "https://other.com/image.jpg",
      );
    });
  });

  describe("undefined input", () => {
    it("should return undefined for undefined input", () => {
      expect(resolveExternalUrl(base, undefined)).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should resolve relative-looking paths that URL accepts", () => {
      // Note: URL constructor is lenient - "://broken" becomes a relative path
      // This documents the actual behavior rather than testing for undefined
      expect(resolveExternalUrl(base, "://broken")).toBe(
        "https://example.com/blog/://broken",
      );
    });
  });
});

describe("getColors", () => {
  const variants: Variant[] = [
    "default",
    "forest",
    "workshop",
    "midnight",
    "knowledge",
  ];

  describe("all variants return valid ColorScheme", () => {
    for (const variant of variants) {
      it(`should return valid colors for "${variant}" variant`, () => {
        const colors = getColors(variant);

        // All required properties exist
        expect(colors).toHaveProperty("bgFrom");
        expect(colors).toHaveProperty("bgTo");
        expect(colors).toHaveProperty("accent");
        expect(colors).toHaveProperty("text");
        expect(colors).toHaveProperty("muted");
        expect(colors).toHaveProperty("glass");
        expect(colors).toHaveProperty("glassBorder");

        // All properties are strings
        expect(typeof colors.bgFrom).toBe("string");
        expect(typeof colors.bgTo).toBe("string");
        expect(typeof colors.accent).toBe("string");
        expect(typeof colors.text).toBe("string");
        expect(typeof colors.muted).toBe("string");
        expect(typeof colors.glass).toBe("string");
        expect(typeof colors.glassBorder).toBe("string");
      });
    }
  });

  describe("color format validation", () => {
    it("should return hex colors for solid colors", () => {
      const colors = getColors("default");

      // Solid colors should be hex format
      expect(colors.bgFrom).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.accent).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should return rgba for glass colors", () => {
      const colors = getColors("forest");

      expect(colors.glass).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.glassBorder).toMatch(
        /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/,
      );
    });
  });

  describe("variant-specific colors", () => {
    it("should return green-themed colors for forest", () => {
      const colors = getColors("forest");
      // Forest uses green palette - check accent is a green
      expect(colors.accent).toBe("#86efac"); // greens.mint
    });

    it("should return amber-themed colors for workshop", () => {
      const colors = getColors("workshop");
      expect(colors.accent).toBe("#eab308"); // autumn.gold
    });

    it("should return purple/amber colors for midnight", () => {
      const colors = getColors("midnight");
      expect(colors.accent).toBe("#f59e0b"); // midnightBloom.amber
    });

    it("should return blue colors for knowledge", () => {
      const colors = getColors("knowledge");
      expect(colors.accent).toBe("#7dd3fc"); // accents.water.surface
    });

    it("should return grove green for default", () => {
      const colors = getColors("default");
      expect(colors.accent).toBe("#16a34a"); // greens.grove
    });
  });
});
