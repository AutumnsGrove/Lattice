/**
 * oEmbed API Endpoint Integration Tests
 *
 * Tests the /api/oembed endpoint behavior:
 * - Trusted providers return embed data
 * - Unknown URLs fall back to OG preview
 * - Invalid URLs return proper errors
 * - oEmbed fetch failures gracefully degrade to OG preview
 * - Response validation rejects malformed oEmbed data
 * - URL normalization prevents case-based bypasses
 *
 * Mock boundary: global fetch (network). Everything else runs for real.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  findProvider,
  getEmbedUrl,
  extractIframeSrcFromHtml,
  validateOEmbedResponse,
  MAX_OEMBED_RESPONSE_SIZE,
  type OEmbedResponse,
} from "$lib/server/services/oembed-providers.js";
import { fetchOGMetadata } from "$lib/server/services/og-fetcher.js";

// ============================================================================
// Test the provider matching + oEmbed flow end-to-end
// (Testing the handler's logic without SvelteKit request machinery)
// ============================================================================

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

/**
 * Helper: create a mock oEmbed JSON response
 */
function createOEmbedResponse(
  data: Partial<OEmbedResponse>,
  options?: { contentType?: string; contentLength?: string },
): Response {
  const body = JSON.stringify({ version: "1.0", ...data });
  const headers: Record<string, string> = {
    "content-type": options?.contentType || "application/json",
  };
  if (options?.contentLength) {
    headers["content-length"] = options.contentLength;
  }
  return new Response(body, { headers });
}

/**
 * Helper: create a mock HTML response with OG tags
 */
function createOGResponse(
  tags: Record<string, string>,
  title?: string,
): Response {
  const metaTags = Object.entries(tags)
    .map(
      ([prop, content]) =>
        `<meta property="${prop}" content="${content}">`,
    )
    .join("\n");

  const titleTag = title ? `<title>${title}</title>` : "";

  const html = `<!DOCTYPE html><html><head>${titleTag}${metaTags}</head><body></body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Simulate the endpoint logic (mirrors the hardened handler)
 * This tests the actual business logic without SvelteKit request handling
 */
async function simulateOEmbedEndpoint(
  targetUrl: string,
  kv?: KVNamespace,
) {
  // Validate URL
  try {
    new URL(targetUrl);
  } catch {
    return { error: "Invalid URL", status: 400 };
  }

  // Check against provider allowlist (includes URL normalization)
  const match = findProvider(targetUrl);

  if (match) {
    try {
      const embedUrl = getEmbedUrl(match.provider, targetUrl);

      // Try to fetch oEmbed data
      let oembedData: OEmbedResponse | null = null;
      try {
        const oembedUrl = new URL(match.provider.oembedUrl);
        oembedUrl.searchParams.set("url", targetUrl);
        oembedUrl.searchParams.set("format", "json");
        oembedUrl.searchParams.set("maxwidth", "400");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(oembedUrl.href, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "GroveBot/1.0 (+https://grove.place; oEmbed Consumer)",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Content-Length check
          const contentLength = response.headers.get("content-length");
          if (
            contentLength &&
            parseInt(contentLength) > MAX_OEMBED_RESPONSE_SIZE
          ) {
            // Response too large, skip
          } else {
            // Content-Type check
            const contentType = response.headers.get("content-type") || "";
            if (
              !contentType.includes("application/json") &&
              !contentType.includes("text/json")
            ) {
              // Wrong content type, skip
            } else {
              const text = await response.text();
              if (text.length <= MAX_OEMBED_RESPONSE_SIZE) {
                const rawData = JSON.parse(text);
                // Response validation
                oembedData = validateOEmbedResponse(rawData);
              }
            }
          }
        }
      } catch {
        // oEmbed fetch failed
      }

      let finalEmbedUrl = embedUrl;
      let embedHtml: string | null = null;

      if (!finalEmbedUrl && oembedData?.html) {
        if (match.provider.renderStrategy === "iframe-src") {
          finalEmbedUrl = extractIframeSrcFromHtml(oembedData.html);
        } else if (match.provider.renderStrategy === "iframe-srcdoc") {
          embedHtml = oembedData.html;
        }
      }

      return {
        type: "embed" as const,
        provider: match.provider.name,
        renderStrategy: match.provider.renderStrategy,
        embedUrl: finalEmbedUrl,
        embedHtml: embedHtml,
        title: oembedData?.title,
        thumbnail: oembedData?.thumbnail_url,
        aspectRatio: match.provider.aspectRatio || "16:9",
        sandboxPermissions: match.provider.sandboxPermissions,
        maxWidth: match.provider.maxWidth,
        cacheAge: oembedData?.cache_age || 86400,
      };
    } catch {
      // Fall through to OG preview
    }
  }

  // Fallback: OG metadata
  const ogResult = await fetchOGMetadata(targetUrl, {
    kv,
    timeout: 5000,
    cacheTtl: 3600,
  });

  return {
    type: "preview" as const,
    provider: null,
    og: ogResult.success ? ogResult.data : null,
    error: ogResult.success ? undefined : ogResult.error,
    url: targetUrl,
  };
}

// ============================================================================
// Trusted Provider Flow
// ============================================================================

describe("trusted provider embed flow", () => {
  it("returns embed data for YouTube URL with oEmbed response", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({
        type: "video",
        title: "Never Gonna Give You Up",
        html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        width: 480,
        height: 270,
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("YouTube");
    expect(result.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(result.title).toBe("Never Gonna Give You Up");
    expect(result.thumbnail).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("returns embed data for Strawpoll URL", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({
        type: "rich",
        title: "Best Pizza Topping?",
        html: '<iframe src="https://strawpoll.com/embed/abc123"></iframe>',
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://strawpoll.com/polls/abc123",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("Strawpoll");
    expect(result.embedUrl).toBe("https://strawpoll.com/embed/abc123");
    expect(result.title).toBe("Best Pizza Topping?");
  });

  it("uses extractEmbedUrl even when oEmbed fetch fails", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"));
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=abc123xyz",
    );

    // Should still return embed type with extracted URL
    expect(result.type).toBe("embed");
    expect(result.provider).toBe("YouTube");
    expect(result.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/abc123xyz",
    );
    // No oEmbed data available
    expect(result.title).toBeUndefined();
  });

  it("extracts iframe src from oEmbed HTML when no extractEmbedUrl", async () => {
    // SoundCloud uses iframe-srcdoc strategy
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({
        type: "rich",
        title: "Cool Track",
        html: '<iframe width="100%" height="166" src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/artist/track" frameborder="0"></iframe>',
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://soundcloud.com/artist-name/cool-track",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("SoundCloud");
    // SoundCloud is iframe-srcdoc, so embedHtml should be set
    expect(result.embedHtml).toContain("soundcloud.com");
  });

  it("includes sandbox permissions from provider config", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({ type: "rich", title: "Poll" }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://strawpoll.com/my-poll",
    );

    expect(result.sandboxPermissions).toContain("allow-scripts");
    expect(result.sandboxPermissions).toContain("allow-forms");
  });

  it("returns aspect ratio from provider config", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({ type: "video", title: "Video" }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=test123",
    );

    expect(result.aspectRatio).toBe("16:9");
  });
});

// ============================================================================
// Response Validation (Security Hardening)
// ============================================================================

describe("oEmbed response validation in flow", () => {
  it("rejects oEmbed with invalid type and still returns embed via extractEmbedUrl", async () => {
    // Provider returns bad type, but we have extractEmbedUrl as fallback
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({ type: "malicious" as any, title: "Bad" }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=abc123",
    );

    // Should still return embed type (extractEmbedUrl works independently)
    expect(result.type).toBe("embed");
    expect(result.provider).toBe("YouTube");
    expect(result.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/abc123",
    );
    // But no oEmbed data (validation rejected it)
    expect(result.title).toBeUndefined();
  });

  it("rejects oEmbed with wrong content-type and uses extractEmbedUrl", async () => {
    // Provider returns HTML instead of JSON
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response("<html>not json</html>", {
        headers: { "content-type": "text/html" },
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=def456",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("YouTube");
    expect(result.embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/def456",
    );
    expect(result.title).toBeUndefined();
  });

  it("rejects oEmbed with oversized content-length", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse(
        { type: "video", title: "Video" },
        { contentLength: String(MAX_OEMBED_RESPONSE_SIZE + 1) },
      ),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=ghi789",
    );

    expect(result.type).toBe("embed");
    expect(result.title).toBeUndefined();
  });

  it("strips HTTP thumbnail URLs from oEmbed response", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({
        type: "video",
        title: "Test",
        thumbnail_url: "http://insecure.example.com/thumb.jpg",
      }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://www.youtube.com/watch?v=thumb123",
    );

    expect(result.type).toBe("embed");
    expect(result.thumbnail).toBeUndefined();
  });
});

// ============================================================================
// URL Normalization (Security Hardening)
// ============================================================================

describe("URL normalization in flow", () => {
  it("matches YouTube URL with uppercase hostname", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({ type: "video", title: "Test" }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://WWW.YOUTUBE.COM/watch?v=abc123",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("YouTube");
  });

  it("matches Spotify URL with tracking params", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOEmbedResponse({ type: "rich", title: "Track" }),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://open.spotify.com/track/abc123?si=xyz&utm_source=twitter",
    );

    expect(result.type).toBe("embed");
    expect(result.provider).toBe("Spotify");
  });
});

// ============================================================================
// OG Preview Fallback Flow
// ============================================================================

describe("OG preview fallback flow", () => {
  it("returns OG preview for unknown URLs", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      createOGResponse(
        {
          "og:title": "My Cool Blog Post",
          "og:description": "A great article about stuff",
          "og:image": "https://example.com/image.jpg",
          "og:site_name": "Cool Blog",
        },
        "My Cool Blog Post",
      ),
    );
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://example.com/blog/post-1",
    );

    expect(result.type).toBe("preview");
    expect(result.provider).toBeNull();
    expect(result.og).toBeTruthy();
    expect(result.og?.title).toBe("My Cool Blog Post");
    expect(result.og?.description).toBe("A great article about stuff");
    expect(result.og?.image).toBe("https://example.com/image.jpg");
  });

  it("returns preview with error when OG fetch fails", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("DNS lookup failed"));
    globalThis.fetch = mockFetch;

    const result = await simulateOEmbedEndpoint(
      "https://nonexistent-domain.example/page",
    );

    expect(result.type).toBe("preview");
    expect(result.og).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ============================================================================
// Input Validation
// ============================================================================

describe("input validation", () => {
  it("rejects invalid URLs", async () => {
    const result = await simulateOEmbedEndpoint("not-a-valid-url");
    expect(result.error).toBe("Invalid URL");
    expect(result.status).toBe(400);
  });

  it("handles empty strings", async () => {
    const result = await simulateOEmbedEndpoint("");
    expect(result.error).toBe("Invalid URL");
    expect(result.status).toBe(400);
  });
});

// ============================================================================
// Security: SSRF Protection (via og-fetcher)
// ============================================================================

describe("SSRF protection for preview fallback", () => {
  it("blocks localhost URLs in preview fallback", async () => {
    const result = await simulateOEmbedEndpoint("http://localhost:8080/admin");

    expect(result.type).toBe("preview");
    expect(result.og).toBeNull();
    expect(result.error).toContain("blocked");
  });

  it("blocks private IP addresses in preview fallback", async () => {
    const result = await simulateOEmbedEndpoint(
      "http://192.168.1.1/secret",
    );

    expect(result.type).toBe("preview");
    expect(result.og).toBeNull();
    expect(result.error).toContain("blocked");
  });

  it("blocks cloud metadata endpoints in preview fallback", async () => {
    const result = await simulateOEmbedEndpoint(
      "http://169.254.169.254/latest/meta-data/",
    );

    expect(result.type).toBe("preview");
    expect(result.og).toBeNull();
    expect(result.error).toContain("blocked");
  });
});
