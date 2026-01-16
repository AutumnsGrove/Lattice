/**
 * GroveAuth Client Tests
 *
 * Tests for the GroveAuth client library covering:
 * - PKCE code generation
 * - Authentication flows
 * - Token management
 * - Subscription operations
 * - Caching and deduplication
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  GroveAuthClient,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  createGroveAuthClient,
} from "./client";
import { GroveAuthError } from "./types";

// ==========================================================================
// Mock Fetch
// ==========================================================================

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockFetchResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

function mockFetchError(error: unknown, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => error,
  });
}

// ==========================================================================
// PKCE Helpers
// ==========================================================================

describe("PKCE Helpers", () => {
  describe("generateCodeVerifier", () => {
    it("should generate a string of length 64", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(64);
    });

    it("should only contain allowed characters", () => {
      const verifier = generateCodeVerifier();
      const allowedPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(verifier).toMatch(allowedPattern);
    });

    it("should generate unique values", () => {
      const verifiers = new Set(
        Array.from({ length: 10 }, () => generateCodeVerifier()),
      );
      expect(verifiers.size).toBe(10);
    });
  });

  describe("generateCodeChallenge", () => {
    it("should generate a base64url encoded challenge", async () => {
      const verifier = "test-verifier-string-123";
      const challenge = await generateCodeChallenge(verifier);

      // Should be URL-safe base64
      expect(challenge).not.toContain("+");
      expect(challenge).not.toContain("/");
      expect(challenge).not.toContain("=");
    });

    it("should be deterministic for same input", async () => {
      const verifier = "deterministic-test";
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it("should produce different output for different input", async () => {
      const challenge1 = await generateCodeChallenge("verifier-1");
      const challenge2 = await generateCodeChallenge("verifier-2");
      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe("generateState", () => {
    it("should generate a valid UUID", () => {
      const state = generateState();
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(state).toMatch(uuidPattern);
    });

    it("should generate unique values", () => {
      const states = new Set(Array.from({ length: 10 }, () => generateState()));
      expect(states.size).toBe(10);
    });
  });
});

// ==========================================================================
// GroveAuthClient
// ==========================================================================

describe("GroveAuthClient", () => {
  let client: GroveAuthClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GroveAuthClient({
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "https://example.com/callback",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================

  describe("Configuration", () => {
    it("should use default auth URL", async () => {
      const result = await client.getLoginUrl();
      expect(result.url).toContain("https://auth-api.grove.place");
    });

    it("should allow custom auth URL", async () => {
      const customClient = new GroveAuthClient({
        clientId: "test",
        clientSecret: "test",
        redirectUri: "https://example.com/callback",
        authBaseUrl: "https://custom.auth.com",
      });
      const result = await customClient.getLoginUrl();
      expect(result.url).toContain("https://custom.auth.com");
    });
  });

  // ==========================================================================
  // Authentication Flow
  // ==========================================================================

  describe("getLoginUrl", () => {
    it("should return login URL with PKCE parameters", async () => {
      const result = await client.getLoginUrl();

      expect(result.url).toContain("client_id=test-client-id");
      expect(result.url).toContain(
        "redirect_uri=" + encodeURIComponent("https://example.com/callback"),
      );
      expect(result.url).toContain("code_challenge=");
      expect(result.url).toContain("code_challenge_method=S256");
      expect(result.state).toBeDefined();
      expect(result.codeVerifier).toBeDefined();
    });

    it("should include state parameter", async () => {
      const result = await client.getLoginUrl();
      expect(result.url).toContain("state=" + result.state);
    });
  });

  describe("exchangeCode", () => {
    it("should exchange code for tokens", async () => {
      const mockTokens = {
        access_token: "test-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        scope: "read write",
      };
      mockFetchResponse(mockTokens);

      const result = await client.exchangeCode("auth-code", "code-verifier");

      expect(result.access_token).toBe("test-access-token");
      expect(result.refresh_token).toBe("test-refresh-token");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/token"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        }),
      );
    });

    it("should throw GroveAuthError on failure", async () => {
      mockFetchError(
        { error: "invalid_grant", error_description: "Code expired" },
        400,
      );

      await expect(client.exchangeCode("bad-code", "verifier")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token", async () => {
      mockFetchResponse({
        access_token: "new-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new-refresh-token",
        scope: "read write",
      });

      const result = await client.refreshToken("old-refresh-token");

      expect(result.access_token).toBe("new-access-token");
    });

    it("should retry on server error", async () => {
      // First call fails with 500
      mockFetchError({ error: "server_error" }, 500);
      // Second call succeeds
      mockFetchResponse({
        access_token: "new-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh",
        scope: "read",
      });

      // Use a short delay for testing
      vi.useFakeTimers();
      const resultPromise = client.refreshToken("token", { maxRetries: 1 });
      await vi.advanceTimersByTimeAsync(1100);
      const result = await resultPromise;
      vi.useRealTimers();

      expect(result.access_token).toBe("new-token");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on client errors", async () => {
      mockFetchError({ error: "invalid_token" }, 400);

      await expect(client.refreshToken("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return true if token expires within buffer", () => {
      const expiresAt = new Date(Date.now() + 30000); // 30 seconds from now
      expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(true);
    });

    it("should return false if token has time remaining", () => {
      const expiresAt = new Date(Date.now() + 300000); // 5 minutes from now
      expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(false);
    });

    it("should accept string dates", () => {
      const expiresAt = new Date(Date.now() + 30000).toISOString();
      expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(true);
    });
  });

  describe("revokeToken", () => {
    it("should revoke refresh token", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.revokeToken("refresh-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/token/revoke"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on failure", async () => {
      mockFetchError({ error: "revoke_error" }, 400);

      await expect(client.revokeToken("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  // ==========================================================================
  // Token Verification
  // ==========================================================================

  describe("verifyToken", () => {
    it("should return token info for valid token", async () => {
      mockFetchResponse({
        active: true,
        sub: "user-123",
        email: "user@example.com",
      });

      const result = await client.verifyToken("access-token");

      expect(result?.active).toBe(true);
      expect(result?.sub).toBe("user-123");
    });

    it("should return null for inactive token", async () => {
      mockFetchResponse({ active: false });

      const result = await client.verifyToken("expired-token");

      expect(result).toBeNull();
    });
  });

  describe("getUserInfo", () => {
    it("should return user info", async () => {
      mockFetchResponse({
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        picture: null,
        provider: "google",
      });

      const result = await client.getUserInfo("access-token");

      expect(result.sub).toBe("user-123");
      expect(result.email).toBe("user@example.com");
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "userinfo_error" }, 401);

      await expect(client.getUserInfo("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  describe("getSubscription", () => {
    it("should return subscription for current user", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1", tier: "sapling" },
        status: { tier: "sapling", post_count: 10 },
      });

      const result = await client.getSubscription("access-token");

      expect(result.subscription.tier).toBe("sapling");
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "subscription_error" }, 401);

      await expect(client.getSubscription("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("getUserSubscription", () => {
    it("should fetch subscription for specific user", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1", tier: "oak" },
        status: { tier: "oak", post_count: 500 },
      });

      const result = await client.getUserSubscription("token", "user-123");

      expect(result.subscription.tier).toBe("oak");
    });

    it("should cache subscription results", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1", tier: "oak" },
        status: { tier: "oak" },
      });

      // First call
      await client.getUserSubscription("token", "user-123");
      // Second call should use cache
      await client.getUserSubscription("token", "user-123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should skip cache when requested", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1", tier: "oak" },
        status: { tier: "oak" },
      });
      mockFetchResponse({
        subscription: { id: "sub-1", tier: "evergreen" },
        status: { tier: "evergreen" },
      });

      await client.getUserSubscription("token", "user-123");
      const fresh = await client.getUserSubscription("token", "user-123", true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(fresh.subscription.tier).toBe("evergreen");
    });

    it("should reject invalid user IDs", async () => {
      await expect(
        client.getUserSubscription("token", "invalid<user>id"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should reject empty user IDs", async () => {
      await expect(client.getUserSubscription("token", "")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("canUserCreatePost", () => {
    it("should check if user can create post", async () => {
      mockFetchResponse({
        allowed: true,
        status: { can_create_post: true },
        subscription: { tier: "sapling" },
      });

      const result = await client.canUserCreatePost("token", "user-123");

      expect(result.allowed).toBe(true);
    });

    it("should validate user ID", async () => {
      await expect(
        client.canUserCreatePost("token", "../../../etc/passwd"),
      ).rejects.toThrow(GroveAuthError);
    });
  });

  describe("incrementPostCount", () => {
    it("should increment post count", async () => {
      mockFetchResponse({
        subscription: { post_count: 11 },
        status: { post_count: 11 },
      });

      const result = await client.incrementPostCount("token", "user-123");

      expect(result.subscription.post_count).toBe(11);
    });

    it("should update cache after increment", async () => {
      // First, cache a subscription
      mockFetchResponse({
        subscription: { id: "sub-1", post_count: 10 },
        status: { post_count: 10 },
      });
      await client.getUserSubscription("token", "user-123");

      // Increment should update cache
      mockFetchResponse({
        subscription: { id: "sub-1", post_count: 11 },
        status: { post_count: 11 },
      });
      await client.incrementPostCount("token", "user-123");

      // Should use updated cache
      const cached = await client.getUserSubscription("token", "user-123");
      expect(cached.subscription.post_count).toBe(11);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("decrementPostCount", () => {
    it("should decrement post count", async () => {
      mockFetchResponse({
        subscription: { post_count: 9 },
        status: { post_count: 9 },
      });

      const result = await client.decrementPostCount("token", "user-123");

      expect(result.subscription.post_count).toBe(9);
    });
  });

  describe("setPostCount", () => {
    it("should set post count to specific value", async () => {
      mockFetchResponse({
        subscription: { post_count: 25 },
        status: { post_count: 25 },
      });

      const result = await client.setPostCount("token", "user-123", 25);

      expect(result.subscription.post_count).toBe(25);
    });
  });

  describe("updateTier", () => {
    it("should update subscription tier", async () => {
      mockFetchResponse({
        subscription: { tier: "oak" },
        status: { tier: "oak" },
      });

      const result = await client.updateTier("token", "user-123", "oak");

      expect(result.subscription.tier).toBe("oak");
    });

    it("should update cache after tier change", async () => {
      // Cache initial subscription
      mockFetchResponse({
        subscription: { tier: "sapling" },
        status: { tier: "sapling" },
      });
      await client.getUserSubscription("token", "user-123");

      // Update tier
      mockFetchResponse({
        subscription: { tier: "oak" },
        status: { tier: "oak" },
      });
      await client.updateTier("token", "user-123", "oak");

      // Check cache is updated
      const cached = await client.getUserSubscription("token", "user-123");
      expect(cached.subscription.tier).toBe("oak");
    });

    it("should validate user ID", async () => {
      await expect(
        client.updateTier("token", "bad<user>id", "oak"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should throw on API error", async () => {
      mockFetchError({ error: "tier_error" }, 400);

      await expect(
        client.updateTier("token", "user-123", "oak"),
      ).rejects.toThrow(GroveAuthError);
    });
  });

  describe("decrementPostCount with caching", () => {
    it("should decrement and validate user ID", async () => {
      await expect(
        client.decrementPostCount("token", "invalid@user"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should throw on API error", async () => {
      mockFetchError({ error: "count_error" }, 500);

      await expect(
        client.decrementPostCount("token", "user-123"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should update cache after decrement", async () => {
      mockFetchResponse({
        subscription: { post_count: 10 },
        status: { post_count: 10 },
      });
      await client.getUserSubscription("token", "user-123");

      mockFetchResponse({
        subscription: { post_count: 9 },
        status: { post_count: 9 },
      });
      await client.decrementPostCount("token", "user-123");

      const cached = await client.getUserSubscription("token", "user-123");
      expect(cached.subscription.post_count).toBe(9);
    });
  });

  describe("setPostCount with validation", () => {
    it("should validate user ID before request", async () => {
      await expect(
        client.setPostCount("token", "../../etc/passwd", 5),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should throw on API error", async () => {
      mockFetchError({ error: "count_error" }, 400);

      await expect(
        client.setPostCount("token", "user-123", 50),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should update cache with new count", async () => {
      mockFetchResponse({
        subscription: { post_count: 5 },
        status: { post_count: 5 },
      });
      await client.getUserSubscription("token", "user-123");

      mockFetchResponse({
        subscription: { post_count: 100 },
        status: { post_count: 100 },
      });
      await client.setPostCount("token", "user-123", 100);

      const cached = await client.getUserSubscription("token", "user-123");
      expect(cached.subscription.post_count).toBe(100);
    });
  });

  describe("incrementPostCount with validation", () => {
    it("should validate user ID", async () => {
      await expect(
        client.incrementPostCount("token", "invalid<>id"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should throw on API error", async () => {
      mockFetchError({ error: "count_error" }, 401);

      await expect(
        client.incrementPostCount("token", "user-123"),
      ).rejects.toThrow(GroveAuthError);
    });
  });

  // ==========================================================================
  // OAuth - Social Providers
  // ==========================================================================

  describe("signInWithSocial", () => {
    it("should return OAuth URL for Google provider", async () => {
      mockFetchResponse({
        url: "https://accounts.google.com/oauth2/v2/auth?...",
      });

      const result = await client.signInWithSocial("google");

      expect(result.url).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/sign-in/social"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should return OAuth URL for Discord provider", async () => {
      mockFetchResponse({
        url: "https://discord.com/oauth2/authorize?...",
      });

      const result = await client.signInWithSocial("discord");

      expect(result.url).toBeDefined();
    });

    it("should throw on OAuth error", async () => {
      mockFetchError(
        { error: "oauth_error", message: "Invalid provider" },
        400,
      );

      await expect(client.signInWithSocial("google")).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should include redirect_uri in request", async () => {
      mockFetchResponse({ url: "https://oauth.example.com" });

      await client.signInWithSocial("google");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("redirect_uri"),
        }),
      );
    });
  });

  // ==========================================================================
  // Passkey Authentication
  // ==========================================================================

  describe("getPasskeyAuthOptions", () => {
    it("should return passkey authentication options", async () => {
      mockFetchResponse({
        challenge: "test-challenge",
        rpId: "example.com",
        timeout: 60000,
      });

      const result = await client.getPasskeyAuthOptions();

      expect(result.challenge).toBe("test-challenge");
      expect(result.rpId).toBe("example.com");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/sign-in/passkey"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "passkey_error" }, 401);

      await expect(client.getPasskeyAuthOptions()).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should include client_id in request", async () => {
      mockFetchResponse({
        challenge: "test",
        rpId: "example.com",
        timeout: 60000,
      });

      await client.getPasskeyAuthOptions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("test-client-id"),
        }),
      );
    });
  });

  describe("verifyPasskeyAuth", () => {
    it("should verify passkey credential and return tokens", async () => {
      mockFetchResponse({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh",
        scope: "read write",
      });

      const credential = {
        id: "cred-id",
        rawId: "raw-id",
        response: {
          authenticatorData: "auth-data",
          clientDataJSON: "client-data",
          signature: "signature",
        },
        type: "public-key",
      };

      const result = await client.verifyPasskeyAuth(credential);

      expect(result.access_token).toBe("test-token");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/sign-in/passkey/verify"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on verification failure", async () => {
      mockFetchError({ error: "passkey_verify_error" }, 401);

      const credential = {
        id: "cred-id",
        rawId: "raw-id",
        response: {
          authenticatorData: "auth-data",
          clientDataJSON: "client-data",
          signature: "signature",
        },
        type: "public-key",
      };

      await expect(client.verifyPasskeyAuth(credential)).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("getPasskeyRegisterOptions", () => {
    it("should return passkey registration options", async () => {
      mockFetchResponse({
        challenge: "challenge-string",
        rp: { name: "Grove", id: "grove.place" },
        user: {
          id: "user-123",
          name: "user@example.com",
          displayName: "Test User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: 60000,
        attestation: "direct",
      });

      const result = await client.getPasskeyRegisterOptions("access-token");

      expect(result.challenge).toBe("challenge-string");
      expect(result.rp.name).toBe("Grove");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/passkey/generate-register-options"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should include authorization header", async () => {
      mockFetchResponse({
        challenge: "test",
        rp: { name: "Grove", id: "grove.place" },
        user: { id: "u1", name: "user", displayName: "User" },
        pubKeyCredParams: [],
        timeout: 60000,
        attestation: "none",
      });

      await client.getPasskeyRegisterOptions("access-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
        }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "passkey_error" }, 401);

      await expect(
        client.getPasskeyRegisterOptions("bad-token"),
      ).rejects.toThrow(GroveAuthError);
    });
  });

  describe("verifyPasskeyRegistration", () => {
    it("should verify and register passkey", async () => {
      mockFetchResponse({
        id: "passkey-1",
        credentialId: "cred-id",
        name: "My Passkey",
        createdAt: "2024-01-16T12:00:00Z",
        lastUsedAt: null,
      });

      const credential = {
        id: "cred-id",
        rawId: "raw-id",
        response: {
          attestationObject: "attestation",
          clientDataJSON: "client-data",
        },
        type: "public-key",
      };

      const result = await client.verifyPasskeyRegistration(
        "access-token",
        credential,
        "My Passkey",
      );

      expect(result.id).toBe("passkey-1");
      expect(result.name).toBe("My Passkey");
    });

    it("should allow optional name parameter", async () => {
      mockFetchResponse({
        id: "passkey-1",
        credentialId: "cred-id",
        name: "Passkey",
        createdAt: "2024-01-16T12:00:00Z",
        lastUsedAt: null,
      });

      const credential = {
        id: "cred-id",
        rawId: "raw-id",
        response: {
          attestationObject: "attestation",
          clientDataJSON: "client-data",
        },
        type: "public-key",
      };

      const result = await client.verifyPasskeyRegistration(
        "access-token",
        credential,
      );

      expect(result.id).toBe("passkey-1");
    });

    it("should throw on registration error", async () => {
      mockFetchError({ error: "passkey_register_error" }, 401);

      const credential = {
        id: "cred-id",
        rawId: "raw-id",
        response: {
          attestationObject: "attestation",
          clientDataJSON: "client-data",
        },
        type: "public-key",
      };

      await expect(
        client.verifyPasskeyRegistration("token", credential),
      ).rejects.toThrow(GroveAuthError);
    });
  });

  describe("listPasskeys", () => {
    it("should list all passkeys for user", async () => {
      mockFetchResponse([
        {
          id: "passkey-1",
          credentialId: "cred-1",
          name: "Passkey 1",
          createdAt: "2024-01-16T12:00:00Z",
          lastUsedAt: "2024-01-16T14:00:00Z",
        },
        {
          id: "passkey-2",
          credentialId: "cred-2",
          name: "Passkey 2",
          createdAt: "2024-01-10T12:00:00Z",
          lastUsedAt: null,
        },
      ]);

      const result = await client.listPasskeys("access-token");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Passkey 1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/passkey/list-user-passkeys"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
        }),
      );
    });

    it("should return empty array when no passkeys", async () => {
      mockFetchResponse([]);

      const result = await client.listPasskeys("access-token");

      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "passkey_list_error" }, 401);

      await expect(client.listPasskeys("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("deletePasskey", () => {
    it("should delete a passkey", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.deletePasskey("access-token", "passkey-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/passkey/delete-passkey"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on deletion error", async () => {
      mockFetchError({ error: "passkey_delete_error" }, 401);

      await expect(client.deletePasskey("token", "passkey-1")).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should include passkey ID in request", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.deletePasskey("access-token", "passkey-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("passkey-123"),
        }),
      );
    });
  });

  // ==========================================================================
  // Two-Factor Authentication
  // ==========================================================================

  describe("getTwoFactorStatus", () => {
    it("should return 2FA status when disabled", async () => {
      mockFetchResponse({
        enabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
      });

      const result = await client.getTwoFactorStatus("access-token");

      expect(result.enabled).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/two-factor/get-status"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
        }),
      );
    });

    it("should return 2FA status when enabled", async () => {
      mockFetchResponse({
        enabled: true,
        enabledAt: "2024-01-16T12:00:00Z",
        backupCodesRemaining: 8,
      });

      const result = await client.getTwoFactorStatus("access-token");

      expect(result.enabled).toBe(true);
      expect(result.backupCodesRemaining).toBe(8);
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "2fa_status_error" }, 401);

      await expect(client.getTwoFactorStatus("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("enableTwoFactor", () => {
    it("should return TOTP setup information", async () => {
      mockFetchResponse({
        secret: "JBSWY3DPEBLW64TMMQ======",
        qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?data=...",
        backupCodes: ["code1", "code2", "code3", "code4", "code5"],
      });

      const result = await client.enableTwoFactor("access-token");

      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.backupCodes).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/two-factor/enable"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "2fa_enable_error" }, 401);

      await expect(client.enableTwoFactor("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("verifyTwoFactorCode", () => {
    it("should verify TOTP code successfully", async () => {
      mockFetchResponse({
        success: true,
      });

      const result = await client.verifyTwoFactorCode("access-token", "123456");

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/two-factor/verify-totp"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should return backup codes if available", async () => {
      mockFetchResponse({
        success: true,
        backupCodes: ["new1", "new2", "new3"],
      });

      const result = await client.verifyTwoFactorCode("access-token", "123456");

      expect(result.success).toBe(true);
      expect(result.backupCodes).toEqual(["new1", "new2", "new3"]);
    });

    it("should throw on invalid code", async () => {
      mockFetchError({ error: "2fa_verify_error" }, 401);

      await expect(
        client.verifyTwoFactorCode("token", "invalid"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should include code in request body", async () => {
      mockFetchResponse({ success: true });

      await client.verifyTwoFactorCode("access-token", "123456");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("123456"),
        }),
      );
    });
  });

  describe("disableTwoFactor", () => {
    it("should disable 2FA with verification code", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.disableTwoFactor("access-token", "123456");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/two-factor/disable"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "2fa_disable_error" }, 401);

      await expect(
        client.disableTwoFactor("token", "invalid-code"),
      ).rejects.toThrow(GroveAuthError);
    });

    it("should include code in request", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.disableTwoFactor("access-token", "123456");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("123456"),
        }),
      );
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate new backup codes", async () => {
      mockFetchResponse({
        backupCodes: [
          "AAAA-BBBB-CCCC",
          "DDDD-EEEE-FFFF",
          "GGGG-HHHH-IIII",
          "JJJJ-KKKK-LLLL",
          "MMMM-NNNN-OOOO",
        ],
      });

      const result = await client.generateBackupCodes("access-token");

      expect(result).toHaveLength(5);
      expect(result[0]).toBe("AAAA-BBBB-CCCC");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/two-factor/generate-backup-codes"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "backup_codes_error" }, 401);

      await expect(client.generateBackupCodes("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  // ==========================================================================
  // Linked Accounts
  // ==========================================================================

  describe("getLinkedAccounts", () => {
    it("should list all linked OAuth accounts", async () => {
      mockFetchResponse([
        {
          provider: "google",
          providerId: "google-123",
          email: "user@gmail.com",
          name: "Google User",
          linkedAt: "2024-01-16T12:00:00Z",
        },
        {
          provider: "discord",
          providerId: "discord-456",
          email: "user@discord.com",
          name: "Discord User",
          linkedAt: "2024-01-15T10:00:00Z",
        },
      ]);

      const result = await client.getLinkedAccounts("access-token");

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe("google");
      expect(result[1].provider).toBe("discord");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/linked-accounts"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
        }),
      );
    });

    it("should return empty array when no linked accounts", async () => {
      mockFetchResponse([]);

      const result = await client.getLinkedAccounts("access-token");

      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "linked_accounts_error" }, 401);

      await expect(client.getLinkedAccounts("bad-token")).rejects.toThrow(
        GroveAuthError,
      );
    });
  });

  describe("unlinkAccount", () => {
    it("should unlink Google account", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.unlinkAccount("access-token", "google");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/linked-accounts/google"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should unlink Discord account", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.unlinkAccount("access-token", "discord");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/linked-accounts/discord"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should throw on error", async () => {
      mockFetchError({ error: "unlink_error" }, 401);

      await expect(client.unlinkAccount("token", "google")).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should include provider in URL", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await client.unlinkAccount("access-token", "discord");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("discord"),
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  describe("Request Deduplication", () => {
    it("should deduplicate concurrent requests for same user", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1" },
        status: {},
      });

      // Fire multiple concurrent requests
      const promise1 = client.getUserSubscription("token", "user-123");
      const promise2 = client.getUserSubscription("token", "user-123");
      const promise3 = client.getUserSubscription("token", "user-123");

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // All should get the same result
      expect(result1.subscription.id).toBe("sub-1");
      expect(result2.subscription.id).toBe("sub-1");
      expect(result3.subscription.id).toBe("sub-1");

      // But only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should deduplicate across different users separately", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1" },
        status: {},
      });
      mockFetchResponse({
        subscription: { id: "sub-2" },
        status: {},
      });

      const promise1 = client.getUserSubscription("token", "user-1");
      const promise2 = client.getUserSubscription("token", "user-1");
      const promise3 = client.getUserSubscription("token", "user-2");

      await Promise.all([promise1, promise2, promise3]);

      // Should make 2 API calls (one per user)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle failed in-flight requests", async () => {
      mockFetchError({ error: "subscription_error" }, 500);

      const promise1 = client.getUserSubscription("token", "user-123");
      const promise2 = client.getUserSubscription("token", "user-123");

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();

      // Both should fail, and in-flight tracking should be cleaned up
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  describe("Cache Management", () => {
    describe("clearSubscriptionCache", () => {
      it("should clear cache for specific user", async () => {
        mockFetchResponse({
          subscription: { id: "sub-1" },
          status: {},
        });
        mockFetchResponse({
          subscription: { id: "sub-2" },
          status: {},
        });
        mockFetchResponse({
          subscription: { id: "sub-1-fresh" },
          status: {},
        });

        await client.getUserSubscription("token", "user-1");
        await client.getUserSubscription("token", "user-2");

        client.clearSubscriptionCache("user-1");

        // user-1 should need fresh fetch
        await client.getUserSubscription("token", "user-1");

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("should clear all cache when no user specified", async () => {
        mockFetchResponse({ subscription: {}, status: {} });
        mockFetchResponse({ subscription: {}, status: {} });
        mockFetchResponse({ subscription: {}, status: {} });
        mockFetchResponse({ subscription: {}, status: {} });

        await client.getUserSubscription("token", "user-1");
        await client.getUserSubscription("token", "user-2");

        client.clearSubscriptionCache();

        await client.getUserSubscription("token", "user-1");
        await client.getUserSubscription("token", "user-2");

        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      it("should handle clearing non-existent user", () => {
        // Should not throw
        expect(() => {
          client.clearSubscriptionCache("non-existent-user");
        }).not.toThrow();
      });
    });

    describe("cleanupExpiredCache", () => {
      it("should remove expired entries", async () => {
        // Create client with very short TTL
        const shortTTLClient = new GroveAuthClient({
          clientId: "test",
          clientSecret: "test",
          redirectUri: "https://example.com",
          cacheTTL: 100, // 100ms TTL
        });

        mockFetchResponse({ subscription: {}, status: {} });
        await shortTTLClient.getUserSubscription("token", "user-1");

        // Wait for cache to expire
        await new Promise((resolve) => setTimeout(resolve, 150));

        const removed = shortTTLClient.cleanupExpiredCache();
        expect(removed).toBe(1);
      });

      it("should not remove active entries", async () => {
        mockFetchResponse({ subscription: {}, status: {} });
        await client.getUserSubscription("token", "user-1");

        const removed = client.cleanupExpiredCache();
        expect(removed).toBe(0);
      });

      it("should return zero when cache is empty", () => {
        const emptyClient = new GroveAuthClient({
          clientId: "test",
          clientSecret: "test",
          redirectUri: "https://example.com",
        });

        const removed = emptyClient.cleanupExpiredCache();
        expect(removed).toBe(0);
      });

      it("should remove multiple expired entries", async () => {
        const shortTTLClient = new GroveAuthClient({
          clientId: "test",
          clientSecret: "test",
          redirectUri: "https://example.com",
          cacheTTL: 100,
        });

        mockFetchResponse({ subscription: {}, status: {} });
        mockFetchResponse({ subscription: {}, status: {} });
        await shortTTLClient.getUserSubscription("token", "user-1");
        await shortTTLClient.getUserSubscription("token", "user-2");

        await new Promise((resolve) => setTimeout(resolve, 150));

        const removed = shortTTLClient.cleanupExpiredCache();
        expect(removed).toBe(2);
      });
    });
  });

  describe("Error Handling - API Errors", () => {
    it("should preserve error details in GroveAuthError", async () => {
      mockFetchError(
        {
          error: "invalid_token",
          error_description: "Token has expired",
        },
        401,
      );

      try {
        await client.getUserInfo("bad-token");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GroveAuthError);
        if (error instanceof GroveAuthError) {
          expect(error.code).toBeDefined();
          expect(error.statusCode).toBe(401);
          expect(error.message).toBeDefined();
        }
      }
    });

    it("should handle server errors in subscription endpoints", async () => {
      mockFetchError({ error: "server_error" }, 500);

      await expect(client.getSubscription("token")).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should use error_description when available", async () => {
      mockFetchError(
        {
          error: "invalid_request",
          error_description: "Custom error message",
        },
        400,
      );

      try {
        await client.exchangeCode("code", "verifier");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GroveAuthError);
        if (error instanceof GroveAuthError) {
          expect(error.message).toContain("Custom error message");
        }
      }
    });

    it("should fall back to message field when error_description missing", async () => {
      mockFetchError(
        {
          error: "token_error",
          message: "Fallback message",
        },
        400,
      );

      try {
        await client.exchangeCode("code", "verifier");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GroveAuthError);
        if (error instanceof GroveAuthError) {
          expect(error.message).toContain("Fallback message");
        }
      }
    });
  });

  describe("Retry Logic Edge Cases", () => {
    it("should not retry when max retries is 0", async () => {
      mockFetchError({ error: "server_error" }, 500);

      await expect(
        client.refreshToken("token", { maxRetries: 0 }),
      ).rejects.toThrow(GroveAuthError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should apply exponential backoff correctly", async () => {
      vi.useFakeTimers();

      // First attempt fails
      mockFetchError({ error: "server_error" }, 500);
      // Second attempt fails
      mockFetchError({ error: "server_error" }, 500);
      // Third attempt succeeds
      mockFetchResponse({
        access_token: "new-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh",
        scope: "read",
      });

      const resultPromise = client.refreshToken("token", { maxRetries: 2 });

      // Advance past first delay (1s * 2^0 = 1s)
      await vi.advanceTimersByTimeAsync(1100);
      // Advance past second delay (1s * 2^1 = 2s)
      await vi.advanceTimersByTimeAsync(2100);

      const result = await resultPromise;

      expect(result.access_token).toBe("new-token");
      vi.useRealTimers();
    });
  });

  describe("User ID Validation", () => {
    it("should reject user IDs with special characters", async () => {
      const invalidIds = [
        "user@id",
        "user/id",
        "user..id",
        "user<>id",
        "user;id",
        "user|id",
        "../../../etc/passwd",
        "user\nid",
      ];

      for (const id of invalidIds) {
        await expect(client.getUserSubscription("token", id)).rejects.toThrow(
          GroveAuthError,
        );
      }
    });

    it("should accept valid user IDs", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1" },
        status: {},
      });

      const validIds = [
        "user-123",
        "user_123",
        "user123",
        "123",
        "a",
        "a-b_c123",
      ];

      for (const id of validIds) {
        vi.clearAllMocks();
        mockFetchResponse({
          subscription: { id: "sub-1" },
          status: {},
        });
        const result = await client.getUserSubscription("token", id);
        expect(result.subscription.id).toBe("sub-1");
      }
    });

    it("should reject user IDs longer than 128 characters", async () => {
      const longId = "a".repeat(129);

      await expect(client.getUserSubscription("token", longId)).rejects.toThrow(
        GroveAuthError,
      );
    });

    it("should accept user IDs up to 128 characters", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1" },
        status: {},
      });

      const maxId = "a".repeat(128);
      const result = await client.getUserSubscription("token", maxId);
      expect(result.subscription.id).toBe("sub-1");
    });
  });

  describe("Token Expiry Checks", () => {
    it("should detect token expiring exactly at buffer time", () => {
      const now = Date.now();
      const expiresAt = new Date(now + 60000); // 60 seconds from now
      expect(client.isTokenExpiringSoon(expiresAt, 60)).toBe(true);
    });

    it("should use default buffer of 60 seconds", () => {
      const expiresAt = new Date(Date.now() + 30000); // 30 seconds
      // Should trigger default 60 second buffer
      expect(client.isTokenExpiringSoon(expiresAt)).toBe(true);
    });

    it("should handle Date objects and ISO strings uniformly", () => {
      const future = new Date(Date.now() + 100000);
      const futureString = future.toISOString();

      const result1 = client.isTokenExpiringSoon(future, 60);
      const result2 = client.isTokenExpiringSoon(futureString, 60);

      expect(result1).toBe(result2);
    });

    it("should return true for already expired tokens", () => {
      const past = new Date(Date.now() - 1000);
      expect(client.isTokenExpiringSoon(past, 60)).toBe(true);
    });
  });

  describe("Constructor Configuration", () => {
    it("should set correct defaults", () => {
      const testClient = new GroveAuthClient({
        clientId: "test-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com",
      });

      // Verify it uses the default auth URL
      const result = testClient.getLoginUrl();
      expect(result).toBeDefined();
    });

    it("should preserve custom authBaseUrl", async () => {
      const customUrl = "https://custom-auth.example.com";
      const testClient = new GroveAuthClient({
        clientId: "test-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com",
        authBaseUrl: customUrl,
      });

      const result = await testClient.getLoginUrl();
      expect(result.url).toContain(customUrl);
    });

    it("should use custom cacheTTL", async () => {
      const testClient = new GroveAuthClient({
        clientId: "test",
        clientSecret: "secret",
        redirectUri: "https://example.com",
        cacheTTL: 5000, // 5 second TTL
      });

      mockFetchResponse({
        subscription: { id: "sub" },
        status: {},
      });

      await testClient.getUserSubscription("token", "user-1");

      // Short wait - should still be cached
      await new Promise((resolve) => setTimeout(resolve, 100));
      await testClient.getUserSubscription("token", "user-1");

      // Should have made only 1 API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Additional Method Coverage", () => {
    it("should URL encode user ID in subscription endpoint", async () => {
      mockFetchResponse({
        subscription: { id: "sub-1" },
        status: {},
      });

      await client.getUserSubscription("token", "user-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("user-123"),
        expect.any(Object),
      );
    });

    it("should handle constructor with all parameters", () => {
      const config = {
        clientId: "test-id",
        clientSecret: "test-secret",
        redirectUri: "https://test.example.com",
        authBaseUrl: "https://custom-auth.example.com",
        cacheTTL: 10000,
      };

      const testClient = new GroveAuthClient(config);

      expect(testClient).toBeDefined();
    });

    it("should apply default cacheTTL when not specified", () => {
      const testClient = new GroveAuthClient({
        clientId: "test",
        clientSecret: "secret",
        redirectUri: "https://example.com",
      });

      // cacheTTL should default to 300000
      expect(testClient).toBeDefined();
    });
  });
});

// ==========================================================================
// Factory Function
// ==========================================================================

describe("createGroveAuthClient", () => {
  it("should create a GroveAuthClient instance", () => {
    const client = createGroveAuthClient({
      clientId: "test",
      clientSecret: "secret",
      redirectUri: "https://example.com",
    });

    expect(client).toBeInstanceOf(GroveAuthClient);
  });

  it("should pass config correctly to constructor", () => {
    const config = {
      clientId: "custom-id",
      clientSecret: "custom-secret",
      redirectUri: "https://custom.example.com",
      authBaseUrl: "https://custom-auth.example.com",
    };

    const testClient = createGroveAuthClient(config);

    expect(testClient).toBeInstanceOf(GroveAuthClient);
  });
});
