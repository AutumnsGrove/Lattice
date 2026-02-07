/**
 * Integration tests for settings routes
 * Tests GET /settings - renders HTML with/without session
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock auth
vi.mock("../auth/index.js", () => ({
  createAuth: vi.fn(),
}));

// Mock template
vi.mock("../templates/settings.js", () => ({
  getSettingsPageHTML: vi.fn().mockReturnValue("<html>Settings</html>"),
}));

import settingsRoutes from "./settings.js";
import { createAuth } from "../auth/index.js";
import { getSettingsPageHTML } from "../templates/settings.js";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/settings", settingsRoutes);
  return app;
}

const mockEnv = createMockEnv();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /settings", () => {
  it("renders login prompt when no session", async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const app = createApp();
    const res = await app.request("/settings", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(vi.mocked(getSettingsPageHTML)).toHaveBeenCalledWith(
      expect.objectContaining({
        authBaseUrl: "https://auth.grove.place",
      }),
    );
    // Should NOT have user property when no session
    const callArg = vi.mocked(getSettingsPageHTML).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("user");
  });

  it("renders settings page with user info when authenticated", async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: "user-1",
            name: "Test User",
            email: "test@grove.place",
            image: "https://example.com/avatar.jpg",
          },
        }),
      },
    } as any);

    const app = createApp();
    const res = await app.request("/settings", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    expect(vi.mocked(getSettingsPageHTML)).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
          email: "test@grove.place",
        }),
      }),
    );
  });

  it("handles null name and image gracefully", async () => {
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: "user-1",
            name: null,
            email: "test@grove.place",
            image: null,
          },
        }),
      },
    } as any);

    const app = createApp();
    const res = await app.request("/settings", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const callArg = vi.mocked(getSettingsPageHTML).mock.calls[0][0];
    expect(callArg.user?.name).toBeNull();
    expect(callArg.user?.image).toBeNull();
  });
});
