/**
 * Passkey Origin Configuration Tests
 *
 * Validates the comma-separated origin splitting logic
 * that Heartwood uses for WebAuthn origin validation.
 */

import { describe, it, expect } from "vitest";

/**
 * Simulates the origin parsing logic from heartwood/src/auth/index.ts.
 * This is extracted here so we can test it without importing the full auth setup.
 */
function parsePasskeyOrigins(envValue: string | undefined): string[] {
  return (envValue || "https://login.grove.place")
    .split(",")
    .map((o: string) => o.trim());
}

describe("passkey origin parsing", () => {
  it("defaults to login.grove.place when env is undefined", () => {
    expect(parsePasskeyOrigins(undefined)).toEqual([
      "https://login.grove.place",
    ]);
  });

  it("returns single origin as array", () => {
    expect(parsePasskeyOrigins("https://login.grove.place")).toEqual([
      "https://login.grove.place",
    ]);
  });

  it("splits comma-separated origins", () => {
    expect(
      parsePasskeyOrigins("https://login.grove.place,http://localhost:5173"),
    ).toEqual(["https://login.grove.place", "http://localhost:5173"]);
  });

  it("trims whitespace around origins", () => {
    expect(
      parsePasskeyOrigins("https://login.grove.place , http://localhost:5173 "),
    ).toEqual(["https://login.grove.place", "http://localhost:5173"]);
  });

  it("handles multiple dev origins", () => {
    const result = parsePasskeyOrigins(
      "https://login.grove.place,http://localhost:5173,http://localhost:5174",
    );
    expect(result).toHaveLength(3);
    expect(result).toContain("https://login.grove.place");
    expect(result).toContain("http://localhost:5173");
    expect(result).toContain("http://localhost:5174");
  });
});
