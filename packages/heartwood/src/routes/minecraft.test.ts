/**
 * Integration tests for minecraft routes
 * Tests admin auth enforcement and proxy behavior
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock cookie auth middleware
vi.mock("../middleware/cookieAuth.js", () => ({
  adminCookieAuth: vi
    .fn()
    .mockReturnValue(async (c: any, next: () => Promise<void>) => {
      // Simulate setting accessToken like the real middleware does
      c.set("accessToken", "mock-admin-token");
      return next();
    }),
}));

// Mock global fetch for mc-control proxy
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import minecraftRoutes from "./minecraft.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/minecraft", minecraftRoutes);
  return app;
}

const mockEnv = createMockEnv();

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Status endpoint
// =============================================================================

describe("GET /minecraft/status", () => {
  it("proxies to mc-control and returns response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ online: true, players: 3 }), {
        status: 200,
      }),
    );

    const app = createApp();
    const res = await app.request(
      "/minecraft/status",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.online).toBe(true);
    expect(json.players).toBe(3);

    // Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      "https://mc-control.grove.place/api/mc/status",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-admin-token",
        }),
      }),
    );
  });

  it("returns 503 when upstream returns invalid JSON", async () => {
    mockFetch.mockResolvedValue(new Response("not json", { status: 200 }));

    const app = createApp();
    const res = await app.request(
      "/minecraft/status",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("service_unavailable");
  });

  it("returns 503 when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const app = createApp();
    const res = await app.request(
      "/minecraft/status",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("service_unavailable");
  });
});

// =============================================================================
// Command execution
// =============================================================================

describe("POST /minecraft/command", () => {
  it("proxies command to mc-control", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, output: "Done" }), {
        status: 200,
      }),
    );

    const app = createApp();
    const res = await app.request(
      "/minecraft/command",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "list" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// =============================================================================
// Mod management
// =============================================================================

describe("DELETE /minecraft/mods", () => {
  it("forwards X-Confirm-Delete header", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const app = createApp();
    await app.request(
      "/minecraft/mods",
      {
        method: "DELETE",
        headers: { "X-Confirm-Delete": "true" },
      },
      mockEnv,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Confirm-Delete": "true",
        }),
      }),
    );
  });
});

// =============================================================================
// History with query params
// =============================================================================

describe("GET /minecraft/history", () => {
  it("passes query params to upstream", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ sessions: [] }), { status: 200 }),
    );

    const app = createApp();
    await app.request(
      "/minecraft/history?limit=10&offset=5",
      { method: "GET" },
      mockEnv,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      expect.anything(),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("offset=5"),
      expect.anything(),
    );
  });
});

// =============================================================================
// Backup download (streaming)
// =============================================================================

describe("GET /minecraft/backups/:id/download", () => {
  it("streams file back on success", async () => {
    const mockBody = new ReadableStream();
    mockFetch.mockResolvedValue(
      new Response(mockBody, {
        status: 200,
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": 'attachment; filename="backup-123.tar.gz"',
        },
      }),
    );

    const app = createApp();
    const res = await app.request(
      "/minecraft/backups/123/download",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/gzip");
  });

  it("returns error JSON when upstream fails", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
    );

    const app = createApp();
    const res = await app.request(
      "/minecraft/backups/missing/download",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });
});
