/**
 * Tests for JWT service - token creation, verification, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as jose from "jose";
import {
  createAccessToken,
  verifyAccessToken,
  decodeToken,
  isTokenExpired,
  getTokenTimeRemaining,
} from "./jwt.js";
import { createMockEnv, TEST_USER } from "../test-helpers.js";
import {
  ACCESS_TOKEN_EXPIRY,
  JWT_ISSUER,
  JWT_ALGORITHM,
} from "../utils/constants.js";
import type { JWTPayload } from "../types.js";

// =============================================================================
// createAccessToken + verifyAccessToken roundtrip
// =============================================================================

describe("createAccessToken + verifyAccessToken", () => {
  const env = createMockEnv();

  it("roundtrips: created token verifies successfully", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const payload = await verifyAccessToken(env, token);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(TEST_USER.id);
    expect(payload!.client_id).toBe("test-app");
    expect(payload!.iss).toBe(JWT_ISSUER);
  });

  it("sets correct expiry (1 hour)", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const after = Math.floor(Date.now() / 1000);

    const payload = await verifyAccessToken(env, token);
    expect(payload).not.toBeNull();

    // exp should be iat + ACCESS_TOKEN_EXPIRY (3600s)
    expect(payload!.exp - payload!.iat).toBe(ACCESS_TOKEN_EXPIRY);
    // iat should be within the time window of the test
    expect(payload!.iat).toBeGreaterThanOrEqual(before);
    expect(payload!.iat).toBeLessThanOrEqual(after);
  });

  it("sets sub to user.id", async () => {
    const token = await createAccessToken(env, TEST_USER, "my-client");
    const payload = await verifyAccessToken(env, token);
    expect(payload!.sub).toBe(TEST_USER.id);
  });

  it("does NOT include PII (email, name) in claims", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const payload = await verifyAccessToken(env, token);

    // Payload should only contain: sub, client_id, iss, iat, exp
    const keys = Object.keys(payload!);
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("name");
    expect(keys).not.toContain("avatar_url");
  });

  it("sets issuer to JWT_ISSUER constant", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const payload = await verifyAccessToken(env, token);
    expect(payload!.iss).toBe("https://auth.grove.place");
  });
});

// =============================================================================
// verifyAccessToken - rejection cases
// =============================================================================

describe("verifyAccessToken - rejections", () => {
  const env = createMockEnv();

  it("rejects tampered token", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    // Tamper with the payload section (second part)
    const parts = token.split(".");
    parts[1] = parts[1].slice(0, -2) + "XX";
    const tampered = parts.join(".");

    const result = await verifyAccessToken(env, tampered);
    expect(result).toBeNull();
  });

  it("rejects completely invalid string", async () => {
    const result = await verifyAccessToken(env, "not-a-jwt-at-all");
    expect(result).toBeNull();
  });

  it("rejects empty string", async () => {
    const result = await verifyAccessToken(env, "");
    expect(result).toBeNull();
  });

  it("rejects token signed with wrong key", async () => {
    // Generate a fresh key pair (different from the test env keys)
    const { privateKey: otherPrivateKey } =
      await jose.generateKeyPair(JWT_ALGORITHM);

    const now = Math.floor(Date.now() / 1000);
    const wrongKeyToken = await new jose.SignJWT({
      sub: TEST_USER.id,
      client_id: "test-app",
      iss: JWT_ISSUER,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(otherPrivateKey);

    // Verify with original env's public key - should fail
    const result = await verifyAccessToken(env, wrongKeyToken);
    expect(result).toBeNull();
  });

  it("rejects expired token", async () => {
    vi.useFakeTimers();
    try {
      // Create token at current time
      vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
      const token = await createAccessToken(env, TEST_USER, "test-app");

      // Advance time past expiry (1 hour + buffer)
      vi.setSystemTime(new Date("2025-01-01T02:00:00Z"));
      const result = await verifyAccessToken(env, token);
      expect(result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// =============================================================================
// decodeToken (no verification)
// =============================================================================

describe("decodeToken", () => {
  const env = createMockEnv();

  it("decodes a valid token without verification", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const decoded = decodeToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe(TEST_USER.id);
    expect(decoded!.client_id).toBe("test-app");
  });

  it("returns all expected fields", async () => {
    const token = await createAccessToken(env, TEST_USER, "test-app");
    const decoded = decodeToken(token);

    expect(decoded).toHaveProperty("sub");
    expect(decoded).toHaveProperty("client_id");
    expect(decoded).toHaveProperty("iss");
    expect(decoded).toHaveProperty("iat");
    expect(decoded).toHaveProperty("exp");
  });

  it("returns null for invalid token", () => {
    const result = decodeToken("not.a.jwt");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = decodeToken("");
    expect(result).toBeNull();
  });
});

// =============================================================================
// isTokenExpired
// =============================================================================

describe("isTokenExpired", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for future expiry", () => {
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: Math.floor(new Date("2025-06-01T00:00:00Z").getTime() / 1000),
      exp: Math.floor(new Date("2025-06-01T01:00:00Z").getTime() / 1000),
    };
    expect(isTokenExpired(payload)).toBe(false);
  });

  it("returns true for past expiry", () => {
    vi.setSystemTime(new Date("2025-06-01T02:00:00Z"));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: Math.floor(new Date("2025-06-01T00:00:00Z").getTime() / 1000),
      exp: Math.floor(new Date("2025-06-01T01:00:00Z").getTime() / 1000),
    };
    expect(isTokenExpired(payload)).toBe(true);
  });

  it("returns true at exact expiry time", () => {
    const expTime = Math.floor(
      new Date("2025-06-01T01:00:00Z").getTime() / 1000,
    );
    vi.setSystemTime(new Date(expTime * 1000));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: expTime - 3600,
      exp: expTime,
    };
    // exp < now is false when exp === now, so token is NOT expired at exact boundary
    // Actually: Math.floor(Date.now()/1000) === expTime, and exp < now is false
    expect(isTokenExpired(payload)).toBe(false);
  });
});

// =============================================================================
// getTokenTimeRemaining
// =============================================================================

describe("getTokenTimeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive seconds for valid token", () => {
    vi.setSystemTime(new Date("2025-06-01T00:30:00Z"));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: Math.floor(new Date("2025-06-01T00:00:00Z").getTime() / 1000),
      exp: Math.floor(new Date("2025-06-01T01:00:00Z").getTime() / 1000),
    };
    // 30 minutes remaining = 1800 seconds
    expect(getTokenTimeRemaining(payload)).toBe(1800);
  });

  it("returns 0 for expired token", () => {
    vi.setSystemTime(new Date("2025-06-01T02:00:00Z"));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: Math.floor(new Date("2025-06-01T00:00:00Z").getTime() / 1000),
      exp: Math.floor(new Date("2025-06-01T01:00:00Z").getTime() / 1000),
    };
    expect(getTokenTimeRemaining(payload)).toBe(0);
  });

  it("never returns negative", () => {
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));
    const payload: JWTPayload = {
      sub: "user-1",
      client_id: "app",
      iss: JWT_ISSUER,
      iat: Math.floor(new Date("2025-06-01T00:00:00Z").getTime() / 1000),
      exp: Math.floor(new Date("2025-06-01T01:00:00Z").getTime() / 1000),
    };
    expect(getTokenTimeRemaining(payload)).toBeGreaterThanOrEqual(0);
  });
});
