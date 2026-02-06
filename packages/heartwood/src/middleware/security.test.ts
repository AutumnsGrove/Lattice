/**
 * Tests for security middleware - headers and IP extraction
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";
import { securityHeaders, getClientIP, getUserAgent } from "./security.js";
import { SECURITY_HEADERS } from "../utils/constants.js";

const mockEnv = createMockEnv();

// =============================================================================
// securityHeaders middleware
// =============================================================================

describe("securityHeaders middleware", () => {
  function createTestApp() {
    const app = new Hono<{ Bindings: Env }>();
    app.use("*", securityHeaders);
    app.get("/test", (c) => c.json({ ok: true }));
    app.get("/error", (c) => c.json({ error: "bad" }, 400));
    return app;
  }

  it("adds all security headers to response", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {}, mockEnv);

    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers.get("Content-Security-Policy")).toBeDefined();
  });

  it("adds headers on error responses too", async () => {
    const app = createTestApp();
    const res = await app.request("/error", {}, mockEnv);

    expect(res.status).toBe(400);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets all headers from SECURITY_HEADERS constant", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {}, mockEnv);

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(key)).toBe(value);
    }
  });

  it("CSP includes expected directives", async () => {
    const app = createTestApp();
    const res = await app.request("/test", {}, mockEnv);

    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
});

// =============================================================================
// getClientIP
// =============================================================================

describe("getClientIP", () => {
  it("extracts CF-Connecting-IP (Cloudflare)", () => {
    const request = new Request("http://localhost", {
      headers: { "CF-Connecting-IP": "203.0.113.50" },
    });
    expect(getClientIP(request)).toBe("203.0.113.50");
  });

  it("falls back to X-Real-IP", () => {
    const request = new Request("http://localhost", {
      headers: { "X-Real-IP": "10.0.0.1" },
    });
    expect(getClientIP(request)).toBe("10.0.0.1");
  });

  it("falls back to X-Forwarded-For (first entry)", () => {
    const request = new Request("http://localhost", {
      headers: { "X-Forwarded-For": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
    });
    expect(getClientIP(request)).toBe("192.168.1.1");
  });

  it("trims whitespace in X-Forwarded-For", () => {
    const request = new Request("http://localhost", {
      headers: { "X-Forwarded-For": "  192.168.1.1  , 10.0.0.1" },
    });
    expect(getClientIP(request)).toBe("192.168.1.1");
  });

  it("prefers CF-Connecting-IP over X-Real-IP", () => {
    const request = new Request("http://localhost", {
      headers: {
        "CF-Connecting-IP": "203.0.113.50",
        "X-Real-IP": "10.0.0.1",
        "X-Forwarded-For": "192.168.1.1",
      },
    });
    expect(getClientIP(request)).toBe("203.0.113.50");
  });

  it("prefers X-Real-IP over X-Forwarded-For", () => {
    const request = new Request("http://localhost", {
      headers: {
        "X-Real-IP": "10.0.0.1",
        "X-Forwarded-For": "192.168.1.1",
      },
    });
    expect(getClientIP(request)).toBe("10.0.0.1");
  });

  it('returns "unknown" when no headers present', () => {
    const request = new Request("http://localhost");
    expect(getClientIP(request)).toBe("unknown");
  });
});

// =============================================================================
// getUserAgent
// =============================================================================

describe("getUserAgent", () => {
  it("extracts User-Agent header", () => {
    const request = new Request("http://localhost", {
      headers: { "User-Agent": "Mozilla/5.0 (Test)" },
    });
    expect(getUserAgent(request)).toBe("Mozilla/5.0 (Test)");
  });

  it('returns "unknown" when header is missing', () => {
    const request = new Request("http://localhost");
    expect(getUserAgent(request)).toBe("unknown");
  });
});
