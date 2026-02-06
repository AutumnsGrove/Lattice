/**
 * Integration tests for login route
 * Tests login page rendering, returnTo parameter handling, and provider redirect
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";
import loginRoutes from "./login.js";

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/login", loginRoutes);
  return app;
}

const mockEnv = createMockEnv();

async function makeLoginRequest(query: string = "") {
  const app = createApp();
  return app.request(`/login${query}`, { method: "GET" }, mockEnv);
}

// =============================================================================
// Page Rendering
// =============================================================================

describe("GET /login - page rendering", () => {
  it("renders login page with provider buttons", async () => {
    const res = await makeLoginRequest();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Sign in to Heartwood");
    expect(html).toContain("Continue with Google");
  });

  it("returns HTML content type", async () => {
    const res = await makeLoginRequest();
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("includes Google sign-in link", async () => {
    const res = await makeLoginRequest();
    const html = await res.text();
    expect(html).toContain("/api/auth/sign-in/social?provider=google");
  });

  it("includes magic link form", async () => {
    const res = await makeLoginRequest();
    const html = await res.text();
    expect(html).toContain("/api/auth/sign-in/magic-link");
    expect(html).toContain('type="email"');
    expect(html).toContain("Send magic link");
  });
});

// =============================================================================
// returnTo Parameter
// =============================================================================

describe("GET /login - returnTo parameter", () => {
  it("preserves returnTo in provider links", async () => {
    const returnTo = "https://auth.grove.place/auth/device?user_code=ABCD-1234";
    const encodedReturnTo = encodeURIComponent(returnTo);
    const res = await makeLoginRequest(`?returnTo=${encodedReturnTo}`);
    const html = await res.text();

    // Provider links should include callbackURL with returnTo
    expect(html).toContain(`callbackURL=${encodeURIComponent(returnTo)}`);
  });

  it("preserves returnTo in magic link form", async () => {
    const returnTo = "https://auth.grove.place/auth/device?user_code=ABCD-1234";
    const res = await makeLoginRequest(
      `?returnTo=${encodeURIComponent(returnTo)}`,
    );
    const html = await res.text();

    // Magic link form should have callbackURL hidden input
    expect(html).toContain('name="callbackURL"');
    expect(html).toContain(returnTo);
  });

  it("URL encodes returnTo properly", async () => {
    const returnTo = "https://example.com/callback?state=xyz&foo=bar";
    const res = await makeLoginRequest(
      `?returnTo=${encodeURIComponent(returnTo)}`,
    );
    const html = await res.text();

    // The callbackURL param should be properly encoded
    expect(html).toContain(encodeURIComponent(returnTo));
  });
});

// =============================================================================
// Legacy OAuth Parameters
// =============================================================================

describe("GET /login - legacy OAuth params", () => {
  it("builds callback from redirect_uri and state", async () => {
    const redirectUri = "https://app.example.com/callback";
    const state = "random-state-123";

    const res = await makeLoginRequest(
      `?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    );
    const html = await res.text();

    // The callback should include both redirect_uri and state
    const expectedCallback = `${redirectUri}?state=${state}`;
    expect(html).toContain(encodeURIComponent(expectedCallback));
  });

  it("prioritizes returnTo over redirect_uri", async () => {
    const returnTo = "https://preferred.example.com/return";
    const redirectUri = "https://legacy.example.com/callback";

    const res = await makeLoginRequest(
      `?returnTo=${encodeURIComponent(returnTo)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    const html = await res.text();

    // returnTo should be used, not redirect_uri
    expect(html).toContain(encodeURIComponent(returnTo));
    expect(html).not.toContain(encodeURIComponent(redirectUri));
  });

  it("handles missing state gracefully", async () => {
    const redirectUri = "https://app.example.com/callback";

    const res = await makeLoginRequest(
      `?redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    expect(res.status).toBe(200);
    const html = await res.text();

    // Should still work, just without state parameter
    expect(html).toContain(encodeURIComponent(redirectUri));
  });
});

// =============================================================================
// Provider Redirect
// =============================================================================

describe("GET /login - provider redirect", () => {
  it("redirects to Google when provider=google", async () => {
    const res = await makeLoginRequest("?provider=google");
    expect(res.status).toBe(302);

    const location = res.headers.get("Location");
    expect(location).toContain("/api/auth/sign-in/social");
    expect(location).toContain("provider=google");
  });

  it("includes callbackURL in redirect", async () => {
    const returnTo = "https://auth.grove.place/auth/device?user_code=TEST-1234";
    const res = await makeLoginRequest(
      `?provider=google&returnTo=${encodeURIComponent(returnTo)}`,
    );
    expect(res.status).toBe(302);

    const location = res.headers.get("Location");
    expect(location).toContain("callbackURL=");
    expect(location).toContain(encodeURIComponent(returnTo));
  });

  it("renders page for invalid provider value", async () => {
    const res = await makeLoginRequest("?provider=invalid");
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Sign in to Heartwood");
  });

  it("renders page when provider not specified", async () => {
    const res = await makeLoginRequest("?returnTo=https://example.com");
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Sign in to Heartwood");
  });
});
