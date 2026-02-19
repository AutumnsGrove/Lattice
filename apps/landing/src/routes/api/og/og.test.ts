import { describe, it, expect, vi } from "vitest";
import { GET } from "./+server";
import type { RequestEvent } from "./$types";

/**
 * OG Image Proxy Tests
 *
 * Tests the OG image proxy endpoint that redirects to og.grove.place
 * for dynamic image generation. The separate Worker was needed because
 * WASM bundling doesn't work with SvelteKit + Cloudflare Pages.
 */

// Helper to create a mock RequestEvent
const createMockEvent = (
  searchParams: Record<string, string> = {},
): RequestEvent => {
  const url = new URL("http://localhost:5173/api/og");
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url,
    fetch: vi.fn(),
    params: {},
    request: new Request(url),
    locals: {},
    platform: {},
    route: { id: "/api/og" },
    cookies: {} as any,
    getClientAddress: () => "127.0.0.1",
    isDataRequest: false,
    isSubRequest: false,
    setHeaders: vi.fn(),
  } as unknown as RequestEvent;
};

describe("OG Image Proxy (/api/og)", () => {
  it("should return 302 redirect", async () => {
    const event = createMockEvent();
    const response = await GET(event);

    expect(response.status).toBe(302);
  });

  it("should redirect to og.grove.place", async () => {
    const event = createMockEvent();
    const response = await GET(event);
    const location = response.headers.get("Location");

    expect(location).toBeTruthy();
    expect(location).toContain("og.grove.place");
  });

  it("should pass through query parameters", async () => {
    const event = createMockEvent({
      title: "Test Title",
      subtitle: "Test Subtitle",
      accent: "f59e0b",
    });
    const response = await GET(event);
    const location = new URL(response.headers.get("Location")!);

    expect(location.searchParams.get("title")).toBe("Test Title");
    expect(location.searchParams.get("subtitle")).toBe("Test Subtitle");
    expect(location.searchParams.get("accent")).toBe("f59e0b");
  });

  it("should handle special characters in parameters", async () => {
    const event = createMockEvent({
      title: 'Test <script> & "quotes"',
      subtitle: "It's a test with 'apostrophes'",
    });
    const response = await GET(event);
    const location = new URL(response.headers.get("Location")!);

    // URL encoding handles special characters
    expect(location.searchParams.get("title")).toBe('Test <script> & "quotes"');
    expect(location.searchParams.get("subtitle")).toBe(
      "It's a test with 'apostrophes'",
    );
  });

  it("should work with no parameters (uses og.grove.place defaults)", async () => {
    const event = createMockEvent();
    const response = await GET(event);
    const location = new URL(response.headers.get("Location")!);

    expect(location.origin).toBe("https://og.grove.place");
    // No params means og.grove.place will use its own defaults
  });

  it("should set correct cache headers", async () => {
    const event = createMockEvent();
    const response = await GET(event);

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=86400");
  });

  it("should include generation timestamp header", async () => {
    const event = createMockEvent();
    const response = await GET(event);

    const timestamp = response.headers.get("X-Generated-At");
    expect(timestamp).toBeTruthy();
    // Should be a valid ISO date
    expect(() => new Date(timestamp!)).not.toThrow();
  });

  it("should include OG status header indicating proxy mode", async () => {
    const event = createMockEvent();
    const response = await GET(event);

    expect(response.headers.get("X-OG-Status")).toBe("proxy-to-worker");
  });
});
