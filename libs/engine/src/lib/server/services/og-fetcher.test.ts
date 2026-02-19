/**
 * OG Fetcher Tests
 *
 * Tests the REAL og-fetcher module with:
 * - SSRF protection (security-critical) via actual validateUrl
 * - OG tag extraction with mocked fetch responses
 * - Cache behavior (KV hit on second call)
 * - Timeout enforcement
 * - Batch fetching
 *
 * Following grove-testing philosophy: test behavior through the real module,
 * mock only at boundaries (global fetch).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  fetchOGMetadata,
  fetchOGMetadataBatch,
  clearOGCache,
  OGFetchError,
} from "./og-fetcher.js";
import { createMockKV } from "./__mocks__/cloudflare.js";

// ============================================================================
// Test Setup
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
 * Helper: create a mock HTML response with OG tags
 */
function createOGResponse(
  tags: Record<string, string>,
  title?: string,
): Response {
  const metaTags = Object.entries(tags)
    .map(([prop, content]) => `<meta property="${prop}" content="${content}">`)
    .join("\n");

  const titleTag = title ? `<title>${title}</title>` : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  ${titleTag}
  ${metaTags}
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// ============================================================================
// SSRF Protection Tests (Security-Critical)
// ============================================================================

describe("SSRF Protection (real validator)", () => {
  describe("blocks localhost access", () => {
    it("blocks http://localhost", async () => {
      const result = await fetchOGMetadata("http://localhost/arbor");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks https://localhost with port", async () => {
      const result = await fetchOGMetadata("https://localhost:8080/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks http://127.0.0.1", async () => {
      const result = await fetchOGMetadata("http://127.0.0.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks http://127.x.x.x variations", async () => {
      const result = await fetchOGMetadata("http://127.1.1.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks http://0.0.0.0", async () => {
      const result = await fetchOGMetadata("http://0.0.0.0/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });
  });

  describe("blocks private IP ranges (RFC 1918)", () => {
    it("blocks 10.x.x.x (Class A)", async () => {
      const result = await fetchOGMetadata("http://10.0.0.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks 10.255.255.255", async () => {
      const result = await fetchOGMetadata("http://10.255.255.255/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks 172.16.x.x (Class B start)", async () => {
      const result = await fetchOGMetadata("http://172.16.0.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks 172.31.x.x (Class B end)", async () => {
      const result = await fetchOGMetadata("http://172.31.255.255/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks 192.168.x.x (Class C)", async () => {
      const result = await fetchOGMetadata("http://192.168.0.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });
  });

  describe("blocks cloud metadata endpoints", () => {
    it("blocks AWS metadata 169.254.169.254", async () => {
      const result = await fetchOGMetadata(
        "http://169.254.169.254/latest/meta-data/",
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks metadata.google.internal", async () => {
      const result = await fetchOGMetadata("http://metadata.google.internal/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks metadata-server variations", async () => {
      const result = await fetchOGMetadata("http://metadata-server/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks link-local 169.254.x.x", async () => {
      const result = await fetchOGMetadata("http://169.254.1.1/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });
  });

  describe("blocks IPv6 internal addresses", () => {
    it("blocks IPv6 localhost [::1]", async () => {
      const result = await fetchOGMetadata("http://[::1]/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks IPv6 link-local [fe80::]", async () => {
      const result = await fetchOGMetadata("http://[fe80::1]/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks IPv6 unique local [fc00::]", async () => {
      const result = await fetchOGMetadata("http://[fc00::1]/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks IPv6 unique local [fd00::]", async () => {
      const result = await fetchOGMetadata("http://[fd00::1]/");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });
  });

  describe("blocks dangerous protocols", () => {
    it("blocks file:// protocol", async () => {
      const result = await fetchOGMetadata("file:///etc/passwd");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_URL");
    });

    it("blocks data: protocol", async () => {
      const result = await fetchOGMetadata(
        "data:text/html,<script>alert(1)</script>",
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_URL");
    });
  });

  describe("blocks URL bypass attempts", () => {
    it("blocks URL with userinfo prefix (SSRF bypass vector)", async () => {
      const result = await fetchOGMetadata(
        "http://evil@169.254.169.254/latest/meta-data/",
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("blocks URL with username and password", async () => {
      const result = await fetchOGMetadata("http://user:pass@10.0.0.1/admin");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BLOCKED");
    });

    it("rejects invalid URLs", async () => {
      const result = await fetchOGMetadata("not-a-url");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_URL");
    });

    it("rejects ftp:// protocol", async () => {
      const result = await fetchOGMetadata("ftp://example.com/file");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_URL");
    });
  });

  describe("allows legitimate external URLs", () => {
    it("allows https://github.com", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        createOGResponse({ "og:title": "GitHub" }),
      );
      const result = await fetchOGMetadata("https://github.com/octocat");
      expect(result.success).toBe(true);
    });

    it("allows public IP addresses", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        createOGResponse({ "og:title": "Public" }),
      );
      const result = await fetchOGMetadata("https://8.8.8.8/");
      expect(result.success).toBe(true);
    });

    it("allows 172.15.x.x (not private range)", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        createOGResponse({ "og:title": "Not Private" }),
      );
      const result = await fetchOGMetadata("http://172.15.0.1/");
      expect(result.success).toBe(true);
    });

    it("allows 172.32.x.x (not private range)", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        createOGResponse({ "og:title": "Not Private" }),
      );
      const result = await fetchOGMetadata("http://172.32.0.1/");
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// OG Tag Extraction Tests
// ============================================================================

describe("OG Tag Extraction", () => {
  it("extracts og:title, og:description, og:image", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({
        "og:title": "My Page",
        "og:description": "A great page",
        "og:image": "https://example.com/image.jpg",
      }),
    );

    const result = await fetchOGMetadata("https://example.com");
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("My Page");
    expect(result.data?.description).toBe("A great page");
    expect(result.data?.image).toBe("https://example.com/image.jpg");
  });

  it("falls back to <title> when og:title is missing", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({}, "Fallback Title"),
    );

    const result = await fetchOGMetadata("https://example.com");
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Fallback Title");
  });

  it("extracts og:site_name and og:type", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({
        "og:title": "Article",
        "og:site_name": "My Blog",
        "og:type": "article",
      }),
    );

    const result = await fetchOGMetadata("https://myblog.com/article");
    expect(result.success).toBe(true);
    expect(result.data?.siteName).toBe("My Blog");
    expect(result.data?.type).toBe("article");
  });

  it("sets domain from URL hostname (strips www)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Test" }),
    );

    const result = await fetchOGMetadata("https://www.example.com/page");
    expect(result.success).toBe(true);
    expect(result.data?.domain).toBe("example.com");
  });

  it("includes fetchedAt timestamp", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Test" }),
    );

    const result = await fetchOGMetadata("https://example.com");
    expect(result.success).toBe(true);
    expect(result.data?.fetchedAt).toBeDefined();
    expect(new Date(result.data!.fetchedAt).getTime()).toBeGreaterThan(0);
  });

  it("resolves relative og:image URLs", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Test", "og:image": "/images/og.jpg" }),
    );

    const result = await fetchOGMetadata("https://example.com/page");
    expect(result.success).toBe(true);
    expect(result.data?.image).toBe("https://example.com/images/og.jpg");
  });

  it("returns error for non-HTML response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchOGMetadata("https://api.example.com/data");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("NOT_HTML");
  });

  it("returns error for HTTP error status", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    const result = await fetchOGMetadata("https://example.com/missing");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("FETCH_FAILED");
    expect(result.error).toContain("404");
  });
});

// ============================================================================
// Cache Behavior Tests
// ============================================================================

describe("Cache Behavior (KV)", () => {
  it("caches result in KV on first fetch", async () => {
    const kv = createMockKV();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Cached Page" }),
    );

    await fetchOGMetadata("https://example.com", { kv });

    // Verify KV was written to
    expect(kv.put).toHaveBeenCalledWith(
      "og:https://example.com/",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 3600 }),
    );
  });

  it("returns cached result on second call", async () => {
    const kv = createMockKV();
    const cachedData = {
      url: "https://example.com/",
      title: "Cached",
      domain: "example.com",
      fetchedAt: new Date().toISOString(),
    };

    // Pre-populate KV cache
    await kv.put("og:https://example.com/", JSON.stringify(cachedData));

    // Override get to handle 'json' type parameter (real KV auto-parses)
    const originalGet = kv.get;
    kv.get = vi.fn(async (key: string, type?: unknown) => {
      const raw = await originalGet(key);
      if (raw && type === "json") return JSON.parse(raw as string);
      return raw;
    });

    const result = await fetchOGMetadata("https://example.com", { kv });
    expect(result.success).toBe(true);
    expect(result.cached).toBe(true);
    expect(result.data?.title).toBe("Cached");
    // fetch should NOT have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("respects useCache: false option", async () => {
    const kv = createMockKV();
    await kv.put("og:https://example.com/", JSON.stringify({ title: "Old" }));

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Fresh" }),
    );

    const result = await fetchOGMetadata("https://example.com", {
      kv,
      useCache: false,
    });
    expect(result.success).toBe(true);
    expect(result.cached).toBe(false);
    expect(result.data?.title).toBe("Fresh");
  });

  it("respects custom cacheTtl", async () => {
    const kv = createMockKV();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({ "og:title": "Custom TTL" }),
    );

    await fetchOGMetadata("https://example.com", { kv, cacheTtl: 7200 });

    expect(kv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ expirationTtl: 7200 }),
    );
  });

  it("does not cache results without title", async () => {
    const kv = createMockKV();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      createOGResponse({}), // No title
    );

    await fetchOGMetadata("https://example.com/no-title", { kv });
    // put should not be called when there's no title
    expect(kv.put).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Timeout Tests
// ============================================================================

describe("Timeout Enforcement", () => {
  it("returns timeout error when request exceeds timeout", async () => {
    vi.mocked(globalThis.fetch).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          setTimeout(() => reject(err), 100);
        }),
    );

    const result = await fetchOGMetadata("https://slow-site.com", {
      timeout: 50,
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("TIMEOUT");
  });

  it("returns fetch error for network failures", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await fetchOGMetadata("https://down-site.com");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("FETCH_FAILED");
    expect(result.error).toContain("Network error");
  });

  it("returns error for responses exceeding max size", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("x", {
        headers: {
          "content-type": "text/html",
          "content-length": String(2 * 1024 * 1024), // 2MB
        },
      }),
    );

    const result = await fetchOGMetadata("https://huge-page.com");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("FETCH_FAILED");
    expect(result.error).toContain("too large");
  });
});

// ============================================================================
// Batch Fetching Tests
// ============================================================================

describe("Batch Fetching", () => {
  it("fetches multiple URLs and returns results map", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(createOGResponse({ "og:title": "Page 1" }))
      .mockResolvedValueOnce(createOGResponse({ "og:title": "Page 2" }));

    const results = await fetchOGMetadataBatch([
      "https://example.com/1",
      "https://example.com/2",
    ]);

    expect(results.size).toBe(2);
    expect(results.get("https://example.com/1")?.data?.title).toBe("Page 1");
    expect(results.get("https://example.com/2")?.data?.title).toBe("Page 2");
  });

  it("handles mixed success and failure in batch", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(createOGResponse({ "og:title": "Good" }))
      .mockRejectedValueOnce(new Error("Network failure"));

    const results = await fetchOGMetadataBatch([
      "https://good.com",
      "https://bad.com",
    ]);

    expect(results.get("https://good.com")?.success).toBe(true);
    expect(results.get("https://bad.com")?.success).toBe(false);
  });
});

// ============================================================================
// Cache Clearing Tests
// ============================================================================

describe("Cache Clearing", () => {
  it("removes cached entry from KV", async () => {
    const kv = createMockKV();
    await kv.put("og:https://example.com/", JSON.stringify({ title: "Old" }));

    await clearOGCache(kv, "https://example.com/");
    expect(kv.delete).toHaveBeenCalledWith("og:https://example.com/");
  });
});
