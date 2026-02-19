/**
 * Integration tests for login route
 * Tests redirect behavior to Heartwood frontend
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
  return app.request(
    `/login${query}`,
    { method: "GET", redirect: "manual" },
    mockEnv,
  );
}

const FRONTEND_URL = "https://heartwood.grove.place/login";

// =============================================================================
// Redirect Behavior
// =============================================================================

describe("GET /login - redirect to frontend", () => {
  it("redirects to heartwood frontend", async () => {
    const res = await makeLoginRequest();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(FRONTEND_URL);
  });

  it("preserves returnTo parameter", async () => {
    const returnTo = encodeURIComponent(
      "https://auth.grove.place/auth/device?user_code=ABCD-1234",
    );
    const res = await makeLoginRequest(`?returnTo=${returnTo}`);
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toBe(`${FRONTEND_URL}?returnTo=${returnTo}`);
  });

  it("preserves provider parameter", async () => {
    const res = await makeLoginRequest("?provider=google");
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toBe(`${FRONTEND_URL}?provider=google`);
  });

  it("preserves multiple query parameters", async () => {
    const res = await makeLoginRequest(
      "?provider=google&returnTo=https%3A%2F%2Fexample.com",
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("provider=google");
    expect(location).toContain("returnTo=");
  });

  it("preserves legacy OAuth parameters", async () => {
    const redirectUri = encodeURIComponent("https://app.example.com/callback");
    const res = await makeLoginRequest(
      `?redirect_uri=${redirectUri}&state=xyz`,
    );
    expect(res.status).toBe(302);
    const location = res.headers.get("Location");
    expect(location).toContain("redirect_uri=");
    expect(location).toContain("state=xyz");
  });
});
