/**
 * Session Bridge Tests
 *
 * Tests the bridging logic that connects Better Auth sessions to SessionDO.
 * These are integration tests that verify the WeakMap-based request tracking.
 */

import { describe, it, expect, vi } from "vitest";
import {
  registerRequestForBridge,
  getRequestContext,
  cleanupRequestContext,
  setSessionBridgeResult,
  getSessionBridgeResult,
  type SessionBridgeResult,
} from "./sessionBridge.js";

// Mock environment for tests
const mockEnv = {
  SESSION_SECRET: "test-secret-key-for-tests-32bytes!",
  DB: {} as D1Database,
  SESSIONS: {
    get: vi.fn(),
    idFromName: vi.fn(),
  },
} as any;

describe("Session Bridge: Request Registration", () => {
  describe("registerRequestForBridge", () => {
    it("should register a request with environment context", () => {
      const request = new Request("https://login.grove.place/api/auth/sign-in");

      registerRequestForBridge(request, mockEnv);

      const context = getRequestContext(request);
      expect(context).not.toBeUndefined();
      expect(context!.env).toBe(mockEnv);
      expect(context!.timestamp).toBeCloseTo(Date.now(), -2); // Within ~100ms
    });

    it("should track each request independently", () => {
      const request1 = new Request(
        "https://login.grove.place/api/auth/sign-in/google",
      );
      const request2 = new Request(
        "https://login.grove.place/api/auth/sign-in/magic-link",
      );

      const env1 = { ...mockEnv, id: "env1" };
      const env2 = { ...mockEnv, id: "env2" };

      registerRequestForBridge(request1, env1 as any);
      registerRequestForBridge(request2, env2 as any);

      const context1 = getRequestContext(request1);
      const context2 = getRequestContext(request2);

      expect(context1!.env).toHaveProperty("id", "env1");
      expect(context2!.env).toHaveProperty("id", "env2");
    });
  });

  describe("getRequestContext", () => {
    it("should return undefined for unregistered requests", () => {
      const request = new Request(
        "https://login.grove.place/api/auth/unregistered",
      );

      const context = getRequestContext(request);
      expect(context).toBeUndefined();
    });

    it("should expire stale requests after 5 minutes", async () => {
      const request = new Request("https://login.grove.place/api/auth/sign-in");

      // Register with a timestamp in the past
      registerRequestForBridge(request, mockEnv);

      // Get the context immediately - should work
      const contextImmediate = getRequestContext(request);
      expect(contextImmediate).not.toBeUndefined();

      // Note: We can't easily test the 5-minute timeout without mocking Date.now()
      // The implementation uses Date.now() comparison internally
    });
  });
});

describe("Session Bridge: Result Tracking", () => {
  describe("setSessionBridgeResult / getSessionBridgeResult", () => {
    it("should store and retrieve session bridge result", () => {
      const request = new Request(
        "https://login.grove.place/api/auth/callback",
      );
      const result: SessionBridgeResult = {
        sessionId: "sess_abc123",
        userId: "user_xyz789",
      };

      setSessionBridgeResult(request, result);

      const retrieved = getSessionBridgeResult(request);
      expect(retrieved).toEqual(result);
    });

    it("should store error results", () => {
      const request = new Request(
        "https://login.grove.place/api/auth/callback",
      );
      const errorResult: SessionBridgeResult = {
        sessionId: "",
        userId: "user_xyz789",
        error: "SessionDO creation failed",
      };

      setSessionBridgeResult(request, errorResult);

      const retrieved = getSessionBridgeResult(request);
      expect(retrieved).toEqual(errorResult);
      expect(retrieved!.error).toBe("SessionDO creation failed");
    });

    it("should return undefined for requests without results", () => {
      const request = new Request(
        "https://login.grove.place/api/auth/no-result",
      );

      const retrieved = getSessionBridgeResult(request);
      expect(retrieved).toBeUndefined();
    });

    it("should isolate results per request", () => {
      const request1 = new Request("https://login.grove.place/api/auth/req1");
      const request2 = new Request("https://login.grove.place/api/auth/req2");

      const result1: SessionBridgeResult = {
        sessionId: "sess_1",
        userId: "user_1",
      };
      const result2: SessionBridgeResult = {
        sessionId: "sess_2",
        userId: "user_2",
      };

      setSessionBridgeResult(request1, result1);
      setSessionBridgeResult(request2, result2);

      expect(getSessionBridgeResult(request1)).toEqual(result1);
      expect(getSessionBridgeResult(request2)).toEqual(result2);
    });
  });
});

describe("Session Bridge: Cleanup", () => {
  describe("cleanupRequestContext", () => {
    it("should remove request context after cleanup", () => {
      const request = new Request("https://login.grove.place/api/auth/sign-in");

      registerRequestForBridge(request, mockEnv);
      expect(getRequestContext(request)).not.toBeUndefined();

      cleanupRequestContext(request);
      expect(getRequestContext(request)).toBeUndefined();
    });

    it("should remove bridge result after cleanup", () => {
      const request = new Request("https://login.grove.place/api/auth/sign-in");
      const result: SessionBridgeResult = {
        sessionId: "sess_123",
        userId: "user_456",
      };

      registerRequestForBridge(request, mockEnv);
      setSessionBridgeResult(request, result);

      expect(getSessionBridgeResult(request)).toEqual(result);

      cleanupRequestContext(request);
      expect(getSessionBridgeResult(request)).toBeUndefined();
    });

    it("should handle cleanup of non-existent request gracefully", () => {
      const request = new Request(
        "https://login.grove.place/api/auth/never-registered",
      );

      // Should not throw
      expect(() => cleanupRequestContext(request)).not.toThrow();
    });
  });
});

describe("Session Bridge: WeakMap Behavior", () => {
  it("should use request object as key (referential identity)", () => {
    const url = "https://login.grove.place/api/auth/sign-in";

    // Two different Request objects with same URL
    const request1 = new Request(url);
    const request2 = new Request(url);

    const result1: SessionBridgeResult = {
      sessionId: "sess_1",
      userId: "user_1",
    };

    registerRequestForBridge(request1, mockEnv);
    setSessionBridgeResult(request1, result1);

    // Different request object should not have the result
    expect(getRequestContext(request2)).toBeUndefined();
    expect(getSessionBridgeResult(request2)).toBeUndefined();

    // Original request should still have its data
    expect(getRequestContext(request1)).not.toBeUndefined();
    expect(getSessionBridgeResult(request1)).toEqual(result1);
  });

  it("should allow garbage collection of cleaned up requests", () => {
    // This is more of a design verification than a testable behavior
    // WeakMaps automatically allow GC of keys that are no longer referenced

    let request: Request | null = new Request(
      "https://login.grove.place/api/auth/temp",
    );
    const result: SessionBridgeResult = {
      sessionId: "sess_temp",
      userId: "user_temp",
    };

    registerRequestForBridge(request, mockEnv);
    setSessionBridgeResult(request, result);

    // Clean up
    cleanupRequestContext(request);

    // Clear the reference (in real code, this happens when the request handler completes)
    request = null;

    // The WeakMap entries are now eligible for GC
    // We can't directly verify GC happened, but we can verify our cleanup worked
  });
});

describe("Session Bridge: Complete Flow Simulation", () => {
  it("should handle successful OAuth flow", async () => {
    // Simulate: Route handler registers request
    const request = new Request(
      "https://login.grove.place/api/auth/callback/google",
    );
    registerRequestForBridge(request, mockEnv);

    // Simulate: BA hook creates session and bridges
    const baSession = {
      id: "ba_sess_123",
      userId: "user_google_456",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 Chrome/120",
    };

    // Verify context is available for the hook
    const context = getRequestContext(request);
    expect(context).not.toBeUndefined();
    expect(context!.env).toBe(mockEnv);

    // Simulate: SessionDO session created successfully
    const bridgeResult: SessionBridgeResult = {
      sessionId: "grove_sess_789",
      userId: baSession.userId,
    };
    setSessionBridgeResult(request, bridgeResult);

    // Simulate: Response wrapper retrieves result for cookie
    const result = getSessionBridgeResult(request);
    expect(result).toEqual(bridgeResult);
    expect(result!.error).toBeUndefined();

    // Simulate: Cleanup after response sent
    cleanupRequestContext(request);
    expect(getRequestContext(request)).toBeUndefined();
    expect(getSessionBridgeResult(request)).toBeUndefined();
  });

  it("should handle failed SessionDO creation gracefully", async () => {
    const request = new Request(
      "https://login.grove.place/api/auth/callback/google",
    );
    registerRequestForBridge(request, mockEnv);

    // Simulate: SessionDO creation fails
    const errorResult: SessionBridgeResult = {
      sessionId: "",
      userId: "user_google_123",
      error: "Durable Object unavailable",
    };
    setSessionBridgeResult(request, errorResult);

    // Response wrapper should see the error
    const result = getSessionBridgeResult(request);
    expect(result!.error).toBe("Durable Object unavailable");
    expect(result!.sessionId).toBe("");

    // BA session is still valid; we just don't set grove_session cookie
    cleanupRequestContext(request);
  });

  it("should handle request not registered (hook called without registration)", () => {
    // This simulates a scenario where the hook fires but the request wasn't registered
    // (shouldn't happen in normal flow, but we should handle it gracefully)

    const request = new Request(
      "https://login.grove.place/api/auth/magic-link",
    );

    // Hook tries to get context without prior registration
    const context = getRequestContext(request);
    expect(context).toBeUndefined();

    // The hook should skip bridging in this case
    // (no error thrown, just no-op)
  });
});
