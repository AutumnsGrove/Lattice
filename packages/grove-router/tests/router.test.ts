/**
 * Grove Router Tests
 *
 * Tests the Worker that proxies wildcard subdomain requests (*.grove.place)
 * to their correct Pages/Workers targets.
 *
 * Strategy: Import the handler directly, provide mock Request + Env.
 * No miniflare needed — the router is pure routing logic + R2 reads.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import router, { type Env } from "../src/index.js";

// ============================================================================
// Mock R2 Bucket
// ============================================================================

interface MockR2Entry {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  size: number;
}

function createMockR2(): Env["CDN"] {
  const objects = new Map<string, MockR2Entry>();

  return {
    head: vi.fn(async (key: string) => (objects.has(key) ? {} : null)),
    get: vi.fn(async (key: string) => {
      const entry = objects.get(key);
      if (!entry) return null;
      return {
        body: entry.body,
        httpMetadata: entry.httpMetadata,
        customMetadata: entry.customMetadata,
        size: entry.size,
        writeHttpMetadata: vi.fn(),
      };
    }),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
    _seedObject(key: string, content: string, contentType?: string) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      objects.set(key, {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        httpMetadata: contentType ? { contentType } : undefined,
        size: bytes.length,
      });
    },
  } as unknown as Env["CDN"] & {
    _seedObject: (key: string, content: string, contentType?: string) => void;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function createRequest(
  subdomain: string,
  path = "/",
  options: RequestInit = {},
): Request {
  const url = `https://${subdomain}.grove.place${path}`;
  return new Request(url, {
    method: "GET",
    ...options,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("Grove Router", () => {
  let env: Env & { CDN: ReturnType<typeof createMockR2> };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    env = { CDN: createMockR2() };
    mockFetch = vi.fn(
      async () => new Response("OK", { status: 200, headers: {} }),
    );
    globalThis.fetch = mockFetch;
  });

  // ==========================================================================
  // Subdomain Routing
  // ==========================================================================

  describe("Subdomain routing", () => {
    it("routes auth subdomain to groveauth-frontend", async () => {
      const request = createRequest("auth", "/login");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("groveauth-frontend.pages.dev/login"),
        }),
      );
    });

    it("routes admin subdomain to groveauth-frontend", async () => {
      const request = createRequest("admin", "/dashboard");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(
            "groveauth-frontend.pages.dev/dashboard",
          ),
        }),
      );
    });

    it("routes ivy subdomain to ivy Pages", async () => {
      const request = createRequest("ivy", "/inbox");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("ivy-3uv.pages.dev/inbox"),
        }),
      );
    });

    it("routes meadow subdomain to grove-meadow", async () => {
      const request = createRequest("meadow", "/feed");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("grove-meadow.pages.dev/feed"),
        }),
      );
    });

    it("routes unknown subdomain to grove-example-site (main engine)", async () => {
      const request = createRequest("autumn", "/blog/hello");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(
            "grove-example-site.pages.dev/blog/hello",
          ),
        }),
      );
    });

    it("routes scout subdomain to scout Worker", async () => {
      const request = createRequest("scout", "/api/data");
      await router.fetch(request, env);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("scout.m7jv4v7npb.workers.dev/api/data"),
        }),
      );
    });
  });

  // ==========================================================================
  // X-Forwarded-Host Header
  // ==========================================================================

  describe("X-Forwarded-Host", () => {
    it("sets X-Forwarded-Host to original hostname on proxied requests", async () => {
      const request = createRequest("autumn", "/");
      await router.fetch(request, env);

      const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(proxiedRequest.headers.get("x-forwarded-host")).toBe(
        "autumn.grove.place",
      );
    });

    it("preserves original request headers", async () => {
      const request = createRequest("autumn", "/", {
        headers: { "Accept-Language": "en-US" },
      });
      await router.fetch(request, env);

      const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(proxiedRequest.headers.get("accept-language")).toBe("en-US");
    });
  });

  // ==========================================================================
  // WWW Redirect
  // ==========================================================================

  describe("www redirect", () => {
    it("redirects www.grove.place to grove.place with 301", async () => {
      const request = createRequest("www", "/about");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(301);
      const location = response.headers.get("location");
      expect(location).toContain("grove.place/about");
      expect(location).not.toContain("www.");
    });

    it("preserves path and query on redirect", async () => {
      const request = new Request(
        "https://www.grove.place/page?key=value#anchor",
      );
      const response = await router.fetch(request, env);

      expect(response.status).toBe(301);
      const location = response.headers.get("location");
      expect(location).toContain("/page");
      expect(location).toContain("key=value");
    });
  });

  // ==========================================================================
  // CDN (R2)
  // ==========================================================================

  describe("CDN (R2 bucket)", () => {
    it("serves R2 object with correct content-type for images", async () => {
      (env.CDN as any)._seedObject(
        "images/photo.jpg",
        "fake-jpeg-data",
        "image/jpeg",
      );
      const request = createRequest("cdn", "/images/photo.jpg");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/jpeg");
    });

    it("returns 404 for missing R2 key", async () => {
      const request = createRequest("cdn", "/missing/file.png");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(404);
    });

    it("sets Cache-Control with long max-age", async () => {
      (env.CDN as any)._seedObject("assets/style.css", "body{}");
      const request = createRequest("cdn", "/assets/style.css");
      const response = await router.fetch(request, env);

      expect(response.headers.get("cache-control")).toContain("max-age=");
    });

    it("serves index.html for root path", async () => {
      (env.CDN as any)._seedObject("index.html", "<html>Root</html>");
      const request = createRequest("cdn", "/");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Content-Disposition (XSS Prevention)
  // ==========================================================================

  describe("Content-Disposition", () => {
    it("forces download for JavaScript files", async () => {
      (env.CDN as any)._seedObject("script.js", "alert(1)");
      const request = createRequest("cdn", "/script.js");
      const response = await router.fetch(request, env);

      expect(response.headers.get("content-disposition")).toBe("attachment");
    });

    it("forces download for HTML files", async () => {
      (env.CDN as any)._seedObject("page.html", "<script>xss</script>");
      const request = createRequest("cdn", "/page.html");
      const response = await router.fetch(request, env);

      expect(response.headers.get("content-disposition")).toBe("attachment");
    });

    it("allows inline display for images", async () => {
      (env.CDN as any)._seedObject("photo.jpg", "jpeg-data");
      const request = createRequest("cdn", "/photo.jpg");
      const response = await router.fetch(request, env);

      expect(response.headers.get("content-disposition")).toBe("inline");
    });

    it("allows inline display for PDFs", async () => {
      (env.CDN as any)._seedObject("doc.pdf", "pdf-data");
      const request = createRequest("cdn", "/doc.pdf");
      const response = await router.fetch(request, env);

      expect(response.headers.get("content-disposition")).toBe("inline");
    });

    it("serves unknown extensions as octet-stream with inline", async () => {
      // .xml is not in the content-type map, falls to application/octet-stream
      (env.CDN as any)._seedObject("data.xml", "<root/>");
      const request = createRequest("cdn", "/data.xml");
      const response = await router.fetch(request, env);

      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream",
      );
      expect(response.headers.get("content-disposition")).toBe("inline");
    });
  });

  // ==========================================================================
  // CORS Validation
  // ==========================================================================

  describe("CORS (validateOrigin)", () => {
    it("accepts grove.place origin on CDN requests", async () => {
      (env.CDN as any)._seedObject("file.png", "data");
      const request = createRequest("cdn", "/file.png", {
        headers: { Origin: "https://grove.place" },
      });
      const response = await router.fetch(request, env);

      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://grove.place",
      );
    });

    it("accepts subdomain origins (*.grove.place)", async () => {
      (env.CDN as any)._seedObject("file.png", "data");
      const request = createRequest("cdn", "/file.png", {
        headers: { Origin: "https://autumn.grove.place" },
      });
      const response = await router.fetch(request, env);

      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://autumn.grove.place",
      );
    });

    it("rejects non-grove.place origins (falls back to default)", async () => {
      (env.CDN as any)._seedObject("file.png", "data");
      const request = createRequest("cdn", "/file.png", {
        headers: { Origin: "https://evil.com" },
      });
      const response = await router.fetch(request, env);

      expect(response.headers.get("access-control-allow-origin")).toBe(
        "https://grove.place",
      );
    });

    it("sets Vary: Origin header", async () => {
      (env.CDN as any)._seedObject("file.png", "data");
      const request = createRequest("cdn", "/file.png", {
        headers: { Origin: "https://grove.place" },
      });
      const response = await router.fetch(request, env);

      expect(response.headers.get("vary")).toBe("Origin");
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe("Error handling", () => {
    it("returns 400 for non-grove.place domain", async () => {
      const request = new Request("https://evil.com/path");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(400);
    });

    it("returns 400 for bare grove.place (no subdomain, < 3 parts)", async () => {
      // This tests the hostname check: parts.length < 3
      const request = new Request("https://grove.place/path");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(400);
    });

    it("returns 502 when proxy fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
      const request = createRequest("autumn", "/");
      const response = await router.fetch(request, env);

      expect(response.status).toBe(502);
    });
  });

  // ==========================================================================
  // Path Preservation
  // ==========================================================================

  describe("Path preservation", () => {
    it("forwards full path to target", async () => {
      const request = createRequest("autumn", "/blog/my-post/comments");
      await router.fetch(request, env);

      const proxiedUrl = (mockFetch.mock.calls[0][0] as Request).url;
      expect(proxiedUrl).toContain("/blog/my-post/comments");
    });

    it("forwards query parameters", async () => {
      const request = new Request(
        "https://autumn.grove.place/search?q=hello&page=2",
      );
      await router.fetch(request, env);

      const proxiedUrl = (mockFetch.mock.calls[0][0] as Request).url;
      expect(proxiedUrl).toContain("q=hello");
      expect(proxiedUrl).toContain("page=2");
    });

    it("forwards request method", async () => {
      const request = createRequest("autumn", "/api/posts", { method: "POST" });
      await router.fetch(request, env);

      const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(proxiedRequest.method).toBe("POST");
    });
  });
});
