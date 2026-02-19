import { describe, it, expect } from "vitest";
import { safeJsonParse } from "./storage.js";

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    const result = safeJsonParse('{"name":"test"}', null);
    expect(result).toEqual({ name: "test" });
  });

  it("returns fallback for null input", () => {
    const result = safeJsonParse(null, { default: true });
    expect(result).toEqual({ default: true });
  });

  it("returns fallback for undefined input", () => {
    const result = safeJsonParse(undefined, "fallback");
    expect(result).toBe("fallback");
  });

  it("returns fallback for invalid JSON", () => {
    const result = safeJsonParse("{not valid json", []);
    expect(result).toEqual([]);
  });

  it("returns fallback for empty string", () => {
    // Empty string is not null/undefined, but is invalid JSON
    const result = safeJsonParse("", 42);
    expect(result).toBe(42);
  });

  it("parses arrays", () => {
    const result = safeJsonParse<string[]>('["a","b","c"]', []);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("parses primitive values", () => {
    expect(safeJsonParse("42", 0)).toBe(42);
    expect(safeJsonParse("true", false)).toBe(true);
    expect(safeJsonParse('"hello"', "")).toBe("hello");
  });

  it("handles nested objects", () => {
    const json = '{"a":{"b":{"c":1}}}';
    const result = safeJsonParse<{ a: { b: { c: number } } }>(json, {
      a: { b: { c: 0 } },
    });
    expect(result.a.b.c).toBe(1);
  });
});
