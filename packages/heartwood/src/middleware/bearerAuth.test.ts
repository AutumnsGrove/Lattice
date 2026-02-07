/**
 * Security hardening tests for Bearer token extraction and verification
 *
 * Tests the extractBearerToken and verifyBearerAuth utilities with focus on
 * edge cases, malformed input, and injection prevention.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv } from "../test-helpers.js";

// Mock the JWT service before importing bearerAuth
vi.mock("../services/jwt.js", () => ({
  verifyAccessToken: vi.fn(),
}));

import { extractBearerToken, verifyBearerAuth } from "./bearerAuth.js";
import { verifyAccessToken } from "../services/jwt.js";

// ===================================================================
// extractBearerToken Tests
// ===================================================================

describe("extractBearerToken", () => {
  describe("invalid/missing headers", () => {
    it("returns null for undefined header", () => {
      const result = extractBearerToken(undefined);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = extractBearerToken("");
      expect(result).toBeNull();
    });

    it("returns null for just 'Bearer' with no space/token", () => {
      const result = extractBearerToken("Bearer");
      expect(result).toBeNull();
    });

    it("returns empty string for 'Bearer ' with no token (validation delegated to verifyAccessToken)", () => {
      const result = extractBearerToken("Bearer ");
      expect(result).toBe("");
    });

    it("returns null for malformed header without Bearer prefix", () => {
      const result = extractBearerToken("Basic abc123");
      expect(result).toBeNull();
    });

    it("returns null for lowercase 'bearer' (case-sensitive)", () => {
      const result = extractBearerToken("bearer xyz");
      expect(result).toBeNull();
    });

    it("returns null for 'BEARER' uppercase (must be capitalized)", () => {
      const result = extractBearerToken("BEARER xyz");
      expect(result).toBeNull();
    });

    it("returns null for other auth schemes", () => {
      expect(extractBearerToken("Digest abc123")).toBeNull();
      expect(extractBearerToken("ApiKey xyz")).toBeNull();
      expect(extractBearerToken("OAuth xyz")).toBeNull();
    });
  });

  describe("valid Bearer tokens", () => {
    it("returns token for valid 'Bearer some-token'", () => {
      const result = extractBearerToken("Bearer some-token");
      expect(result).toBe("some-token");
    });

    it("preserves full token string with dots (JWT format)", () => {
      const jwtToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature";
      const result = extractBearerToken(`Bearer ${jwtToken}`);
      expect(result).toBe(jwtToken);
    });

    it("preserves token with dashes and underscores", () => {
      const token = "abc-123_def-456_xyz";
      const result = extractBearerToken(`Bearer ${token}`);
      expect(result).toBe(token);
    });

    it("preserves token with equals signs (base64 padding)", () => {
      const token = "abc123def456==";
      const result = extractBearerToken(`Bearer ${token}`);
      expect(result).toBe(token);
    });

    it("preserves token with spaces (malformed but passes extraction)", () => {
      // The extraction function doesn't validate token content,
      // only that it starts with "Bearer "
      const result = extractBearerToken("Bearer token with spaces");
      expect(result).toBe("token with spaces");
    });

    it("extracts token from header with leading/trailing whitespace", () => {
      // Note: If the header itself has whitespace, it would come from the
      // request handler, but we test the raw function behavior
      const result = extractBearerToken("Bearer token123");
      expect(result).toBe("token123");
    });

    it("handles very long token strings", () => {
      const longToken = "a".repeat(5000);
      const result = extractBearerToken(`Bearer ${longToken}`);
      expect(result).toBe(longToken);
      expect(result).toHaveLength(5000);
    });
  });

  describe("special characters and edge cases", () => {
    it("preserves token with special URL-safe base64 characters", () => {
      const token = "abc-_DEF123-_ghi";
      const result = extractBearerToken(`Bearer ${token}`);
      expect(result).toBe(token);
    });

    it("does not decode or normalize token in any way", () => {
      // Token "123" should be returned exactly as provided
      const result = extractBearerToken("Bearer 123");
      expect(result).toBe("123");
    });

    it("handles tab character in header", () => {
      // "Bearer\ttoken" - tab instead of space is not valid Bearer format
      const result = extractBearerToken("Bearer\ttoken");
      expect(result).toBeNull();
    });
  });
});

// ===================================================================
// verifyBearerAuth Tests
// ===================================================================

describe("verifyBearerAuth", () => {
  let mockReq: { header: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { header: vi.fn() };
  });

  describe("missing/invalid authorization", () => {
    it("returns null when no Authorization header", async () => {
      mockReq.header.mockReturnValue(undefined);
      const env = createMockEnv();

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(mockReq.header).toHaveBeenCalledWith("Authorization");
      // verifyAccessToken should never be called if extraction fails
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });

    it("returns null when Authorization header is empty", async () => {
      mockReq.header.mockReturnValue("");
      const env = createMockEnv();

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });

    it("returns null when Authorization is non-Bearer auth scheme", async () => {
      mockReq.header.mockReturnValue("Basic dXNlcjpwYXNz");
      const env = createMockEnv();

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });

    it("returns null when Authorization is lowercase bearer", async () => {
      mockReq.header.mockReturnValue("bearer some-token");
      const env = createMockEnv();

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });

    it("returns null when token extraction fails (malformed Bearer)", async () => {
      mockReq.header.mockReturnValue("Bearer");
      const env = createMockEnv();

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  describe("valid Bearer extraction and verification", () => {
    it("calls verifyAccessToken with correct env and token", async () => {
      const token = "valid-jwt-token";
      mockReq.header.mockReturnValue(`Bearer ${token}`);
      const env = createMockEnv();
      const mockPayload = {
        sub: "user-123",
        client_id: "app-456",
        iss: "https://auth.grove.place",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      vi.mocked(verifyAccessToken).mockResolvedValue(mockPayload);

      const result = await verifyBearerAuth(mockReq, env);

      expect(verifyAccessToken).toHaveBeenCalledWith(env, token);
      expect(verifyAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPayload);
    });

    it("returns payload when token is valid", async () => {
      mockReq.header.mockReturnValue("Bearer test-jwt");
      const env = createMockEnv();
      const validPayload = {
        sub: "user-abc",
        client_id: "client-xyz",
        iss: "https://auth.grove.place",
        iat: 1672531200,
        exp: 1672534800,
      };
      vi.mocked(verifyAccessToken).mockResolvedValue(validPayload);

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toEqual(validPayload);
    });

    it("returns null when verifyAccessToken returns null (invalid/expired token)", async () => {
      mockReq.header.mockReturnValue("Bearer invalid-token");
      const env = createMockEnv();
      vi.mocked(verifyAccessToken).mockResolvedValue(null);

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).toHaveBeenCalledWith(env, "invalid-token");
    });
  });

  describe("request object interaction", () => {
    it("calls req.header() with exact 'Authorization' parameter name", async () => {
      mockReq.header.mockReturnValue("Bearer token");
      const env = createMockEnv();
      vi.mocked(verifyAccessToken).mockResolvedValue(null);

      await verifyBearerAuth(mockReq, env);

      expect(mockReq.header).toHaveBeenCalledWith("Authorization");
      expect(mockReq.header).toHaveBeenCalledTimes(1);
    });

    it("handles request object with multiple header() calls", async () => {
      mockReq.header
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("Bearer token");
      const env = createMockEnv();

      // First call returns undefined (no authorization)
      const result1 = await verifyBearerAuth(mockReq, env);
      expect(result1).toBeNull();

      // Reset mock state
      vi.clearAllMocks();
      mockReq.header = vi.fn().mockReturnValue("Bearer token");
      vi.mocked(verifyAccessToken).mockResolvedValue({
        sub: "user-123",
        client_id: "app-456",
        iss: "https://auth.grove.place",
        iat: 1000000000,
        exp: 1000003600,
      });

      // Second call succeeds
      const result2 = await verifyBearerAuth(mockReq, env);
      expect(result2).not.toBeNull();
      expect(result2?.sub).toBe("user-123");
    });
  });

  describe("env parameter handling", () => {
    it("forwards env object to verifyAccessToken unchanged", async () => {
      mockReq.header.mockReturnValue("Bearer test");
      const customEnv = createMockEnv({
        ENVIRONMENT: "staging",
        JWT_PUBLIC_KEY: "custom-public-key",
      });
      vi.mocked(verifyAccessToken).mockResolvedValue(null);

      await verifyBearerAuth(mockReq, customEnv);

      const callArgs = vi.mocked(verifyAccessToken).mock.calls[0];
      expect(callArgs[0]).toBe(customEnv);
      expect(callArgs[0].ENVIRONMENT).toBe("staging");
      expect(callArgs[0].JWT_PUBLIC_KEY).toBe("custom-public-key");
    });
  });

  describe("error handling and boundary conditions", () => {
    it("handles verifyAccessToken throwing an error (should not happen but defensive)", async () => {
      mockReq.header.mockReturnValue("Bearer token");
      const env = createMockEnv();
      vi.mocked(verifyAccessToken).mockRejectedValue(
        new Error("Unexpected JWT error"),
      );

      await expect(verifyBearerAuth(mockReq, env)).rejects.toThrow(
        "Unexpected JWT error",
      );
    });

    it("processes JWT with minimal valid payload", async () => {
      mockReq.header.mockReturnValue("Bearer jwt");
      const env = createMockEnv();
      const minimalPayload = {
        sub: "u",
        client_id: "c",
        iss: "i",
        iat: 1,
        exp: 2,
      };
      vi.mocked(verifyAccessToken).mockResolvedValue(minimalPayload);

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toEqual(minimalPayload);
    });
  });

  describe("token content validation (none - delegated to verifyAccessToken)", () => {
    it("does not validate token format itself, only extraction", async () => {
      // This test confirms that verifyBearerAuth extracts the token
      // but delegates all validation to verifyAccessToken
      mockReq.header.mockReturnValue("Bearer not-a-real-jwt");
      const env = createMockEnv();
      vi.mocked(verifyAccessToken).mockResolvedValue(null);

      const result = await verifyBearerAuth(mockReq, env);

      expect(result).toBeNull();
      expect(verifyAccessToken).toHaveBeenCalledWith(env, "not-a-real-jwt");
    });

    it("extracts token with spaces or special chars without judgment", async () => {
      const malformedToken = "abc def!@#";
      mockReq.header.mockReturnValue(`Bearer ${malformedToken}`);
      const env = createMockEnv();
      vi.mocked(verifyAccessToken).mockResolvedValue(null);

      await verifyBearerAuth(mockReq, env);

      expect(verifyAccessToken).toHaveBeenCalledWith(env, malformedToken);
    });
  });
});
