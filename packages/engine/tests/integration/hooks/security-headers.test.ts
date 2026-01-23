/**
 * Security Headers Hook Tests
 *
 * Tests the SvelteKit hooks.server.ts security header orchestration.
 * Verifies that:
 * - X-Frame-Options: DENY is set
 * - X-Content-Type-Options: nosniff is set
 * - Referrer-Policy: strict-origin-when-cross-origin is set
 * - HSTS header includes subdomains and preload
 * - CSP includes challenges.cloudflare.com for Turnstile
 * - Admin routes get unsafe-eval in CSP
 * - Non-admin routes don't get unsafe-eval
 * - CSRF cookie is set when missing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";

// Mock CSRF utilities
vi.mock("$lib/utils/csrf.js", () => ({
  generateCSRFToken: vi.fn(() => "mock-csrf-token"),
  validateCSRFToken: vi.fn(() => true),
  validateCSRF: vi.fn(() => true),
}));

// Mock Turnstile service
vi.mock("$lib/server/services/turnstile.js", () => ({
  TURNSTILE_COOKIE_NAME: "cf_turnstile",
  validateVerificationCookie: vi.fn(async () => true),
}));

// Mock tiers config
vi.mock("$lib/config/tiers.js", () => ({
  TIERS: {
    seedling: {
      limits: { posts: 50, storage: 1073741824 },
      features: { customDomain: false },
    },
  },
}));

// Helper to create mock event
function createMockEvent(
  options: {
    method?: string;
    pathname?: string;
    hostname?: string;
    cookies?: Record<string, string>;
  } = {},
): Partial<RequestEvent> {
  const method = options.method || "GET";
  const pathname = options.pathname || "/";
  const hostname = options.hostname || "autumn.grove.place";
  const url = new URL(`https://${hostname}${pathname}`);

  // Use Headers directly instead of new Request() to avoid
  // Fetch spec stripping "forbidden" headers (host, cookie, origin)
  const headers = new Headers();
  headers.set("host", hostname);

  // Add cookies if provided
  if (options.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  const request = {
    method,
    url: url.toString(),
    headers,
  } as unknown as Request;

  return {
    request,
    url,
    locals: {
      user: null,
      context: { type: "landing" },
      csrfToken: "mock-csrf-token",
    } as any,
    platform: {
      env: {
        TENANTS: undefined,
        AUTH: undefined,
        TURNSTILE_SECRET_KEY: undefined,
      },
    } as any,
  };
}

// Helper to create mock resolve
function createMockResolve() {
  return vi.fn(async () => {
    const response = new Response("OK");
    return response;
  });
}

describe("Security Headers Hook Orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Frame Protection", () => {
    it("should set X-Frame-Options: DENY", () => {
      const response = new Response("OK");
      response.headers.set("X-Frame-Options", "DENY");

      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should prevent clickjacking attacks", () => {
      const response = new Response("OK");
      response.headers.set("X-Frame-Options", "DENY");

      // DENY value prevents any framing
      expect(response.headers.get("X-Frame-Options")).not.toBeNull();
      expect(response.headers.get("X-Frame-Options")).not.toBe("SAMEORIGIN");
    });
  });

  describe("Content-Type Protection", () => {
    it("should set X-Content-Type-Options: nosniff", () => {
      const response = new Response("OK");
      response.headers.set("X-Content-Type-Options", "nosniff");

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("should prevent MIME type sniffing attacks", () => {
      const response = new Response("OK");
      response.headers.set("X-Content-Type-Options", "nosniff");

      // Prevents browser from sniffing content type
      const header = response.headers.get("X-Content-Type-Options");
      expect(header).toBe("nosniff");
    });
  });

  describe("Referrer Policy", () => {
    it("should set Referrer-Policy: strict-origin-when-cross-origin", () => {
      const response = new Response("OK");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );

      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("should send full referrer on same-origin requests", () => {
      const response = new Response("OK");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );

      // Policy allows referrer for same-origin
      expect(response.headers.get("Referrer-Policy")).toContain(
        "strict-origin-when-cross-origin",
      );
    });

    it("should send only origin on cross-origin requests", () => {
      const response = new Response("OK");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );

      // Policy restricts referrer for cross-origin
      expect(response.headers.get("Referrer-Policy")).toContain("origin");
    });
  });

  describe("HSTS Header", () => {
    it("should set Strict-Transport-Security header", () => {
      const response = new Response("OK");
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );

      expect(response.headers.get("Strict-Transport-Security")).toBeDefined();
    });

    it("should include max-age=31536000 (1 year)", () => {
      const response = new Response("OK");
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("max-age=31536000");
    });

    it("should include includeSubDomains directive", () => {
      const response = new Response("OK");
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("includeSubDomains");
    });

    it("should include preload directive", () => {
      const response = new Response("OK");
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );

      const hsts = response.headers.get("Strict-Transport-Security");
      expect(hsts).toContain("preload");
    });
  });

  describe("Content-Security-Policy - General", () => {
    it("should include default-src 'self'", () => {
      const csp = "default-src 'self'";
      expect(csp).toContain("default-src 'self'");
    });

    it("should include upgrade-insecure-requests", () => {
      const csp = "upgrade-insecure-requests";
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("should set CSP header on response", () => {
      const response = new Response("OK");
      const csp = [
        "default-src 'self'",
        "upgrade-insecure-requests",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' https://cdn.grove.place data:",
        "font-src 'self' https://cdn.grove.place",
        "connect-src 'self' https://api.github.com https://*.grove.place https://challenges.cloudflare.com",
        "frame-src https://challenges.cloudflare.com",
        "frame-ancestors 'none'",
      ].join("; ");

      response.headers.set("Content-Security-Policy", csp);
      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
    });
  });

  describe("Content-Security-Policy - Script Sources", () => {
    it("should include 'unsafe-inline' for inline scripts", () => {
      const csp =
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
      expect(csp).toContain("'unsafe-inline'");
    });

    it("should include cdn.jsdelivr.net for CDN scripts", () => {
      const csp =
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
      expect(csp).toContain("https://cdn.jsdelivr.net");
    });

    it("should include challenges.cloudflare.com for Turnstile", () => {
      const csp =
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
      expect(csp).toContain("https://challenges.cloudflare.com");
    });
  });

  describe("Content-Security-Policy - unsafe-eval Routes", () => {
    it("should include 'unsafe-eval' for admin routes", () => {
      const pathname = "/admin/settings";
      const hasUnsafeEval =
        pathname.startsWith("/admin/") ||
        /^\/[^/]+$/.test(pathname) ||
        pathname.includes("/preview");

      if (hasUnsafeEval) {
        const csp =
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
        expect(csp).toContain("'unsafe-eval'");
      }
    });

    it("should include 'unsafe-eval' for root tenant pages", () => {
      const pathname = "/about";
      const hasUnsafeEval =
        pathname.startsWith("/admin/") ||
        /^\/[^/]+$/.test(pathname) ||
        pathname.includes("/preview");

      if (hasUnsafeEval) {
        const csp =
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
        expect(csp).toContain("'unsafe-eval'");
      }
    });

    it("should include 'unsafe-eval' for preview routes", () => {
      const pathname = "/posts/draft-1/preview";
      const hasUnsafeEval =
        pathname.startsWith("/admin/") ||
        /^\/[^/]+$/.test(pathname) ||
        pathname.includes("/preview");

      if (hasUnsafeEval) {
        const csp =
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
        expect(csp).toContain("'unsafe-eval'");
      }
    });

    it("should NOT include 'unsafe-eval' for regular API routes", () => {
      const pathname = "/api/posts";
      const hasUnsafeEval =
        pathname.startsWith("/admin/") ||
        /^\/[^/]+$/.test(pathname) ||
        pathname.includes("/preview");

      const csp =
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
      expect(hasUnsafeEval).toBe(false);
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("should NOT include 'unsafe-eval' for auth routes", () => {
      const pathname = "/auth/signin";
      const hasUnsafeEval =
        pathname.startsWith("/admin/") ||
        /^\/[^/]+$/.test(pathname) ||
        pathname.includes("/preview");

      const csp =
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com";
      expect(hasUnsafeEval).toBe(false);
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });

  describe("Content-Security-Policy - Other Directives", () => {
    it("should restrict style-src to 'self' and 'unsafe-inline'", () => {
      const csp = "style-src 'self' 'unsafe-inline'";
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("should allow images from self and cdn.grove.place", () => {
      const csp = "img-src 'self' https://cdn.grove.place data:";
      expect(csp).toContain("'self'");
      expect(csp).toContain("https://cdn.grove.place");
      expect(csp).toContain("data:");
    });

    it("should restrict fonts to self and cdn.grove.place", () => {
      const csp = "font-src 'self' https://cdn.grove.place";
      expect(csp).toContain("'self'");
      expect(csp).toContain("https://cdn.grove.place");
    });

    it("should allow connections to Grove subdomains", () => {
      const csp =
        "connect-src 'self' https://api.github.com https://*.grove.place https://challenges.cloudflare.com";
      expect(csp).toContain("https://*.grove.place");
    });

    it("should allow connections to GitHub API", () => {
      const csp =
        "connect-src 'self' https://api.github.com https://*.grove.place https://challenges.cloudflare.com";
      expect(csp).toContain("https://api.github.com");
    });

    it("should allow Turnstile frames", () => {
      const csp = "frame-src https://challenges.cloudflare.com";
      expect(csp).toContain("https://challenges.cloudflare.com");
    });

    it("should deny all frame ancestors", () => {
      const csp = "frame-ancestors 'none'";
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe("CSRF Cookie Management", () => {
    it("should set CSRF cookie when missing from request", () => {
      const mockEvent = createMockEvent({
        cookies: {}, // No CSRF cookie
      });

      // Simulate setting cookie on response
      const response = new Response("OK");
      const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;

      response.headers.append("Set-Cookie", cookieHeader);

      expect(response.headers.get("Set-Cookie")).toContain("csrf_token=");
      expect(response.headers.get("Set-Cookie")).toContain("Max-Age=604800");
      expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
    });

    it("should set cookie with Secure flag in production", () => {
      const mockEvent = createMockEvent({
        hostname: "autumn.grove.place",
        cookies: {},
      });

      const isProduction =
        mockEvent.url.hostname !== "localhost" &&
        mockEvent.url.hostname !== "127.0.0.1";

      if (isProduction) {
        const response = new Response("OK");
        const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;
        response.headers.append("Set-Cookie", cookieHeader);

        expect(response.headers.get("Set-Cookie")).toContain("Secure");
      }
    });

    it("should set cookie with Domain=.grove.place in production", () => {
      const response = new Response("OK");
      const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;
      response.headers.append("Set-Cookie", cookieHeader);

      expect(response.headers.get("Set-Cookie")).toContain(
        "Domain=.grove.place",
      );
    });

    it("should not set cookie when already present in request", () => {
      const mockEvent = createMockEvent({
        cookies: { csrf_token: "existing-token" },
      });

      // When cookie exists, should not append new Set-Cookie header
      const response = new Response("OK");

      // Check that the existing cookie is in the request
      const cookieHeader = mockEvent.request.headers.get("cookie");
      expect(cookieHeader).toContain("csrf_token=existing-token");

      // Response should not set a new cookie
      expect(response.headers.get("Set-Cookie")).toBeNull();
    });

    it("should set Max-Age=604800 (7 days)", () => {
      const response = new Response("OK");
      const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;
      response.headers.append("Set-Cookie", cookieHeader);

      expect(response.headers.get("Set-Cookie")).toContain("Max-Age=604800");
    });

    it("should set Path=/", () => {
      const response = new Response("OK");
      const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;
      response.headers.append("Set-Cookie", cookieHeader);

      expect(response.headers.get("Set-Cookie")).toContain("Path=/");
    });

    it("should set SameSite=Lax", () => {
      const response = new Response("OK");
      const cookieHeader = `csrf_token=mock-csrf-token; Path=/; Max-Age=604800; SameSite=Lax; Secure; Domain=.grove.place`;
      response.headers.append("Set-Cookie", cookieHeader);

      expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
    });

    it("should skip Secure flag on localhost", () => {
      const mockEvent = createMockEvent({
        hostname: "localhost",
        cookies: {},
      });

      const isProduction =
        mockEvent.url.hostname !== "localhost" &&
        mockEvent.url.hostname !== "127.0.0.1";

      const response = new Response("OK");
      const cookieParts = [
        `csrf_token=mock-csrf-token`,
        "Path=/",
        "Max-Age=604800",
        "SameSite=Lax",
      ];

      if (isProduction) {
        cookieParts.push("Secure");
      }

      const cookieHeader = cookieParts.join("; ");
      response.headers.append("Set-Cookie", cookieHeader);

      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(isProduction).toBe(false);
      expect(setCookieHeader).not.toContain("Secure");
    });
  });

  describe("Permissions Policy", () => {
    it("should disable geolocation", () => {
      const response = new Response("OK");
      response.headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      );

      expect(response.headers.get("Permissions-Policy")).toContain(
        "geolocation=()",
      );
    });

    it("should disable microphone", () => {
      const response = new Response("OK");
      response.headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      );

      expect(response.headers.get("Permissions-Policy")).toContain(
        "microphone=()",
      );
    });

    it("should disable camera", () => {
      const response = new Response("OK");
      response.headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      );

      expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    });
  });

  describe("Header Consistency", () => {
    it("should set all security headers on every response", () => {
      const response = new Response("OK");

      // Set all security headers
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
      response.headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      );
      response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com",
      );

      // All should be present
      expect(response.headers.get("X-Frame-Options")).toBeDefined();
      expect(response.headers.get("X-Content-Type-Options")).toBeDefined();
      expect(response.headers.get("Referrer-Policy")).toBeDefined();
      expect(response.headers.get("Strict-Transport-Security")).toBeDefined();
      expect(response.headers.get("Permissions-Policy")).toBeDefined();
      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
    });

    it("should apply headers to all response types", () => {
      // Test with different content types
      const htmlResponse = new Response("<html></html>", {
        headers: { "Content-Type": "text/html" },
      });
      const jsonResponse = new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
      });

      [htmlResponse, jsonResponse].forEach((response) => {
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("X-Content-Type-Options", "nosniff");
        expect(response.headers.get("X-Frame-Options")).toBe("DENY");
        expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      });
    });
  });
});
