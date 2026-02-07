/**
 * Integration tests for health routes
 * Tests GET /health and GET /health/replication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock db session
vi.mock("../db/session.js", () => {
  const mockDb = {
    prepare: vi.fn(),
    getBookmark: vi.fn().mockReturnValue("bookmark-123"),
  };
  return {
    createDbSession: vi.fn().mockReturnValue(mockDb),
  };
});

import healthRoutes from "./health.js";
import { createDbSession } from "../db/session.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/health", healthRoutes);
  return app;
}

const mockEnv = createMockEnv();

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// GET /health
// =============================================================================

describe("GET /health", () => {
  it("returns healthy when DB responds", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ "1": 1 }),
      }),
      getBookmark: vi.fn(),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/health", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("healthy");
    expect(json.components.database).toBe("healthy");
    expect(json.timestamp).toBeDefined();
  });

  it("returns degraded when DB fails", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error("DB connection failed")),
      }),
      getBookmark: vi.fn(),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/health", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("degraded");
    expect(json.components.database).toBe("unhealthy");
  });
});

// =============================================================================
// GET /health/replication
// =============================================================================

describe("GET /health/replication", () => {
  it("returns replication metadata on success", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({
          meta: {
            served_by_region: "WNAM",
            served_by_primary: false,
            rows_read: 1,
            rows_written: 0,
            duration: 2.5,
          },
        }),
      }),
      getBookmark: vi.fn().mockReturnValue("bookmark-abc"),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/health/replication",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("healthy");
    expect(json.replication.served_by_region).toBe("WNAM");
    expect(json.replication.served_by_primary).toBe(false);
    expect(json.replication.session_bookmark).toBe("bookmark-abc");
  });

  it("returns 500 on DB failure", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockRejectedValue(new Error("DB down")),
      }),
      getBookmark: vi.fn(),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/health/replication",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.status).toBe("error");
  });
});
