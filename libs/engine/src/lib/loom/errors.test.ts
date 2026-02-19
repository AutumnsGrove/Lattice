import { describe, it, expect } from "vitest";
import { LOOM_ERRORS, LoomResponse } from "./errors.js";

describe("LOOM_ERRORS", () => {
  it("has unique error codes", () => {
    const codes = Object.values(LOOM_ERRORS).map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("all codes follow GROVE-LOOM-XXX format", () => {
    for (const [key, err] of Object.entries(LOOM_ERRORS)) {
      expect(err.code).toMatch(
        /^GROVE-LOOM-\d{3}$/,
        `${key} has invalid code: ${err.code}`,
      );
    }
  });

  it("all entries have required fields", () => {
    for (const [key, err] of Object.entries(LOOM_ERRORS)) {
      expect(err.category).toBeDefined();
      expect(["user", "admin", "bug"]).toContain(err.category);
      expect(err.userMessage).toBeTruthy();
      expect(err.adminMessage).toBeTruthy();
    }
  });

  it("user messages never contain technical details", () => {
    for (const [key, err] of Object.entries(LOOM_ERRORS)) {
      // User messages should not contain technical terms
      expect(err.userMessage).not.toMatch(/SQL|DO |Durable|WebSocket accept/i);
    }
  });
});

describe("LoomResponse", () => {
  it("json() returns JSON response with correct status", async () => {
    const resp = LoomResponse.json({ hello: "world" }, 201);
    expect(resp.status).toBe(201);
    expect(resp.headers.get("Content-Type")).toBe("application/json");
    const body = await resp.json();
    expect(body).toEqual({ hello: "world" });
  });

  it("json() defaults to 200", async () => {
    const resp = LoomResponse.json({ ok: true });
    expect(resp.status).toBe(200);
  });

  it("success() returns success response", async () => {
    const resp = LoomResponse.success({ count: 5 });
    const body = await resp.json();
    expect(body).toEqual({ success: true, count: 5 });
  });

  it("success() works without extra data", async () => {
    const resp = LoomResponse.success();
    const body = await resp.json();
    expect(body).toEqual({ success: true });
  });

  it("notFound() returns 404 with error structure", async () => {
    const resp = LoomResponse.notFound();
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body.error_code).toBe("GROVE-LOOM-020");
    expect(body.error_description).toBeTruthy();
  });

  it("notFound() accepts custom detail", async () => {
    const resp = LoomResponse.notFound("Custom message");
    const body = await resp.json();
    expect(body.error_description).toBe("Custom message");
  });

  it("badRequest() returns 400", async () => {
    const resp = LoomResponse.badRequest("Invalid input");
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error_description).toBe("Invalid input");
  });

  it("error() returns structured error from GroveErrorDef", async () => {
    const resp = LoomResponse.error(LOOM_ERRORS.INTERNAL_ERROR, 503);
    expect(resp.status).toBe(503);
    const body = await resp.json();
    expect(body.error_code).toBe("GROVE-LOOM-080");
    expect(body.error_description).toBe(LOOM_ERRORS.INTERNAL_ERROR.userMessage);
  });

  it("error() defaults to 500", async () => {
    const resp = LoomResponse.error(LOOM_ERRORS.INTERNAL_ERROR);
    expect(resp.status).toBe(500);
  });
});
