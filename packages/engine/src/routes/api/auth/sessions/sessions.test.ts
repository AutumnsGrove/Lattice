/**
 * Active Sessions API Tests
 *
 * Integration tests for session management endpoints:
 * - GET /api/auth/sessions (list sessions)
 * - DELETE /api/auth/sessions/:sessionId (revoke one)
 * - POST /api/auth/sessions/revoke-all (revoke all)
 *
 * These endpoints proxy to GroveAuth's SessionDO via service binding.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./+server.js";
import { DELETE } from "./[sessionId]/+server.js";
import { POST } from "./revoke-all/+server.js";

// ============================================================================
// Test Helpers
// ============================================================================

interface MockCookies {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockAuthService {
  fetch: ReturnType<typeof vi.fn>;
}

interface MockPlatform {
  env: {
    AUTH?: MockAuthService;
  };
}

function createMockCookies(session?: string): MockCookies {
  return {
    get: vi.fn((name: string) => (name === "grove_session" ? session : null)),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockAuthService(
  responseData: unknown,
  status = 200,
): MockAuthService {
  return {
    fetch: vi.fn(
      async () =>
        new Response(JSON.stringify(responseData), {
          status,
          headers: { "content-type": "application/json" },
        }),
    ),
  };
}

// ============================================================================
// GET /api/auth/sessions
// ============================================================================

describe("GET /api/auth/sessions", () => {
  it("should return 401 when not authenticated", async () => {
    // Arrange
    const cookies = createMockCookies(); // No session
    const platform: MockPlatform = { env: { AUTH: createMockAuthService({}) } };

    // Act
    const response = await GET({
      cookies,
      platform,
    } as unknown as Parameters<typeof GET>[0]);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.sessions).toEqual([]);
  });

  it("should return 503 when AUTH service unavailable", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const platform: MockPlatform = { env: {} }; // No AUTH binding

    // Act
    const response = await GET({
      cookies,
      platform,
    } as unknown as Parameters<typeof GET>[0]);

    // Assert
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe(
      "Service temporarily unavailable. Please try again in a moment.",
    );
  });

  it("should return sessions from GroveAuth", async () => {
    // Arrange
    const mockSessions = [
      {
        id: "session-1",
        deviceName: "Chrome on MacOS",
        lastActiveAt: Date.now(),
        isCurrent: true,
      },
      {
        id: "session-2",
        deviceName: "Safari on iPhone",
        lastActiveAt: Date.now() - 3600000,
        isCurrent: false,
      },
    ];
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService({ sessions: mockSessions });
    const platform: MockPlatform = { env: { AUTH: authService } };

    // Act
    const response = await GET({
      cookies,
      platform,
    } as unknown as Parameters<typeof GET>[0]);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessions).toHaveLength(2);
    expect(data.sessions[0].id).toBe("session-1");
    expect(authService.fetch).toHaveBeenCalledWith(
      "https://login.grove.place/session/list",
      expect.objectContaining({
        method: "GET",
        headers: { Cookie: "grove_session=valid-session-token" },
      }),
    );
  });

  it("should handle GroveAuth errors gracefully", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService({ error: "Rate limited" }, 429);
    const platform: MockPlatform = { env: { AUTH: authService } };

    // Act
    const response = await GET({
      cookies,
      platform,
    } as unknown as Parameters<typeof GET>[0]);

    // Assert
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Rate limited");
    expect(data.sessions).toEqual([]);
  });
});

// ============================================================================
// DELETE /api/auth/sessions/:sessionId
// ============================================================================

describe("DELETE /api/auth/sessions/:sessionId", () => {
  it("should return 401 when not authenticated", async () => {
    // Arrange
    const cookies = createMockCookies();
    const platform: MockPlatform = { env: { AUTH: createMockAuthService({}) } };

    // Act
    const response = await DELETE({
      params: { sessionId: "abc-123" },
      cookies,
      platform,
    } as unknown as Parameters<typeof DELETE>[0]);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Please sign in to continue.");
  });

  it("should return 400 for invalid session ID format", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const platform: MockPlatform = { env: { AUTH: createMockAuthService({}) } };

    // Act - Try with non-UUID format
    const response = await DELETE({
      params: { sessionId: "not-a-valid-uuid" },
      cookies,
      platform,
    } as unknown as Parameters<typeof DELETE>[0]);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Some of the information provided isn't quite right. Please check and try again.",
    );
  });

  it("should return 400 when sessionId is missing", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const platform: MockPlatform = { env: { AUTH: createMockAuthService({}) } };

    // Act
    const response = await DELETE({
      params: {},
      cookies,
      platform,
    } as unknown as Parameters<typeof DELETE>[0]);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Some required fields are missing. Please fill them in and try again.",
    );
  });

  it("should revoke session via GroveAuth", async () => {
    // Arrange
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService({ success: true });
    const platform: MockPlatform = { env: { AUTH: authService } };

    // Act
    const response = await DELETE({
      params: { sessionId },
      cookies,
      platform,
    } as unknown as Parameters<typeof DELETE>[0]);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(authService.fetch).toHaveBeenCalledWith(
      `https://login.grove.place/session/${sessionId}`,
      expect.objectContaining({
        method: "DELETE",
        headers: { Cookie: "grove_session=valid-session-token" },
      }),
    );
  });

  it("should return 404 when session not found", async () => {
    // Arrange
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService(
      { error: "Session not found" },
      404,
    );
    const platform: MockPlatform = { env: { AUTH: authService } };

    // Act
    const response = await DELETE({
      params: { sessionId },
      cookies,
      platform,
    } as unknown as Parameters<typeof DELETE>[0]);

    // Assert
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Session not found");
  });
});

// ============================================================================
// POST /api/auth/sessions/revoke-all
// ============================================================================

describe("POST /api/auth/sessions/revoke-all", () => {
  it("should return 401 when not authenticated", async () => {
    // Arrange
    const cookies = createMockCookies();
    const platform: MockPlatform = { env: { AUTH: createMockAuthService({}) } };
    const request = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ keepCurrent: true }),
    });

    // Act
    const response = await POST({
      request,
      cookies,
      platform,
    } as unknown as Parameters<typeof POST>[0]);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Please sign in to continue.");
  });

  it("should revoke all sessions keeping current", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService({
      success: true,
      revokedCount: 3,
    });
    const platform: MockPlatform = { env: { AUTH: authService } };
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepCurrent: true }),
    });

    // Act
    const response = await POST({
      request,
      cookies,
      platform,
    } as unknown as Parameters<typeof POST>[0]);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.revokedCount).toBe(3);
    expect(authService.fetch).toHaveBeenCalledWith(
      "https://login.grove.place/session/revoke-all",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ keepCurrent: true }),
      }),
    );
  });

  it("should default to keepCurrent=true when body missing", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService({
      success: true,
      revokedCount: 2,
    });
    const platform: MockPlatform = { env: { AUTH: authService } };
    // Request with invalid JSON body
    const request = new Request("https://example.com", {
      method: "POST",
      body: "not-json",
    });

    // Act
    const response = await POST({
      request,
      cookies,
      platform,
    } as unknown as Parameters<typeof POST>[0]);

    // Assert
    expect(response.status).toBe(200);
    // Should have used keepCurrent: true as default
    expect(authService.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ keepCurrent: true }),
      }),
    );
  });

  it("should handle GroveAuth rate limit errors", async () => {
    // Arrange
    const cookies = createMockCookies("valid-session-token");
    const authService = createMockAuthService(
      { error: "Too many requests" },
      429,
    );
    const platform: MockPlatform = { env: { AUTH: authService } };
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepCurrent: true }),
    });

    // Act
    const response = await POST({
      request,
      cookies,
      platform,
    } as unknown as Parameters<typeof POST>[0]);

    // Assert
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Too many requests");
  });
});
