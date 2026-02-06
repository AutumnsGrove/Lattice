/**
 * Integration tests for device authorization routes (RFC 8628)
 * Tests device code generation, authorization UI, and approve/deny flows
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER, formBody } from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
  getClientByClientId: vi.fn(),
  createDeviceCode: vi.fn(),
  getDeviceCodeByUserCode: vi.fn(),
  authorizeDeviceCode: vi.fn(),
  denyDeviceCode: vi.fn(),
  isUserCodeUnique: vi.fn(),
  createAuditLog: vi.fn(),
  isEmailAllowed: vi.fn(),
  getUserById: vi.fn(),
  cleanupExpiredDeviceCodes: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
  createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", () => ({
  checkRouteRateLimit: vi
    .fn()
    .mockResolvedValue({ allowed: true, remaining: 10 }),
}));

// Mock session library
vi.mock("../lib/session.js", () => ({
  getSessionFromRequest: vi.fn(),
}));

// Mock security middleware
vi.mock("../middleware/security.js", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
  getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

import deviceRoutes from "./device.js";
import {
  getClientByClientId,
  createDeviceCode,
  getDeviceCodeByUserCode,
  authorizeDeviceCode,
  denyDeviceCode,
  isUserCodeUnique,
  createAuditLog,
  isEmailAllowed,
  getUserById,
} from "../db/queries.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { getSessionFromRequest } from "../lib/session.js";

// Type-safe response interfaces for tests
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface ErrorResponse {
  error: string;
  error_description?: string;
  retry_after?: number;
}

interface SuccessResponse {
  success: boolean;
  message?: string;
}

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/auth", deviceRoutes);
  return app;
}

const mockEnv = createMockEnv();

// Mock execution context for Cloudflare Workers waitUntil
const mockExecutionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
} as unknown as ExecutionContext;

// =============================================================================
// POST /auth/device-code - Device Authorization Request
// =============================================================================

describe("POST /auth/device-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy path mocks
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      client_id: "grove-cli",
      name: "Grove CLI",
    });
    (isUserCodeUnique as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (createDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
  });

  async function makeDeviceCodeRequest(body: Record<string, string>) {
    const app = createApp();
    return app.request(
      "/auth/device-code",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody(body),
      },
      mockEnv,
      mockExecutionCtx,
    );
  }

  async function makeDeviceCodeJsonRequest(body: object) {
    const app = createApp();
    return app.request(
      "/auth/device-code",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      mockEnv,
      mockExecutionCtx,
    );
  }

  describe("validation", () => {
    it("returns 400 for missing client_id", async () => {
      const res = await makeDeviceCodeRequest({});
      expect(res.status).toBe(400);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("invalid_request");
    });

    it("returns 400 for invalid request body", async () => {
      const app = createApp();
      const res = await app.request(
        "/auth/device-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not valid json",
        },
        mockEnv,
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("invalid_request");
    });

    it("returns 401 for unknown client", async () => {
      (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await makeDeviceCodeRequest({ client_id: "unknown-client" });
      expect(res.status).toBe(401);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("invalid_client");
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfter: 30,
      });

      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(429);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("slow_down");
      expect(json.retry_after).toBe(30);
    });
  });

  describe("code generation", () => {
    it("returns device_code and user_code", async () => {
      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(200);
      const json = (await res.json()) as DeviceCodeResponse;
      expect(json.device_code).toBeDefined();
      expect(json.user_code).toBeDefined();
      // User code should be in XXXX-XXXX format
      expect(json.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("returns verification URIs", async () => {
      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(200);
      const json = (await res.json()) as DeviceCodeResponse;
      expect(json.verification_uri).toBe(
        `${mockEnv.AUTH_BASE_URL}/auth/device`,
      );
      expect(json.verification_uri_complete).toContain(
        `${mockEnv.AUTH_BASE_URL}/auth/device?user_code=`,
      );
    });

    it("returns expires_in and interval", async () => {
      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(200);
      const json = (await res.json()) as DeviceCodeResponse;
      expect(json.expires_in).toBeGreaterThan(0);
      expect(json.interval).toBeGreaterThan(0);
    });

    it("generates unique user codes (retry on collision)", async () => {
      // First call returns false (collision), second returns true
      (isUserCodeUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(200);
      expect(isUserCodeUnique).toHaveBeenCalledTimes(2);
    });

    it("returns 500 after max retry attempts", async () => {
      // Always return false (permanent collision)
      (isUserCodeUnique as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(500);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("server_error");
    });

    it("accepts JSON request body", async () => {
      const res = await makeDeviceCodeJsonRequest({
        client_id: "grove-cli",
        scope: "openid email",
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as DeviceCodeResponse;
      expect(json.device_code).toBeDefined();
    });
  });

  describe("audit logging", () => {
    it("creates device_code_created audit event", async () => {
      const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
      expect(res.status).toBe(200);

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          event_type: "device_code_created",
          client_id: "grove-cli",
        }),
      );
    });
  });
});

// =============================================================================
// GET /auth/device - Device Authorization Page
// =============================================================================

describe("GET /auth/device", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mocks to default state
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSessionFromRequest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Mock global fetch for Better Auth session check
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
  });

  async function makeDevicePageRequest(query: string = "") {
    const app = createApp();
    return app.request(
      `/auth/device${query}`,
      { method: "GET" },
      mockEnv,
      mockExecutionCtx,
    );
  }

  describe("unauthenticated user", () => {
    it("redirects to /login with returnTo", async () => {
      const res = await makeDevicePageRequest("?user_code=ABCD-1234");
      expect(res.status).toBe(302);

      const location = res.headers.get("Location");
      expect(location).toContain("/login");
      expect(location).toContain("returnTo=");
    });

    it("preserves user_code in returnTo", async () => {
      const res = await makeDevicePageRequest("?user_code=WXYZ-5678");
      expect(res.status).toBe(302);

      const location = res.headers.get("Location");
      // User code is URL-encoded in the returnTo parameter
      expect(location).toContain("user_code");
      expect(location).toContain("WXYZ-5678");
    });
  });

  describe("authenticated via Better Auth", () => {
    beforeEach(() => {
      // Mock Better Auth session
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
      });
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    });

    it("shows authorization page", async () => {
      const res = await makeDevicePageRequest();
      expect(res.status).toBe(200);
      const html = await res.text();
      // Page title is "Authorize Device - Heartwood"
      expect(html).toContain("Heartwood");
      expect(html).toContain("Authorize Device");
    });

    it("displays user code and client name when valid code provided", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) + 900,
      });
      (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "client-1",
        client_id: "grove-cli",
        name: "Grove CLI",
      });

      const res = await makeDevicePageRequest("?user_code=ABCD-1234");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("ABCD-1234");
      expect(html).toContain("Grove CLI");
    });
  });

  describe("authenticated via legacy session", () => {
    beforeEach(() => {
      // No Better Auth session
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });
      // Legacy session exists
      (getSessionFromRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
        sessionId: "sess-123",
        userId: TEST_USER.id,
        signature: "valid-sig",
      });
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    });

    it("shows authorization page (fallback)", async () => {
      const res = await makeDevicePageRequest();
      expect(res.status).toBe(200);
      const html = await res.text();
      // Page title is "Authorize Device - Heartwood"
      expect(html).toContain("Heartwood");
      expect(html).toContain("Authorize Device");
    });
  });

  describe("device code validation", () => {
    beforeEach(() => {
      // User is authenticated
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
      });
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    });

    it("shows error for invalid user code", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const res = await makeDevicePageRequest("?user_code=INVALID");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("Invalid or expired");
    });

    it("shows error for expired code", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
      });

      const res = await makeDevicePageRequest("?user_code=ABCD-1234");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("expired");
    });

    it("shows error for already used code", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "authorized", // Already used
        expires_at: Math.floor(Date.now() / 1000) + 900,
      });

      const res = await makeDevicePageRequest("?user_code=ABCD-1234");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("already been");
    });
  });

  describe("success states", () => {
    beforeEach(() => {
      // User must be authenticated to see success states
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
      });
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    });

    it("shows approved message when success=approved", async () => {
      const res = await makeDevicePageRequest("?success=approved");
      expect(res.status).toBe(200);
      const html = await res.text();
      // Template shows "Device Authorized" in the success box
      expect(html).toContain("Device Authorized");
    });

    it("shows denied message when success=denied", async () => {
      const res = await makeDevicePageRequest("?success=denied");
      expect(res.status).toBe(200);
      const html = await res.text();
      // Template shows "Authorization Denied" in the success box
      expect(html).toContain("Authorization Denied");
    });
  });
});

// =============================================================================
// POST /auth/device/authorize - Authorize or Deny Device Code
// =============================================================================

describe("POST /auth/device/authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no authentication
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    (getSessionFromRequest as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  async function makeAuthorizeRequest(
    body: Record<string, string>,
    asJson = false,
  ) {
    const app = createApp();
    if (asJson) {
      return app.request(
        "/auth/device/authorize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        mockEnv,
        mockExecutionCtx,
      );
    }
    return app.request(
      "/auth/device/authorize",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody(body),
      },
      mockEnv,
      mockExecutionCtx,
    );
  }

  function setupAuthenticatedUser() {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
    });
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  }

  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "approve" },
        true,
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("unauthorized");
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      setupAuthenticatedUser();
    });

    it("returns 400 for missing user_code", async () => {
      const res = await makeAuthorizeRequest({ action: "approve" }, true);
      expect(res.status).toBe(400);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("invalid_request");
    });

    it("returns 400 for invalid action", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "invalid" },
        true,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid/expired code", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const res = await makeAuthorizeRequest(
        { user_code: "INVALID", action: "approve" },
        true,
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("invalid_grant");
    });

    it("returns 403 if user not in allowlist", async () => {
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) + 900,
      });
      (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "approve" },
        true,
      );
      expect(res.status).toBe(403);
      const json = (await res.json()) as ErrorResponse;
      expect(json.error).toBe("access_denied");
    });
  });

  describe("approve action", () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) + 900,
      });
      (authorizeDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it("authorizes device code", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "approve" },
        true,
      );
      expect(res.status).toBe(200);
      expect(authorizeDeviceCode).toHaveBeenCalledWith(
        expect.anything(),
        "dc-1",
        TEST_USER.id,
      );
    });

    it("creates audit log event", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "approve" },
        true,
      );
      expect(res.status).toBe(200);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          event_type: "device_code_authorized",
          user_id: TEST_USER.id,
        }),
      );
    });

    it("redirects to success page (form submission)", async () => {
      const res = await makeAuthorizeRequest({
        user_code: "ABCD-1234",
        action: "approve",
      });
      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("success=approved");
    });

    it("returns JSON success (API call)", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "approve" },
        true,
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as SuccessResponse;
      expect(json.success).toBe(true);
    });
  });

  describe("deny action", () => {
    beforeEach(() => {
      setupAuthenticatedUser();
      (getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "dc-1",
        client_id: "grove-cli",
        user_code: "ABCD-1234",
        status: "pending",
        expires_at: Math.floor(Date.now() / 1000) + 900,
      });
      (denyDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it("denies device code", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "deny" },
        true,
      );
      expect(res.status).toBe(200);
      expect(denyDeviceCode).toHaveBeenCalledWith(expect.anything(), "dc-1");
    });

    it("creates audit log event", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "deny" },
        true,
      );
      expect(res.status).toBe(200);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          event_type: "device_code_denied",
          user_id: TEST_USER.id,
        }),
      );
    });

    it("redirects to denied page (form submission)", async () => {
      const res = await makeAuthorizeRequest({
        user_code: "ABCD-1234",
        action: "deny",
      });
      expect(res.status).toBe(302);
      const location = res.headers.get("Location");
      expect(location).toContain("success=denied");
    });

    it("returns JSON success (API call)", async () => {
      const res = await makeAuthorizeRequest(
        { user_code: "ABCD-1234", action: "deny" },
        true,
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as SuccessResponse;
      expect(json.success).toBe(true);
    });
  });
});
