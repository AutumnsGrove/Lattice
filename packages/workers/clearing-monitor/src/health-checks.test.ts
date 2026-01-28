import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkComponent, checkAllComponents } from "./health-checks";
import type { ComponentConfig } from "./config";

// Mock config imports
vi.mock("./config", async () => {
  const actual = await vi.importActual("./config");
  return {
    ...actual,
    REQUEST_TIMEOUT: 10000,
    LATENCY_THRESHOLDS: {
      OPERATIONAL: 500,
      SLOW: 1500,
    },
  };
});

const deepComponent: ComponentConfig = {
  id: "comp_test",
  name: "Test Service",
  url: "https://test.grove.place/api/health",
  checkType: "deep",
  method: "GET",
};

const shallowComponent: ComponentConfig = {
  id: "comp_cdn",
  name: "CDN",
  url: "https://cdn.grove.place/health-check.txt",
  checkType: "shallow",
  method: "HEAD",
};

describe("classifyByLatency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return operational for latency < 500ms", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(0) // startTime
      .mockReturnValueOnce(200); // after fetch (200ms latency)

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("operational");
    expect(result.latencyMs).toBe(200);
  });

  it("should return degraded for 500-1499ms", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(800);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("degraded");
  });

  it("should cap at degraded for deep checks when service reports healthy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(2000);

    const result = await checkComponent(deepComponent);
    // A healthy service with slow transport is degraded, not an outage
    expect(result.status).toBe("degraded");
  });

  it("should return partial_outage for shallow checks with high latency", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("OK", { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(2000);

    const result = await checkComponent(shallowComponent);
    // Shallow checks have no self-reported status, so latency fully applies
    expect(result.status).toBe("partial_outage");
  });

  it("should never return major_outage or partial_outage from latency when service is healthy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Even extremely high latency caps at degraded for deep checks
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(30000);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("degraded");
    expect(result.status).not.toBe("partial_outage");
    expect(result.status).not.toBe("major_outage");
  });
});

describe("evaluateDeepCheck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return major_outage for status 'unhealthy'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "unhealthy" }), { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("major_outage");
    expect(result.error).toBe("Service reports unhealthy");
  });

  it("should return degraded for status 'degraded'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "degraded" }), { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("degraded");
    expect(result.error).toBe("Service reports degraded");
  });

  it("should fall through to latency classification for 'healthy'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("operational");
  });

  it("should return maintenance for status 'maintenance'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "maintenance" }), { status: 203 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("maintenance");
    expect(result.error).toBeNull();
  });

  it("should return degraded for invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("degraded");
    expect(result.error).toBe("Invalid JSON response");
  });

  it("should return major_outage for 5xx HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("major_outage");
    expect(result.httpStatus).toBe(500);
  });

  it("should return partial_outage for 4xx HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("partial_outage");
    expect(result.httpStatus).toBe(404);
  });

  it("should return degraded for missing 'status' field in response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ service: "test", uptime: 99 }), {
        status: 200,
      }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(deepComponent);
    expect(result.status).toBe("degraded");
    expect(result.error).toBe("Invalid health response format");
  });
});

describe("evaluateShallowCheck", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return major_outage for 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 503 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(shallowComponent);
    expect(result.status).toBe("major_outage");
    expect(result.httpStatus).toBe(503);
  });

  it("should return partial_outage for non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 403 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(shallowComponent);
    expect(result.status).toBe("partial_outage");
  });

  it("should classify by latency for 2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("OK", { status: 200 }),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(100);

    const result = await checkComponent(shallowComponent);
    expect(result.status).toBe("operational");
  });
});
