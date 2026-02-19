/**
 * Tests for CORS middleware - Cross-Origin Resource Sharing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";
import { corsMiddleware, validateOriginForClient } from "./cors.js";

// Mock the DB queries module
vi.mock("../db/queries.js", () => ({
  getClientByClientId: vi.fn(),
}));

import { getClientByClientId } from "../db/queries.js";

const mockEnv = createMockEnv();

// =============================================================================
// corsMiddleware - CORS header handling
// =============================================================================

describe("corsMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTestApp() {
    const app = new Hono<{ Bindings: Env }>();
    app.use("*", corsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));
    return app;
  }

  describe("allowed origins", () => {
    it("allows requests from explicit ALLOWED_ORIGINS", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://heartwood.grove.place",
      );
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });

    it("allows requests from all explicit ALLOWED_ORIGINS entries", async () => {
      const origins = [
        "https://heartwood.grove.place",
        "https://groveengine.grove.place",
        "https://plant.grove.place",
        "https://autumnsgrove.com",
        "https://amber.grove.place",
        "https://autumn.grove.place",
      ];

      for (const origin of origins) {
        const app = createTestApp();
        const res = await app.request("/test", {
          headers: { Origin: origin },
        });

        expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
        expect(res.headers.get("Access-Control-Allow-Credentials")).toBe(
          "true",
        );
      }
    });

    it("allows requests from any *.grove.place HTTPS subdomain", async () => {
      const testOrigins = [
        "https://new-property.grove.place",
        "https://staging.grove.place",
        "https://dev.grove.place",
        "https://foo.grove.place",
      ];

      for (const origin of testOrigins) {
        const app = createTestApp();
        const res = await app.request("/test", {
          headers: { Origin: origin },
        });

        expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
        expect(res.headers.get("Access-Control-Allow-Credentials")).toBe(
          "true",
        );
      }
    });
  });

  describe("rejected origins", () => {
    it("does not allow arbitrary origins", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        headers: { Origin: "https://evil.com" },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    });

    it("does not allow null origin", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        headers: { Origin: "null" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("does not allow HTTP grove.place subdomains", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        headers: { Origin: "http://plant.grove.place" },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("does not allow grove.place lookalikes", async () => {
      const fakeOrigins = [
        "https://evil-grove.place",
        "https://grove.place.evil.com",
        "https://xgrove.place",
      ];

      for (const origin of fakeOrigins) {
        const app = createTestApp();
        const res = await app.request("/test", {
          headers: { Origin: origin },
        });

        expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      }
    });

    it("returns CORS headers without Allow-Origin for invalid origins", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        headers: { Origin: "https://evil.com" },
      });

      // Should still have standard CORS headers, just not Allow-Origin
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS",
      );
      expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
      expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("request handling", () => {
    it("handles GET requests with CORS headers", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://heartwood.grove.place",
      );
    });

    it("handles POST requests with CORS headers", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", corsMiddleware);
      app.post("/test", (c) => c.json({ ok: true }));

      const res = await app.request("/test", {
        method: "POST",
        headers: { Origin: "https://heartwood.grove.place" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://heartwood.grove.place",
      );
    });
  });

  describe("preflight (OPTIONS) requests", () => {
    it("returns 204 for OPTIONS preflight with valid origin", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://heartwood.grove.place",
      );
      expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });

    it("returns 204 for OPTIONS preflight with invalid origin", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.com" },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("returns correct CORS methods in preflight", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS",
      );
    });

    it("returns correct CORS headers in preflight", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
    });

    it("returns correct max-age in preflight", async () => {
      const app = createTestApp();
      const res = await app.request("/test", {
        method: "OPTIONS",
        headers: { Origin: "https://heartwood.grove.place" },
      });

      expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    });
  });

  describe("credentials handling", () => {
    it("sets Access-Control-Allow-Credentials only for allowed origins", async () => {
      const app = createTestApp();

      // Valid origin
      const validRes = await app.request("/test", {
        headers: { Origin: "https://heartwood.grove.place" },
      });
      expect(validRes.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );

      // Invalid origin
      const invalidRes = await app.request("/test", {
        headers: { Origin: "https://evil.com" },
      });
      expect(
        invalidRes.headers.get("Access-Control-Allow-Credentials"),
      ).toBeNull();
    });
  });
});

// =============================================================================
// validateOriginForClient
// =============================================================================

describe("validateOriginForClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when origin is in client's allowed_origins", async () => {
    const mockClient = {
      id: "client-123",
      client_id: "test-app",
      allowed_origins: JSON.stringify([
        "https://app.example.com",
        "https://staging.example.com",
      ]),
      // other required fields...
    };

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient,
    );

    const result = await validateOriginForClient(
      mockEnv.DB,
      "test-app",
      "https://app.example.com",
    );

    expect(result).toBe(true);
    expect(getClientByClientId).toHaveBeenCalledWith(mockEnv.DB, "test-app");
  });

  it("returns false when origin is NOT in client's allowed_origins", async () => {
    const mockClient = {
      id: "client-123",
      client_id: "test-app",
      allowed_origins: JSON.stringify([
        "https://app.example.com",
        "https://staging.example.com",
      ]),
    };

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient,
    );

    const result = await validateOriginForClient(
      mockEnv.DB,
      "test-app",
      "https://evil.com",
    );

    expect(result).toBe(false);
  });

  it("returns false when client is not found", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await validateOriginForClient(
      mockEnv.DB,
      "nonexistent-app",
      "https://app.example.com",
    );

    expect(result).toBe(false);
  });

  it("parses JSON allowed_origins correctly", async () => {
    const allowedOrigins = [
      "https://app1.example.com",
      "https://app2.example.com",
      "https://app3.example.com",
    ];

    const mockClient = {
      id: "client-123",
      client_id: "test-app",
      allowed_origins: JSON.stringify(allowedOrigins),
    };

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClient,
    );

    // Test each origin
    for (const origin of allowedOrigins) {
      const result = await validateOriginForClient(
        mockEnv.DB,
        "test-app",
        origin,
      );
      expect(result).toBe(true);
    }
  });

  it("calls getClientByClientId with correct parameters", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await validateOriginForClient(
      mockEnv.DB,
      "my-client-id",
      "https://app.com",
    );

    expect(getClientByClientId).toHaveBeenCalledWith(
      mockEnv.DB,
      "my-client-id",
    );
    expect(getClientByClientId).toHaveBeenCalledTimes(1);
  });
});
