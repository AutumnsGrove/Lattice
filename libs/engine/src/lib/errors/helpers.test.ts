/**
 * Grove Error System — Shared Helpers Tests
 *
 * Tests for logGroveError, buildErrorUrl, buildErrorJson, and throwGroveError.
 * Every error tells you where to look — these tests make sure they tell the truth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GroveErrorDef } from "./types";
import {
  logGroveError,
  buildErrorUrl,
  buildErrorJson,
  throwGroveError,
} from "./helpers";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const SAMPLE_ERROR: GroveErrorDef = {
  code: "TEST-001",
  category: "bug",
  userMessage: "Something went wrong. Please try again.",
  adminMessage: "D1 database binding unavailable.",
};

const USER_ERROR: GroveErrorDef = {
  code: "TEST-020",
  category: "user",
  userMessage: "Your session has expired. Please sign in again.",
  adminMessage: "Session token expired or invalidated.",
};

const ADMIN_ERROR: GroveErrorDef = {
  code: "TEST-040",
  category: "admin",
  userMessage: "Sign-in failed due to a configuration issue. Contact support.",
  adminMessage: "OAuth client_id not registered.",
};

// =============================================================================
// logGroveError
// =============================================================================

describe("logGroveError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should log error code, admin message, and prefix", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("TestPkg", SAMPLE_ERROR);

    expect(spy).toHaveBeenCalledOnce();
    const [message] = spy.mock.calls[0];
    expect(message).toBe(
      "[TestPkg] TEST-001: D1 database binding unavailable.",
    );
  });

  it("should include structured JSON with code and category", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("TestPkg", SAMPLE_ERROR);

    const jsonStr = spy.mock.calls[0][1] as string;
    const parsed = JSON.parse(jsonStr);
    expect(parsed.code).toBe("TEST-001");
    expect(parsed.category).toBe("bug");
  });

  it("should include context fields in structured output", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("Engine", SAMPLE_ERROR, {
      path: "/api/posts",
      userId: "user-123",
      detail: "Query returned 0 rows",
    });

    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed.path).toBe("/api/posts");
    expect(parsed.userId).toBe("user-123");
    expect(parsed.detail).toBe("Query returned 0 rows");
  });

  it("should sanitize Error cause to message string only", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("Engine", SAMPLE_ERROR, {
      cause: new Error("connection refused"),
    });

    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed.cause).toBe("connection refused");
  });

  it("should convert non-Error cause to string", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("Engine", SAMPLE_ERROR, {
      cause: 42,
    });

    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed.cause).toBe("42");
  });

  it("should omit cause field when cause is undefined", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("Engine", SAMPLE_ERROR, { path: "/test" });

    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed).not.toHaveProperty("cause");
  });

  it("should work with no context at all", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logGroveError("Plant", USER_ERROR);

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed.code).toBe("TEST-020");
    expect(parsed.category).toBe("user");
  });
});

// =============================================================================
// buildErrorUrl
// =============================================================================

describe("buildErrorUrl", () => {
  it("should build URL with error and error_code params", () => {
    const url = buildErrorUrl(SAMPLE_ERROR);

    expect(url).toContain("error=");
    expect(url).toContain("error_code=TEST-001");
  });

  it("should use default base URL of '/'", () => {
    const url = buildErrorUrl(SAMPLE_ERROR);
    expect(url).toMatch(/^\//);
  });

  it("should use custom base URL", () => {
    const url = buildErrorUrl(SAMPLE_ERROR, "/login");
    expect(url).toMatch(/^\/login\?/);
  });

  it("should URL-encode the user message", () => {
    const url = buildErrorUrl(USER_ERROR);
    // The message contains apostrophe and period — should be encoded
    expect(url).not.toContain(" ");
  });

  it("should include extra query params", () => {
    const url = buildErrorUrl(SAMPLE_ERROR, "/", {
      redirect: "/dashboard",
      provider: "google",
    });

    const parsed = new URL(url, "https://example.com");
    expect(parsed.searchParams.get("redirect")).toBe("/dashboard");
    expect(parsed.searchParams.get("provider")).toBe("google");
  });

  it("should produce a URL that round-trips through URLSearchParams", () => {
    const url = buildErrorUrl(USER_ERROR, "/auth/callback");
    const parsed = new URL(url, "https://example.com");

    expect(parsed.searchParams.get("error")).toBe(USER_ERROR.userMessage);
    expect(parsed.searchParams.get("error_code")).toBe(USER_ERROR.code);
  });
});

// =============================================================================
// buildErrorJson
// =============================================================================

describe("buildErrorJson", () => {
  it("should return object with error, error_code, and error_description", () => {
    const json = buildErrorJson(SAMPLE_ERROR);

    expect(json).toEqual({
      error: "TEST-001",
      error_code: "TEST-001",
      error_description: "Something went wrong. Please try again.",
    });
  });

  it("should set error and error_code to the same code value", () => {
    const json = buildErrorJson(ADMIN_ERROR);

    expect(json.error).toBe(json.error_code);
    expect(json.error).toBe("TEST-040");
  });

  it("should use userMessage for error_description (not adminMessage)", () => {
    const json = buildErrorJson(ADMIN_ERROR);

    expect(json.error_description).toBe(ADMIN_ERROR.userMessage);
    expect(json.error_description).not.toContain("OAuth");
  });
});

// =============================================================================
// throwGroveError
// =============================================================================

describe("throwGroveError", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw an error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      throwGroveError(500, SAMPLE_ERROR, "TestPkg");
    }).toThrow();
  });

  it("should log before throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      throwGroveError(500, SAMPLE_ERROR, "TestPkg");
    } catch {
      // expected
    }

    expect(spy).toHaveBeenCalledOnce();
    const [message] = spy.mock.calls[0];
    expect(message).toContain("[TestPkg]");
    expect(message).toContain("TEST-001");
  });

  it("should throw HttpError with message, code, and category in body", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      throwGroveError(403, ADMIN_ERROR, "Engine");
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      // SvelteKit's error() throws an HttpError with status and body
      expect(err.status).toBe(403);
      expect(err.body.message).toBe(ADMIN_ERROR.userMessage);
      expect(err.body.code).toBe("TEST-040");
      expect(err.body.category).toBe("admin");
    }
  });

  it("should pass context through to the log", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      throwGroveError(500, SAMPLE_ERROR, "Engine", {
        path: "/api/posts",
        cause: new Error("network timeout"),
      });
    } catch {
      // expected
    }

    const parsed = JSON.parse(spy.mock.calls[0][1] as string);
    expect(parsed.path).toBe("/api/posts");
    expect(parsed.cause).toBe("network timeout");
  });
});
