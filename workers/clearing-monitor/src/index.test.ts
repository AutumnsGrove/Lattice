import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkAllComponents } from "./health-checks";

// Mock the incident manager to isolate health check testing
vi.mock("./incident-manager", () => ({
  processAllResults: vi.fn().mockResolvedValue(undefined),
}));

describe("runHealthChecks - Full Pipeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should check all components in parallel", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
        ),
      );
    vi.spyOn(Date, "now").mockReturnValue(100);

    const { COMPONENTS } = await import("./config");
    const results = await checkAllComponents(COMPONENTS);

    // Should have made one fetch per component
    expect(fetchSpy).toHaveBeenCalledTimes(COMPONENTS.length);
    expect(results).toHaveLength(COMPONENTS.length);
  });

  it("should process results and update state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "healthy" }), { status: 200 }),
      ),
    );
    vi.spyOn(Date, "now").mockReturnValue(100);

    const { COMPONENTS } = await import("./config");
    const results = await checkAllComponents(COMPONENTS);

    // All healthy endpoints should return operational
    for (const result of results) {
      expect(result.status).toBe("operational");
      expect(result.error).toBeNull();
    }
  });

  it("should handle timeout errors as major_outage", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      const error = new Error("aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(10001);

    const { COMPONENTS } = await import("./config");
    const results = await checkAllComponents(COMPONENTS.slice(0, 1));

    expect(results[0].status).toBe("major_outage");
    expect(results[0].error).toContain("timeout");
  });

  it("should handle network errors as major_outage", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("DNS resolution failed"),
    );
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(50);

    const { COMPONENTS } = await import("./config");
    const results = await checkAllComponents(COMPONENTS.slice(0, 1));

    expect(results[0].status).toBe("major_outage");
    expect(results[0].error).toBe("DNS resolution failed");
    expect(results[0].httpStatus).toBeNull();
  });
});
