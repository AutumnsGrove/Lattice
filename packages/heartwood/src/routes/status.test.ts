/**
 * Integration tests for status routes
 * Tests CRUD for incidents, components, and scheduled maintenance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock cookie auth middleware (bypass admin auth)
vi.mock("../middleware/cookieAuth.js", () => ({
  adminCookieAuth: vi
    .fn()
    .mockReturnValue(async (_c: unknown, next: () => Promise<void>) => next()),
}));

// Mock status queries
vi.mock("../db/status-queries.js", () => ({
  getIncidents: vi.fn(),
  createIncident: vi.fn(),
  getIncidentById: vi.fn(),
  addIncidentUpdate: vi.fn(),
  updateIncident: vi.fn(),
  getAllComponents: vi.fn(),
  updateComponentStatus: vi.fn(),
  getScheduledMaintenance: vi.fn(),
  createScheduledMaintenance: vi.fn(),
}));

import statusRoutes from "./status.js";
import * as statusQueries from "../db/status-queries.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/status", statusRoutes);
  return app;
}

const mockEnv = createMockEnv();

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Incidents
// =============================================================================

describe("GET /status/incidents", () => {
  it("returns all incidents", async () => {
    vi.mocked(statusQueries.getIncidents).mockResolvedValue([
      { id: "inc-1", title: "DB outage", status: "investigating" },
    ] as any);

    const app = createApp();
    const res = await app.request(
      "/status/incidents",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.incidents).toHaveLength(1);
  });

  it("passes status filter when provided", async () => {
    vi.mocked(statusQueries.getIncidents).mockResolvedValue([]);

    const app = createApp();
    await app.request(
      "/status/incidents?status=active",
      { method: "GET" },
      mockEnv,
    );

    expect(statusQueries.getIncidents).toHaveBeenCalledWith(
      expect.anything(),
      "active",
    );
  });
});

describe("POST /status/incidents", () => {
  it("creates incident with valid data", async () => {
    vi.mocked(statusQueries.createIncident).mockResolvedValue({
      id: "inc-new",
      title: "API Degradation",
    } as any);

    const app = createApp();
    const res = await app.request(
      "/status/incidents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "API Degradation",
          type: "incident",
          impact: "minor",
          components: ["api"],
          initialStatus: "investigating",
          initialMessage: "Looking into it",
        }),
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.incident.id).toBe("inc-new");
  });

  it("returns 400 when missing required fields", async () => {
    const app = createApp();
    const res = await app.request(
      "/status/incidents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Incomplete" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error).toBe("missing_required_fields");
  });
});

describe("GET /status/incidents/:id", () => {
  it("returns incident by ID", async () => {
    vi.mocked(statusQueries.getIncidentById).mockResolvedValue({
      id: "inc-1",
      title: "Outage",
      updates: [],
    } as any);

    const app = createApp();
    const res = await app.request(
      "/status/incidents/inc-1",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.incident.id).toBe("inc-1");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(statusQueries.getIncidentById).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      "/status/incidents/missing",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /status/incidents/:id/updates", () => {
  it("adds update to incident", async () => {
    vi.mocked(statusQueries.addIncidentUpdate).mockResolvedValue({
      id: "update-1",
      status: "identified",
      message: "Root cause found",
    } as any);

    const app = createApp();
    const res = await app.request(
      "/status/incidents/inc-1/updates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "identified",
          message: "Root cause found",
        }),
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
  });

  it("returns 400 when missing required fields", async () => {
    const app = createApp();
    const res = await app.request(
      "/status/incidents/inc-1/updates",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "identified" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });
});

// =============================================================================
// Components
// =============================================================================

describe("GET /status/components", () => {
  it("returns all components", async () => {
    vi.mocked(statusQueries.getAllComponents).mockResolvedValue([
      { slug: "api", name: "API", status: "operational" },
    ] as any);

    const app = createApp();
    const res = await app.request(
      "/status/components",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.components).toHaveLength(1);
  });
});

describe("PATCH /status/components/:slug", () => {
  it("updates component status", async () => {
    vi.mocked(statusQueries.updateComponentStatus).mockResolvedValue({
      slug: "api",
      status: "degraded_performance",
    } as any);

    const app = createApp();
    const res = await app.request(
      "/status/components/api",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "degraded_performance" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
  });

  it("returns 400 when missing status", async () => {
    const app = createApp();
    const res = await app.request(
      "/status/components/api",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error).toBe("missing_status");
  });
});

// =============================================================================
// Scheduled Maintenance
// =============================================================================

describe("GET /status/scheduled", () => {
  it("returns scheduled maintenance", async () => {
    vi.mocked(statusQueries.getScheduledMaintenance).mockResolvedValue([]);

    const app = createApp();
    const res = await app.request(
      "/status/scheduled",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.scheduled).toEqual([]);
  });
});

describe("POST /status/scheduled", () => {
  it("creates scheduled maintenance", async () => {
    vi.mocked(statusQueries.createScheduledMaintenance).mockResolvedValue({
      id: "maint-1",
      title: "DB Migration",
    } as any);

    const app = createApp();
    const res = await app.request(
      "/status/scheduled",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "DB Migration",
          description: "Migrating to new schema",
          scheduledStart: "2025-06-01T00:00:00Z",
          scheduledEnd: "2025-06-01T04:00:00Z",
          components: ["database"],
        }),
      },
      mockEnv,
    );

    expect(res.status).toBe(201);
  });

  it("returns 400 when missing required fields", async () => {
    const app = createApp();
    const res = await app.request(
      "/status/scheduled",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Incomplete" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });
});
