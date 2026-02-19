/**
 * Integration tests for session routes
 * Tests validate, revoke, revoke-all, list, delete, check, validate-service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER } from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
  getSessionByTokenHash: vi.fn(),
  getUserById: vi.fn(),
  getClientByClientId: vi.fn(),
  getUserClientPreference: vi.fn(),
  isEmailAdmin: vi.fn().mockReturnValue(false),
  checkRateLimit: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
  createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../middleware/rateLimit.js")>();
  return {
    ...actual,
    checkRouteRateLimit: vi
      .fn()
      .mockResolvedValue({ allowed: true, remaining: 10 }),
  };
});

// Mock JWT verification
vi.mock("../services/jwt.js", () => ({
  verifyAccessToken: vi.fn(),
}));

// Mock session helpers
vi.mock("../lib/session.js", () => ({
  getSessionFromRequest: vi.fn(),
  clearSessionCookieHeader: vi
    .fn()
    .mockReturnValue(
      "grove_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=.grove.place; Max-Age=0",
    ),
  parseSessionCookie: vi.fn(),
}));

// Mock Better Auth session functions
vi.mock("../lib/server/session.js", () => ({
  validateSession: vi.fn(),
  invalidateSession: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
}));

// Mock crypto
vi.mock("../utils/crypto.js", () => ({
  hashSecret: vi.fn().mockResolvedValue("mock-hash"),
  timingSafeEqual: vi.fn(),
}));

import sessionRoutes from "./session.js";
import { getUserById } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { getSessionFromRequest, parseSessionCookie } from "../lib/session.js";
import {
  validateSession as validateBetterAuthSession,
  invalidateSession as invalidateBetterAuthSession,
  invalidateAllUserSessions as invalidateAllBetterAuthSessions,
} from "../lib/server/session.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { timingSafeEqual } from "../utils/crypto.js";

// SessionDO mock
function createMockSessionDO(
  overrides: {
    validateSession?: (
      id: string,
    ) => Promise<{ valid: boolean; session?: unknown }>;
    revokeSession?: (id: string) => Promise<boolean>;
    revokeAllSessions?: (keepId?: string) => Promise<number>;
    listSessions?: () => Promise<unknown[]>;
  } = {},
) {
  return {
    validateSession:
      overrides.validateSession ??
      vi.fn().mockResolvedValue({
        valid: true,
        session: { deviceName: "Chrome", lastActiveAt: Date.now() },
      }),
    revokeSession: overrides.revokeSession ?? vi.fn().mockResolvedValue(true),
    revokeAllSessions:
      overrides.revokeAllSessions ?? vi.fn().mockResolvedValue(3),
    listSessions:
      overrides.listSessions ??
      vi.fn().mockResolvedValue([
        {
          id: "sess-1",
          deviceName: "Chrome",
          lastActiveAt: Date.now(),
          createdAt: Date.now(),
        },
        {
          id: "sess-2",
          deviceName: "Firefox",
          lastActiveAt: Date.now(),
          createdAt: Date.now(),
        },
      ]),
  };
}

function createMockEnvWithSessions(sessionDO = createMockSessionDO()) {
  return createMockEnv({
    SESSIONS: {
      idFromName: vi.fn().mockReturnValue("do-id-123"),
      get: vi.fn().mockReturnValue(sessionDO),
    } as unknown as DurableObjectNamespace,
  });
}

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/session", sessionRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// POST /session/validate
// =============================================================================

describe("POST /session/validate", () => {
  it("returns valid: false when no session cookie", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();
    const res = await app.request("/session/validate", { method: "POST" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(false);
  });

  it("validates SessionDO session and returns user info", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request("/session/validate", { method: "POST" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(true);
    expect(json.user.id).toBe("user-test-123");
    expect(json.user.email).toBe("test@grove.place");
    expect(json.user.isAdmin).toBe(false);
    expect(json.session.id).toBe("sess-1");
  });

  it("includes isAdmin flag for admin users", async () => {
    const adminUser = { ...TEST_USER, is_admin: 1 };
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(getUserById).mockResolvedValue(adminUser as any);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/validate", { method: "POST" }, env);

    const json: any = await res.json();
    expect(json.valid).toBe(true);
    expect(json.user.isAdmin).toBe(true);
  });

  it("falls back to JWT access_token cookie", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(verifyAccessToken).mockResolvedValue({
      sub: "user-test-123",
      client_id: "test",
      iss: "test",
      iat: 0,
      exp: 0,
    });
    vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);
    vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request(
      "/session/validate",
      {
        method: "POST",
        headers: { Cookie: "access_token=valid-jwt-token" },
      },
      env,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(true);
    expect(json.session).toBeNull(); // No DO session for JWT auth
  });

  it("falls back to Better Auth session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(verifyAccessToken).mockResolvedValue(null);
    vi.mocked(validateBetterAuthSession).mockResolvedValue({
      id: "ba-user-1",
      email: "ba@grove.place",
      name: "BA User",
      image: "https://example.com/avatar.jpg",
      isAdmin: false,
      emailVerified: true,
      tenantId: null,
      loginCount: 1,
      banned: false,
      banReason: null,
      banExpires: null,
    });

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/validate", { method: "POST" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(true);
    expect(json.user.id).toBe("ba-user-1");
    expect(json.user.email).toBe("ba@grove.place");
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRouteRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    });

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/validate", { method: "POST" }, env);

    expect(res.status).toBe(429);
    const json: any = await res.json();
    expect(json.error).toBe("rate_limit");

    // Reset for other tests
    vi.mocked(checkRouteRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
  });
});

// =============================================================================
// POST /session/revoke
// =============================================================================

describe("POST /session/revoke", () => {
  it("returns 401 when no session found", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/revoke", { method: "POST" }, env);

    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.success).toBe(false);
  });

  it("revokes SessionDO session and clears cookies", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request("/session/revoke", { method: "POST" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(sessionDO.revokeSession).toHaveBeenCalledWith("sess-1");

    // Check cookies are cleared
    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("grove_session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("also revokes Better Auth session if present", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(invalidateBetterAuthSession).mockResolvedValue(true);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request(
      "/session/revoke",
      {
        method: "POST",
        headers: {
          Cookie: "better-auth.session_token=token123.signature",
        },
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(invalidateBetterAuthSession)).toHaveBeenCalledWith(
      "token123",
      expect.anything(),
    );
  });
});

// =============================================================================
// POST /session/revoke-all
// =============================================================================

describe("POST /session/revoke-all", () => {
  it("returns 401 when no session found", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request(
      "/session/revoke-all",
      { method: "POST" },
      env,
    );

    expect(res.status).toBe(401);
  });

  it("revokes all SessionDO sessions", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request(
      "/session/revoke-all",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.revokedCount).toBe(3);
    // Called without keepCurrent since keepCurrent=false
    expect(sessionDO.revokeAllSessions).toHaveBeenCalledWith(undefined);
  });

  it("respects keepCurrent option", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-current",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(validateBetterAuthSession).mockResolvedValue(null);

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    await app.request(
      "/session/revoke-all",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepCurrent: true }),
      },
      env,
    );

    expect(sessionDO.revokeAllSessions).toHaveBeenCalledWith("sess-current");
  });

  it("also revokes Better Auth sessions", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);
    vi.mocked(validateBetterAuthSession).mockResolvedValue({
      id: "ba-user-1",
      email: "test@grove.place",
      name: "Test",
      image: null,
      isAdmin: false,
      emailVerified: true,
      tenantId: null,
      loginCount: 1,
      banned: false,
      banReason: null,
      banExpires: null,
    });
    vi.mocked(invalidateAllBetterAuthSessions).mockResolvedValue(true);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request(
      "/session/revoke-all",
      { method: "POST" },
      env,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.betterAuthRevoked).toBe(true);
  });
});

// =============================================================================
// GET /session/list
// =============================================================================

describe("GET /session/list", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/list", { method: "GET" }, env);

    expect(res.status).toBe(401);
  });

  it("returns sessions with isCurrent flag", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request("/session/list", { method: "GET" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.sessions).toHaveLength(2);

    const current = json.sessions.find((s: any) => s.id === "sess-1");
    const other = json.sessions.find((s: any) => s.id === "sess-2");
    expect(current.isCurrent).toBe(true);
    expect(other.isCurrent).toBe(false);
  });
});

// =============================================================================
// DELETE /session/:sessionId
// =============================================================================

describe("DELETE /session/:sessionId", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request(
      "/session/some-id",
      { method: "DELETE" },
      env,
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when session to revoke not found", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-current",
      userId: "user-test-123",
      signature: "sig",
    });

    const sessionDO = createMockSessionDO({
      revokeSession: vi.fn().mockResolvedValue(false),
    });
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request(
      "/session/nonexistent-id",
      { method: "DELETE" },
      env,
    );

    expect(res.status).toBe(404);
  });

  it("successfully revokes a specific session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-current",
      userId: "user-test-123",
      signature: "sig",
    });

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);

    const res = await app.request("/session/sess-2", { method: "DELETE" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(sessionDO.revokeSession).toHaveBeenCalledWith("sess-2");
  });
});

// =============================================================================
// POST /session/validate-service
// =============================================================================

describe("POST /session/validate-service", () => {
  it("returns 401 when SERVICE_SECRET is set but auth header is missing", async () => {
    const app = createApp();
    const env = createMockEnvWithSessions();
    env.SERVICE_SECRET = "my-secret";

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: "some-token" }),
      },
      env,
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 when SERVICE_SECRET doesn't match", async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(false);

    const app = createApp();
    const env = createMockEnvWithSessions();
    env.SERVICE_SECRET = "my-secret";

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wrong-secret",
        },
        body: JSON.stringify({ session_token: "some-token" }),
      },
      env,
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when session_token is missing", async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(true);

    const app = createApp();
    const env = createMockEnvWithSessions();
    env.SERVICE_SECRET = "my-secret";

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-secret",
        },
        body: JSON.stringify({}),
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 when session token signature is invalid", async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(true);
    vi.mocked(parseSessionCookie).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();
    env.SERVICE_SECRET = "my-secret";

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-secret",
        },
        body: JSON.stringify({ session_token: "invalid-token" }),
      },
      env,
    );

    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.error).toContain("Invalid session token");
  });

  it("returns valid user info for valid service request", async () => {
    vi.mocked(timingSafeEqual).mockReturnValue(true);
    vi.mocked(parseSessionCookie).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);
    env.SERVICE_SECRET = "my-secret";

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer my-secret",
        },
        body: JSON.stringify({ session_token: "valid-signed-token" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(true);
    expect(json.user.id).toBe("user-test-123");
    expect(json.user.email).toBe("test@grove.place");
  });

  it("works without SERVICE_SECRET (defense-in-depth skipped)", async () => {
    vi.mocked(parseSessionCookie).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

    const sessionDO = createMockSessionDO();
    const app = createApp();
    const env = createMockEnvWithSessions(sessionDO);
    // No SERVICE_SECRET set — endpoint should still work

    const res = await app.request(
      "/session/validate-service",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: "valid-signed-token" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.valid).toBe(true);
  });
});

// =============================================================================
// GET /session/check (legacy endpoint)
// =============================================================================

describe("GET /session/check", () => {
  it("returns authenticated: false when no session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue(null);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/check", { method: "GET" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.authenticated).toBe(false);
  });

  it("returns user info from SessionDO session", async () => {
    vi.mocked(getSessionFromRequest).mockResolvedValue({
      sessionId: "sess-1",
      userId: "user-test-123",
      signature: "sig",
    });
    vi.mocked(getUserById).mockResolvedValue(TEST_USER as any);

    const app = createApp();
    const env = createMockEnvWithSessions();

    const res = await app.request("/session/check", { method: "GET" }, env);

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.authenticated).toBe(true);
    expect(json.user.id).toBe("user-test-123");
  });
});
