/**
 * Tests for OG metadata extraction functions
 *
 * These functions parse HTML to extract Open Graph metadata, titles,
 * and favicons for the link preview functionality.
 */
import { describe, it, expect } from "vitest";
import {
  extractExternalMetaContent,
  extractExternalTitle,
  extractExternalFavicon,
  parseExternalOGMetadata,
} from "../src/pure-functions";

describe("extractExternalMetaContent", () => {
  describe("og: property extraction", () => {
    it("should extract og:title with property first", () => {
      const html = `<meta property="og:title" content="My Page Title">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe(
        "My Page Title",
      );
    });

    it("should extract og:title with content first (reversed attribute order)", () => {
      const html = `<meta content="My Page Title" property="og:title">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe(
        "My Page Title",
      );
    });

    it("should extract og:description", () => {
      const html = `<meta property="og:description" content="A description of my page">`;
      expect(extractExternalMetaContent(html, "og:description")).toBe(
        "A description of my page",
      );
    });

    it("should extract og:image", () => {
      const html = `<meta property="og:image" content="https://example.com/image.jpg">`;
      expect(extractExternalMetaContent(html, "og:image")).toBe(
        "https://example.com/image.jpg",
      );
    });

    it("should extract og:site_name", () => {
      const html = `<meta property="og:site_name" content="Example Site">`;
      expect(extractExternalMetaContent(html, "og:site_name")).toBe(
        "Example Site",
      );
    });
  });

  describe("name attribute extraction (fallback)", () => {
    it("should extract description via name attribute", () => {
      const html = `<meta name="description" content="A meta description">`;
      expect(extractExternalMetaContent(html, "description")).toBe(
        "A meta description",
      );
    });

    it("should extract description with reversed attribute order", () => {
      const html = `<meta content="A meta description" name="description">`;
      expect(extractExternalMetaContent(html, "description")).toBe(
        "A meta description",
      );
    });
  });

  describe("HTML entity decoding", () => {
    it("should decode HTML entities in content", () => {
      const html = `<meta property="og:title" content="Tom &amp; Jerry">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe("Tom & Jerry");
    });

    it("should decode quotes in content", () => {
      const html = `<meta property="og:title" content="Say &quot;hello&quot;">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe('Say "hello"');
    });
  });

  describe("whitespace handling", () => {
    it("should trim whitespace from extracted content", () => {
      const html = `<meta property="og:title" content="  Spaced Title  ">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe("Spaced Title");
    });
  });

  describe("missing content", () => {
    it("should return undefined when property not found", () => {
      const html = `<meta property="og:title" content="Title">`;
      expect(
        extractExternalMetaContent(html, "og:nonexistent"),
      ).toBeUndefined();
    });

    it("should return undefined for empty HTML", () => {
      expect(extractExternalMetaContent("", "og:title")).toBeUndefined();
    });
  });

  describe("case insensitivity", () => {
    it("should match property names case-insensitively", () => {
      const html = `<META PROPERTY="og:title" CONTENT="Title">`;
      expect(extractExternalMetaContent(html, "og:title")).toBe("Title");
    });
  });
});

describe("extractExternalTitle", () => {
  it("should extract title from title tag", () => {
    const html = `<html><head><title>My Page Title</title></head></html>`;
    expect(extractExternalTitle(html)).toBe("My Page Title");
  });

  it("should decode HTML entities in title", () => {
    const html = `<title>Tom &amp; Jerry</title>`;
    expect(extractExternalTitle(html)).toBe("Tom & Jerry");
  });

  it("should trim whitespace from title", () => {
    const html = `<title>  Spaced Title  </title>`;
    expect(extractExternalTitle(html)).toBe("Spaced Title");
  });

  it("should handle title tag with attributes", () => {
    const html = `<title data-react-helmet="true">React Page</title>`;
    expect(extractExternalTitle(html)).toBe("React Page");
  });

  it("should return undefined when no title tag exists", () => {
    const html = `<html><head></head></html>`;
    expect(extractExternalTitle(html)).toBeUndefined();
  });

  it("should return undefined for empty title", () => {
    const html = `<title></title>`;
    expect(extractExternalTitle(html)).toBeUndefined();
  });
});

describe("extractExternalFavicon", () => {
  const baseUrl = new URL("https://example.com/blog/post");

  describe("rel=icon extraction", () => {
    it("should extract favicon from rel=icon", () => {
      const html = `<link rel="icon" href="/favicon.ico">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/favicon.ico",
      );
    });

    it("should extract favicon from rel=shortcut icon", () => {
      const html = `<link rel="shortcut icon" href="/favicon.ico">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/favicon.ico",
      );
    });

    it("should handle reversed attribute order", () => {
      const html = `<link href="/favicon.png" rel="icon">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/favicon.png",
      );
    });
  });

  describe("apple-touch-icon extraction", () => {
    it("should extract apple-touch-icon as fallback", () => {
      const html = `<link rel="apple-touch-icon" href="/apple-icon.png">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/apple-icon.png",
      );
    });
  });

  describe("URL resolution", () => {
    it("should resolve relative favicon paths", () => {
      const html = `<link rel="icon" href="favicon.ico">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/blog/favicon.ico",
      );
    });

    it("should handle absolute favicon URLs", () => {
      const html = `<link rel="icon" href="https://cdn.example.com/favicon.ico">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://cdn.example.com/favicon.ico",
      );
    });

    it("should handle protocol-relative favicon URLs", () => {
      const html = `<link rel="icon" href="//cdn.example.com/favicon.ico">`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://cdn.example.com/favicon.ico",
      );
    });
  });

  describe("fallback to default favicon", () => {
    it("should fall back to /favicon.ico when no link tag found", () => {
      const html = `<html><head></head></html>`;
      expect(extractExternalFavicon(html, baseUrl)).toBe(
        "https://example.com/favicon.ico",
      );
    });
  });
});

describe("parseExternalOGMetadata", () => {
  describe("complete metadata extraction", () => {
    it("should extract all OG metadata from well-formed HTML", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page Title</title>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
          <meta property="og:image" content="/image.jpg">
          <meta property="og:image:alt" content="Image alt text">
          <meta property="og:site_name" content="My Site">
          <meta property="og:type" content="article">
          <link rel="icon" href="/favicon.ico">
        </head>
        </html>
      `;
      const url = new URL("https://example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.url).toBe("https://example.com/page");
      expect(metadata.domain).toBe("example.com");
      expect(metadata.title).toBe("OG Title");
      expect(metadata.description).toBe("OG Description");
      expect(metadata.image).toBe("https://example.com/image.jpg");
      expect(metadata.imageAlt).toBe("Image alt text");
      expect(metadata.siteName).toBe("My Site");
      expect(metadata.type).toBe("article");
      expect(metadata.favicon).toBe("https://example.com/favicon.ico");
    });
  });

  describe("fallback behavior", () => {
    it("should fall back to title tag when og:title missing", () => {
      const html = `<title>Fallback Title</title>`;
      const url = new URL("https://example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.title).toBe("Fallback Title");
    });

    it("should fall back to meta description when og:description missing", () => {
      const html = `<meta name="description" content="Meta description">`;
      const url = new URL("https://example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.description).toBe("Meta description");
    });
  });

  describe("image URL resolution", () => {
    it("should resolve relative og:image URLs", () => {
      const html = `<meta property="og:image" content="/images/og.jpg">`;
      const url = new URL("https://example.com/blog/post");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.image).toBe("https://example.com/images/og.jpg");
    });

    it("should handle absolute og:image URLs", () => {
      const html = `<meta property="og:image" content="https://cdn.example.com/og.jpg">`;
      const url = new URL("https://example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.image).toBe("https://cdn.example.com/og.jpg");
    });
  });

  describe("domain extraction", () => {
    it("should extract clean domain without www", () => {
      const html = `<title>Test</title>`;
      const url = new URL("https://www.example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.domain).toBe("example.com");
    });
  });

  describe("minimal HTML", () => {
    it("should handle minimal HTML with no metadata", () => {
      const html = `<html><body>Just text</body></html>`;
      const url = new URL("https://example.com/page");
      const metadata = parseExternalOGMetadata(html, url);

      expect(metadata.url).toBe("https://example.com/page");
      expect(metadata.domain).toBe("example.com");
      expect(metadata.title).toBeUndefined();
      expect(metadata.description).toBeUndefined();
      expect(metadata.image).toBeUndefined();
      // Favicon falls back to default
      expect(metadata.favicon).toBe("https://example.com/favicon.ico");
    });
  });
});
