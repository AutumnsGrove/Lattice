/**
 * Integration tests for token routes
 * Tests auth code grant, refresh token grant, device code grant
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER, formBody } from "../test-helpers.js";
import { hashSecret, sha256Base64Url } from "../utils/crypto.js";

// Type-safe response interfaces for tests
interface ErrorResponse {
  error: string;
  error_description?: string;
  retry_after?: number;
  interval?: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface SuccessResponse {
  success: boolean;
}

// Mock database queries
vi.mock("../db/queries.js", () => ({
  getClientByClientId: vi.fn(),
  consumeAuthCode: vi.fn(),
  getUserById: vi.fn(),
  createRefreshToken: vi.fn(),
  getRefreshTokenByHash: vi.fn(),
  revokeRefreshToken: vi.fn(),
  getDeviceCodeByHash: vi.fn(),
  updateDevicePollCount: vi.fn(),
  incrementDeviceInterval: vi.fn(),
  deleteDeviceCode: vi.fn(),
  createAuditLog: vi.fn(),
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

import tokenRoutes from "./token.js";
import {
  getClientByClientId,
  consumeAuthCode,
  getUserById,
  createRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
  getDeviceCodeByHash,
  updateDevicePollCount,
  deleteDeviceCode,
  createAuditLog,
  incrementDeviceInterval,
} from "../db/queries.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/token", tokenRoutes);
  return app;
}

const mockEnv = createMockEnv();

async function makeTokenRequest(body: Record<string, string>) {
  const app = createApp();
  return app.request(
    "/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody(body),
    },
    mockEnv,
  );
}

// =============================================================================
// Unsupported grant type
// =============================================================================

describe("POST /token - unsupported grant type", () => {
  it("returns 400 for unknown grant_type", async () => {
    const res = await makeTokenRequest({
      grant_type: "client_credentials",
      client_id: "x",
      client_secret: "y",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("unsupported_grant_type");
  });

  it("returns 400 when grant_type is missing", async () => {
    const res = await makeTokenRequest({ client_id: "x", client_secret: "y" });
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// Authorization Code Grant
// =============================================================================

describe("POST /token - authorization_code grant", () => {
  const clientSecretPlain = "test-client-secret-value";
  let clientSecretHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    clientSecretHash = await hashSecret(clientSecretPlain);

    // Default mocks for happy path
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      client_id: "test-app",
      client_secret_hash: clientSecretHash,
      redirect_uris: '["https://app.example.com/callback"]',
    });

    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
  });

  it("returns 400 when missing required params", async () => {
    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      // Missing code and redirect_uri
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
  });

  it("returns 401 when client not found", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "nonexistent",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(401);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_client");
  });

  it("returns 401 for wrong client secret", async () => {
    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: "wrong-secret",
    });
    expect(res.status).toBe(401);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_client");
  });

  it("returns 400 when auth code is invalid/consumed", async () => {
    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "consumed-code",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_grant");
  });

  it("returns 400 for redirect_uri mismatch", async () => {
    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "auth-code-123",
      client_id: "test-app",
      user_id: TEST_USER.id,
      redirect_uri: "https://app.example.com/callback",
      code_challenge: "challenge",
      code_challenge_method: "S256",
    });

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://evil.com/steal",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      code_verifier: "verifier",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_grant");
    expect(json.error_description).toContain("Redirect URI mismatch");
  });

  it("returns 400 when PKCE code_challenge is missing", async () => {
    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "auth-code-123",
      client_id: "test-app",
      user_id: TEST_USER.id,
      redirect_uri: "https://app.example.com/callback",
      code_challenge: null,
      code_challenge_method: null,
    });

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      code_verifier: "verifier",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("PKCE");
  });

  it("returns 400 when code_verifier is missing", async () => {
    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "auth-code-123",
      client_id: "test-app",
      user_id: TEST_USER.id,
      redirect_uri: "https://app.example.com/callback",
      code_challenge: "challenge",
      code_challenge_method: "S256",
    });

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      // Missing code_verifier
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("Code verifier required");
  });

  it("returns 400 for PKCE verification failure", async () => {
    const correctVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await sha256Base64Url(correctVerifier);

    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "auth-code-123",
      client_id: "test-app",
      user_id: TEST_USER.id,
      redirect_uri: "https://app.example.com/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      code_verifier: "wrong-verifier",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("PKCE verification failed");
  });

  it("issues tokens on successful exchange", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await sha256Base64Url(verifier);

    (consumeAuthCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      code: "auth-code-123",
      client_id: "test-app",
      user_id: TEST_USER.id,
      redirect_uri: "https://app.example.com/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      code_verifier: verifier,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as TokenResponse;
    expect(json.access_token).toBeDefined();
    expect(json.token_type).toBe("Bearer");
    expect(json.expires_in).toBe(3600);
    expect(json.refresh_token).toBeDefined();
    expect(json.scope).toBe("openid email profile");
  });

  it("returns 429 when rate limited", async () => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 45,
    });

    const res = await makeTokenRequest({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(429);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("rate_limit");
    expect(json.retry_after).toBe(45);
  });
});

// =============================================================================
// Refresh Token Grant
// =============================================================================

describe("POST /token - refresh_token grant", () => {
  const clientSecretPlain = "test-client-secret-value";
  let clientSecretHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    clientSecretHash = await hashSecret(clientSecretPlain);

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      client_id: "test-app",
      client_secret_hash: clientSecretHash,
    });

    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
  });

  it("returns 400 when missing required params", async () => {
    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      // Missing refresh_token
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid client", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "nonexistent",
      client_secret: clientSecretPlain,
      refresh_token: "some-token",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid refresh token", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      refresh_token: "invalid-token",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_grant");
  });

  it("returns 400 for client_id mismatch", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt-1",
      token_hash: "hash",
      user_id: TEST_USER.id,
      client_id: "different-app", // Mismatch!
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked: 0,
    });

    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      refresh_token: "some-token",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("Client mismatch");
  });

  it("returns 400 for expired refresh token", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt-1",
      token_hash: "hash",
      user_id: TEST_USER.id,
      client_id: "test-app",
      expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired
      revoked: 0,
    });

    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      refresh_token: "expired-token",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("expired");
  });

  it("rotates refresh token on success", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt-1",
      token_hash: "hash",
      user_id: TEST_USER.id,
      client_id: "test-app",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked: 0,
    });
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (revokeRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (createRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await makeTokenRequest({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
      refresh_token: "valid-token",
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as TokenResponse;
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();

    // Old token should be revoked
    expect(revokeRefreshToken).toHaveBeenCalled();
    // New token should be created
    expect(createRefreshToken).toHaveBeenCalled();
  });
});

// =============================================================================
// Device Code Grant
// =============================================================================

describe("POST /token - device_code grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      client_id: "cli-app",
    });
  });

  it("returns 400 when missing device_code", async () => {
    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      // Missing device_code
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
  });

  it("returns 401 when client not found", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "nonexistent",
      device_code: "some-code",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid device code", async () => {
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "invalid-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_grant");
  });

  it("returns 400 for client_id mismatch", async () => {
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "other-client",
      status: "pending",
      expires_at: Math.floor(Date.now() / 1000) + 900,
      interval: 5,
      last_poll_at: null,
    });

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "some-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error_description).toContain("Client mismatch");
  });

  it("returns expired_token for expired device code", async () => {
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "cli-app",
      status: "pending",
      expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
      interval: 5,
      last_poll_at: null,
    });

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "expired-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("expired_token");
  });

  it("returns slow_down when polling too fast", async () => {
    const now = Math.floor(Date.now() / 1000);
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "cli-app",
      status: "pending",
      expires_at: now + 900,
      interval: 5,
      last_poll_at: now - 2, // Only 2 seconds ago (< 5 interval)
    });
    (incrementDeviceInterval as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "fast-poll-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("slow_down");
    expect(json.interval).toBe(10); // 5 + 5 increment
  });

  it("returns authorization_pending when user has not acted", async () => {
    const now = Math.floor(Date.now() / 1000);
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "cli-app",
      status: "pending",
      expires_at: now + 900,
      interval: 5,
      last_poll_at: null,
    });
    (updateDevicePollCount as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "pending-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("authorization_pending");
  });

  it("returns access_denied when user denies", async () => {
    const now = Math.floor(Date.now() / 1000);
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "cli-app",
      status: "denied",
      expires_at: now + 900,
      interval: 5,
      last_poll_at: null,
    });
    (updateDevicePollCount as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (deleteDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "denied-code",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("access_denied");
  });

  it("issues tokens when user has authorized", async () => {
    const now = Math.floor(Date.now() / 1000);
    (getDeviceCodeByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "dc-1",
      client_id: "cli-app",
      status: "authorized",
      user_id: TEST_USER.id,
      scope: "openid email",
      expires_at: now + 900,
      interval: 5,
      last_poll_at: null,
      user_code: "ABCD-EFGH",
    });
    (updateDevicePollCount as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await makeTokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: "cli-app",
      device_code: "authorized-code",
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as TokenResponse;
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();
    expect(json.scope).toBe("openid email");
    // Device code should be deleted after use
    expect(deleteDeviceCode).toHaveBeenCalledWith(expect.anything(), "dc-1");
  });
});

// =============================================================================
// POST /token/revoke
// =============================================================================

describe("POST /token/revoke", () => {
  const clientSecretPlain = "test-client-secret-value";
  let clientSecretHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    clientSecretHash = await hashSecret(clientSecretPlain);

    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      client_id: "test-app",
      client_secret_hash: clientSecretHash,
    });
  });

  async function makeRevokeRequest(body: Record<string, string>) {
    const app = createApp();
    return app.request(
      "/token/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody(body),
      },
      mockEnv,
    );
  }

  it("returns 400 when missing params", async () => {
    const res = await makeRevokeRequest({ client_id: "test-app" });
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid client", async () => {
    (getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeRevokeRequest({
      token: "some-token",
      client_id: "nonexistent",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(401);
  });

  it("returns success even if token not found (RFC 7009)", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await makeRevokeRequest({
      token: "nonexistent-token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as SuccessResponse;
    expect(json.success).toBe(true);
  });

  it("revokes existing token", async () => {
    (getRefreshTokenByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rt-1",
      user_id: TEST_USER.id,
      client_id: "test-app",
    });
    (revokeRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await makeRevokeRequest({
      token: "valid-token",
      client_id: "test-app",
      client_secret: clientSecretPlain,
    });
    expect(res.status).toBe(200);
    expect(revokeRefreshToken).toHaveBeenCalled();
  });
});
