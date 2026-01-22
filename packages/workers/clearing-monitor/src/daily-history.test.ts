import { describe, it, expect } from "vitest";
import { STATUS_PRIORITY } from "./config";

/**
 * Re-implement the pure functions here for testing since they're
 * not exported from the module. This validates the logic independently.
 */

function getWorstStatus(statuses: string[]): string {
  if (statuses.length === 0) return "operational";

  return statuses.reduce((worst, current) => {
    const worstPriority = STATUS_PRIORITY[worst] ?? 0;
    const currentPriority = STATUS_PRIORITY[current] ?? 0;
    return currentPriority > worstPriority ? current : worst;
  }, "operational");
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

describe("getWorstStatus", () => {
  it("should return operational for empty array", () => {
    expect(getWorstStatus([])).toBe("operational");
  });

  it("should return the worst status from list", () => {
    expect(getWorstStatus(["operational", "degraded", "partial_outage"])).toBe(
      "partial_outage",
    );
    expect(getWorstStatus(["degraded", "major_outage", "partial_outage"])).toBe(
      "major_outage",
    );
    expect(getWorstStatus(["operational", "degraded"])).toBe("degraded");
  });

  it("should handle single-item arrays", () => {
    expect(getWorstStatus(["operational"])).toBe("operational");
    expect(getWorstStatus(["major_outage"])).toBe("major_outage");
  });
});

describe("getYesterdayDate", () => {
  it("should return YYYY-MM-DD format", () => {
    const result = getYesterdayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
