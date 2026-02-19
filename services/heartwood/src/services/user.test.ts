/**
 * Tests for user service - authentication, allowlist enforcement, audit logging
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database queries
vi.mock("../db/queries.js", () => ({
  getUserByEmail: vi.fn(),
  getOrCreateUser: vi.fn(),
  isEmailAllowed: vi.fn(),
  createAuditLog: vi.fn(),
}));

import {
  authenticateUser,
  getUserForEmail,
  logLogout,
  logTokenExchange,
  logTokenRefresh,
  logTokenRevoke,
} from "./user.js";
import {
  getUserByEmail,
  getOrCreateUser,
  isEmailAllowed,
  createAuditLog,
} from "../db/queries.js";
import { TEST_USER } from "../test-helpers.js";

// =============================================================================
// authenticateUser
// =============================================================================

describe("authenticateUser", () => {
  const mockDb = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when email is allowed", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await authenticateUser(
      mockDb,
      {
        email: "allowed@example.com",
        name: "Allowed User",
        avatar_url: null,
        provider: "magic_code",
        provider_id: null,
      },
      { client_id: "test-app" },
    );

    expect(result).toEqual(TEST_USER);
  });

  it("returns null when email is not allowed", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await authenticateUser(
      mockDb,
      {
        email: "stranger@example.com",
        name: "Stranger",
        avatar_url: null,
        provider: "magic_code",
        provider_id: null,
      },
      { client_id: "test-app" },
    );

    expect(result).toBeNull();
  });

  it("logs failed_login when email not allowed", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await authenticateUser(
      mockDb,
      {
        email: "stranger@example.com",
        name: null,
        avatar_url: null,
        provider: "google",
        provider_id: "google-123",
      },
      { client_id: "test-app", ip_address: "1.2.3.4", user_agent: "TestAgent" },
    );

    expect(createAuditLog).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        event_type: "failed_login",
        client_id: "test-app",
        ip_address: "1.2.3.4",
        user_agent: "TestAgent",
        details: expect.objectContaining({
          reason: "email_not_allowed",
          email: "stranger@example.com",
          provider: "google",
        }),
      }),
    );
  });

  it("logs successful login", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await authenticateUser(
      mockDb,
      {
        email: "user@example.com",
        name: "User",
        avatar_url: null,
        provider: "magic_code",
        provider_id: null,
      },
      { client_id: "test-app" },
    );

    expect(createAuditLog).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        event_type: "login",
        user_id: TEST_USER.id,
        client_id: "test-app",
        details: expect.objectContaining({
          provider: "magic_code",
        }),
      }),
    );
  });

  it("passes publicSignupEnabled to isEmailAllowed", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await authenticateUser(
      mockDb,
      {
        email: "new@example.com",
        name: null,
        avatar_url: null,
        provider: "magic_code",
        provider_id: null,
      },
      { client_id: "test-app", publicSignupEnabled: true },
    );

    expect(isEmailAllowed).toHaveBeenCalledWith(
      mockDb,
      "new@example.com",
      true,
    );
  });

  it("calls getOrCreateUser with correct data", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const userData = {
      email: "user@example.com",
      name: "User Name",
      avatar_url: "https://example.com/avatar.png",
      provider: "google" as const,
      provider_id: "google-id-123",
    };

    await authenticateUser(mockDb, userData, { client_id: "test-app" });

    expect(getOrCreateUser).toHaveBeenCalledWith(mockDb, userData);
  });

  it("does not call getOrCreateUser when email not allowed", async () => {
    (isEmailAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await authenticateUser(
      mockDb,
      {
        email: "blocked@example.com",
        name: null,
        avatar_url: null,
        provider: "magic_code",
        provider_id: null,
      },
      { client_id: "test-app" },
    );

    expect(getOrCreateUser).not.toHaveBeenCalled();
  });
});

// =============================================================================
// getUserForEmail
// =============================================================================

describe("getUserForEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when found", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
    const result = await getUserForEmail({} as any, "test@grove.place");
    expect(result).toEqual(TEST_USER);
  });

  it("returns null when not found", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await getUserForEmail({} as any, "nobody@example.com");
    expect(result).toBeNull();
  });
});

// =============================================================================
// Audit logging functions
// =============================================================================

describe("logLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("creates logout audit log", async () => {
    await logLogout({} as any, "user-123", {
      client_id: "test-app",
      ip_address: "1.2.3.4",
      user_agent: "TestAgent",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: "logout",
        user_id: "user-123",
        client_id: "test-app",
      }),
    );
  });
});

describe("logTokenExchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("creates token_exchange audit log", async () => {
    await logTokenExchange({} as any, "user-123", {
      client_id: "test-app",
      ip_address: "1.2.3.4",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: "token_exchange",
        user_id: "user-123",
        client_id: "test-app",
      }),
    );
  });
});

describe("logTokenRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("creates token_refresh audit log", async () => {
    await logTokenRefresh({} as any, "user-123", {
      client_id: "test-app",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: "token_refresh",
        user_id: "user-123",
        client_id: "test-app",
      }),
    );
  });
});

describe("logTokenRevoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("creates token_revoke audit log", async () => {
    await logTokenRevoke({} as any, "user-123", {
      client_id: "test-app",
      ip_address: "1.2.3.4",
      user_agent: "TestAgent",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event_type: "token_revoke",
        user_id: "user-123",
        client_id: "test-app",
        ip_address: "1.2.3.4",
        user_agent: "TestAgent",
      }),
    );
  });
});
