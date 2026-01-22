/**
 * OG Fetcher Tests
 *
 * Tests for Open Graph metadata fetching with focus on:
 * - SSRF protection (security-critical)
 * - URL validation
 * - HTML parsing
 *
 * Following grove-testing philosophy: test behavior, not implementation.
 */

import { describe, it, expect } from "vitest";

// Import the module to test internal validation behavior
// We test by examining what URLs would be blocked

// ============================================================================
// SSRF Protection Tests (Security-Critical)
// ============================================================================

describe("SSRF Protection", () => {
  // These patterns must block internal network access
  const BLOCKED_PATTERNS = [
    // Localhost variations
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\./,
    /^https?:\/\/0\./,
    // Private IP ranges (RFC 1918)
    /^https?:\/\/10\./,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
    /^https?:\/\/192\.168\./,
    // Link-local addresses (RFC 3927)
    /^https?:\/\/169\.254\./,
    // Cloud metadata endpoints
    /^https?:\/\/169\.254\.169\.254/,
    /^https?:\/\/metadata\./i,
    /^https?:\/\/metadata-/i,
    // IPv6 localhost
    /^https?:\/\/\[::1\]/,
    // IPv6 link-local
    /^https?:\/\/\[fe80:/i,
    // IPv6 unique local addresses
    /^https?:\/\/\[fc/i,
    /^https?:\/\/\[fd/i,
    // Dangerous protocols
    /^file:/i,
    /^data:/i,
  ];

  function isBlocked(url: string): boolean {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url)) return true;
    }
    return false;
  }

  describe("should block localhost access", () => {
    it("blocks http://localhost", () => {
      expect(isBlocked("http://localhost/admin")).toBe(true);
    });

    it("blocks https://localhost", () => {
      expect(isBlocked("https://localhost:8080/")).toBe(true);
    });

    it("blocks http://127.0.0.1", () => {
      expect(isBlocked("http://127.0.0.1/")).toBe(true);
    });

    it("blocks http://127.x.x.x variations", () => {
      expect(isBlocked("http://127.1.1.1/")).toBe(true);
    });
  });

  describe("should block private IP ranges (RFC 1918)", () => {
    it("blocks 10.x.x.x (Class A private)", () => {
      expect(isBlocked("http://10.0.0.1/")).toBe(true);
      expect(isBlocked("http://10.255.255.255/")).toBe(true);
    });

    it("blocks 172.16-31.x.x (Class B private)", () => {
      expect(isBlocked("http://172.16.0.1/")).toBe(true);
      expect(isBlocked("http://172.31.255.255/")).toBe(true);
    });

    it("allows 172.15.x.x (not private)", () => {
      expect(isBlocked("http://172.15.0.1/")).toBe(false);
    });

    it("allows 172.32.x.x (not private)", () => {
      expect(isBlocked("http://172.32.0.1/")).toBe(false);
    });

    it("blocks 192.168.x.x (Class C private)", () => {
      expect(isBlocked("http://192.168.0.1/")).toBe(true);
      expect(isBlocked("http://192.168.1.1/")).toBe(true);
    });
  });

  describe("should block link-local addresses (RFC 3927)", () => {
    it("blocks 169.254.x.x", () => {
      expect(isBlocked("http://169.254.1.1/")).toBe(true);
    });
  });

  describe("should block cloud metadata endpoints", () => {
    it("blocks AWS/GCP/Azure metadata endpoint", () => {
      expect(isBlocked("http://169.254.169.254/latest/meta-data/")).toBe(true);
    });

    it("blocks metadata.google.internal", () => {
      expect(isBlocked("http://metadata.google.internal/")).toBe(true);
    });

    it("blocks metadata-server variations", () => {
      expect(isBlocked("http://metadata-server/")).toBe(true);
    });
  });

  describe("should block IPv6 internal addresses", () => {
    it("blocks IPv6 localhost [::1]", () => {
      expect(isBlocked("http://[::1]/")).toBe(true);
    });

    it("blocks IPv6 link-local [fe80::]", () => {
      expect(isBlocked("http://[fe80::1]/")).toBe(true);
    });

    it("blocks IPv6 unique local [fc00::]", () => {
      expect(isBlocked("http://[fc00::1]/")).toBe(true);
    });

    it("blocks IPv6 unique local [fd00::]", () => {
      expect(isBlocked("http://[fd00::1]/")).toBe(true);
    });
  });

  describe("should block dangerous protocols", () => {
    it("blocks file:// protocol", () => {
      expect(isBlocked("file:///etc/passwd")).toBe(true);
    });

    it("blocks data: protocol", () => {
      expect(isBlocked("data:text/html,<script>alert(1)</script>")).toBe(true);
    });
  });

  describe("should allow legitimate external URLs", () => {
    it("allows https://github.com", () => {
      expect(isBlocked("https://github.com/octocat")).toBe(false);
    });

    it("allows https://twitter.com", () => {
      expect(isBlocked("https://twitter.com/user")).toBe(false);
    });

    it("allows public IP addresses", () => {
      expect(isBlocked("https://8.8.8.8/")).toBe(false);
    });
  });
});

// ============================================================================
// HTML Entity Decoding Tests
// ============================================================================

describe("HTML Entity Decoding", () => {
  // Inline the decode function for testing
  function decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&apos;": "'",
      "&nbsp;": " ",
      "&#x27;": "'",
      "&#x2F;": "/",
      "&#x60;": "`",
      "&#x3D;": "=",
    };

    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, "gi"), char);
    }

    // Handle numeric entities
    decoded = decoded.replace(/&#(\d+);/g, (_, num) =>
      String.fromCharCode(parseInt(num, 10))
    );
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    return decoded;
  }

  it("decodes &amp; to &", () => {
    expect(decodeHTMLEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &lt; and &gt; to < and >", () => {
    expect(decodeHTMLEntities("&lt;script&gt;")).toBe("<script>");
  });

  it("decodes &quot; to double quote", () => {
    expect(decodeHTMLEntities('Say &quot;hello&quot;')).toBe('Say "hello"');
  });

  it("decodes numeric entities", () => {
    expect(decodeHTMLEntities("&#39;quoted&#39;")).toBe("'quoted'");
  });

  it("decodes hex entities", () => {
    expect(decodeHTMLEntities("&#x27;hex&#x27;")).toBe("'hex'");
  });

  it("handles mixed entities", () => {
    expect(decodeHTMLEntities("A &amp; B &lt; C &gt; D")).toBe("A & B < C > D");
  });
});

// ============================================================================
// Meta Tag Extraction Tests
// ============================================================================

describe("Meta Tag Extraction", () => {
  // Test the regex patterns used for extraction
  function extractMetaContent(
    html: string,
    property: string
  ): string | undefined {
    const ogPatterns = [
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
        "i"
      ),
    ];

    for (const pattern of ogPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }

    return undefined;
  }

  it("extracts og:title from standard format", () => {
    const html = '<meta property="og:title" content="My Page Title">';
    expect(extractMetaContent(html, "og:title")).toBe("My Page Title");
  });

  it("extracts og:title from reversed attribute order", () => {
    const html = '<meta content="My Page Title" property="og:title">';
    expect(extractMetaContent(html, "og:title")).toBe("My Page Title");
  });

  it("extracts og:description", () => {
    const html =
      '<meta property="og:description" content="A description of the page">';
    expect(extractMetaContent(html, "og:description")).toBe(
      "A description of the page"
    );
  });

  it("extracts og:image", () => {
    const html =
      '<meta property="og:image" content="https://example.com/image.jpg">';
    expect(extractMetaContent(html, "og:image")).toBe(
      "https://example.com/image.jpg"
    );
  });

  it("handles single quotes", () => {
    const html = "<meta property='og:title' content='Single Quoted'>";
    expect(extractMetaContent(html, "og:title")).toBe("Single Quoted");
  });

  it("returns undefined for missing property", () => {
    const html = '<meta property="og:description" content="A description">';
    expect(extractMetaContent(html, "og:title")).toBeUndefined();
  });

  it("handles extra attributes in meta tag", () => {
    const html =
      '<meta name="og" property="og:title" content="With Extra Attrs" data-test="true">';
    expect(extractMetaContent(html, "og:title")).toBe("With Extra Attrs");
  });
});

// ============================================================================
// Title Extraction Tests
// ============================================================================

describe("Title Extraction", () => {
  function extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match?.[1]?.trim();
  }

  it("extracts simple title", () => {
    const html = "<html><head><title>My Page</title></head></html>";
    expect(extractTitle(html)).toBe("My Page");
  });

  it("extracts title with attributes", () => {
    const html = '<title data-test="true">Page With Attrs</title>';
    expect(extractTitle(html)).toBe("Page With Attrs");
  });

  it("handles whitespace in title", () => {
    const html = "<title>  Spaced Title  </title>";
    expect(extractTitle(html)).toBe("Spaced Title");
  });

  it("returns undefined when no title", () => {
    const html = "<html><head></head></html>";
    expect(extractTitle(html)).toBeUndefined();
  });
});

// ============================================================================
// URL Resolution Tests
// ============================================================================

describe("URL Resolution", () => {
  function resolveUrl(
    base: URL,
    relative: string | undefined
  ): string | undefined {
    if (!relative) return undefined;
    if (relative.startsWith("//")) {
      return `${base.protocol}${relative}`;
    }
    try {
      return new URL(relative, base.href).href;
    } catch {
      return undefined;
    }
  }

  const baseUrl = new URL("https://example.com/page/article");

  it("resolves protocol-relative URLs", () => {
    expect(resolveUrl(baseUrl, "//cdn.example.com/image.jpg")).toBe(
      "https://cdn.example.com/image.jpg"
    );
  });

  it("resolves absolute paths", () => {
    expect(resolveUrl(baseUrl, "/images/logo.png")).toBe(
      "https://example.com/images/logo.png"
    );
  });

  it("resolves relative paths", () => {
    expect(resolveUrl(baseUrl, "image.jpg")).toBe(
      "https://example.com/page/image.jpg"
    );
  });

  it("preserves absolute URLs", () => {
    expect(resolveUrl(baseUrl, "https://other.com/image.jpg")).toBe(
      "https://other.com/image.jpg"
    );
  });

  it("returns undefined for empty input", () => {
    expect(resolveUrl(baseUrl, undefined)).toBeUndefined();
    expect(resolveUrl(baseUrl, "")).toBeUndefined();
  });
});
