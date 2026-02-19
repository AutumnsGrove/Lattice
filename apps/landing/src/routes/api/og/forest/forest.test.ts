import { describe, it, expect, vi } from "vitest";
import { GET } from "./+server";
import type { RequestEvent } from "./$types";

/**
 * Forest OG Image Proxy Tests
 *
 * Tests the forest-themed OG image proxy endpoint that redirects
 * to og.grove.place with forest-specific defaults.
 */

// Helper to create a mock RequestEvent
const createMockEvent = (
  searchParams?: Record<string, string>,
): RequestEvent => {
  const url = new URL("http://localhost:5173/api/og/forest");

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return {
    url,
    fetch: vi.fn(),
    params: {},
    request: new Request(url),
    locals: {},
    platform: {},
    route: { id: "/api/og/forest" },
    cookies: {} as any,
    getClientAddress: () => "127.0.0.1",
    isDataRequest: false,
    isSubRequest: false,
    setHeaders: vi.fn(),
  } as unknown as RequestEvent;
};

describe("Forest OG Image Proxy (/api/og/forest)", () => {
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

  it("should include default forest-themed parameters", async () => {
    const event = createMockEvent();
    const response = await GET(event);
    const location = new URL(response.headers.get("Location")!);

    expect(location.searchParams.get("title")).toBe("The Grove");
    expect(location.searchParams.get("subtitle")).toBe(
      "Where ideas take root.",
    );
    expect(location.searchParams.get("accent")).toBe("16a34a"); // Forest green
  });

  it("should pass through custom parameters", async () => {
    const event = createMockEvent({
      title: "Custom Title",
      subtitle: "Custom Subtitle",
      accent: "ff0000",
    });
    const response = await GET(event);
    const location = new URL(response.headers.get("Location")!);

    expect(location.searchParams.get("title")).toBe("Custom Title");
    expect(location.searchParams.get("subtitle")).toBe("Custom Subtitle");
    expect(location.searchParams.get("accent")).toBe("ff0000");
  });

  it("should set cache headers", async () => {
    const event = createMockEvent();
    const response = await GET(event);
    const cacheControl = response.headers.get("Cache-Control");

    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age");
  });

  it("should include generation timestamp header", async () => {
    const event = createMockEvent();
    const response = await GET(event);
    const timestamp = response.headers.get("X-Generated-At");

    expect(timestamp).toBeTruthy();
    expect(() => new Date(timestamp!)).not.toThrow();
  });

  it("should include OG status header indicating proxy mode", async () => {
    const event = createMockEvent();
    const response = await GET(event);

    expect(response.headers.get("X-OG-Status")).toBe("proxy-to-worker-forest");
  });
});
