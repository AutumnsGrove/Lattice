/**
 * Tenant Secrets API Tests
 *
 * Tests the secrets CRUD endpoints for auth, validation, and error handling.
 * Core encryption logic is tested in secrets-manager.test.ts.
 *
 * @see /grove-testing for testing philosophy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockValidateCSRF = vi.fn(() => true);
const mockGetVerifiedTenantId = vi.fn();
const mockSecretsManager = {
  listSecrets: vi.fn(),
  setSecret: vi.fn(),
  deleteSecret: vi.fn(),
};

vi.mock("@sveltejs/kit", () => ({
  json: (data: unknown) => ({ status: 200, body: data }),
  error: (status: number, message: string) => {
    const err = new Error(message) as Error & { status: number };
    err.status = status;
    throw err;
  },
}));

vi.mock("$lib/utils/csrf.js", () => ({
  validateCSRF: () => mockValidateCSRF(),
}));

vi.mock("$lib/auth/session.js", () => ({
  getVerifiedTenantId: (...args: unknown[]) => mockGetVerifiedTenantId(...args),
}));

vi.mock("$lib/server/secrets", () => ({
  createSecretsManager: () => mockSecretsManager,
}));

// Import after mocks
import { GET, PUT, DELETE } from "../+server.js";

// =============================================================================
// HELPERS
// =============================================================================

function createMockPlatform() {
  return {
    env: {
      DB: {},
      GROVE_KEK: { get: () => Promise.resolve("a".repeat(64)) },
    },
  };
}

function createMockRequest(body: unknown): Request {
  return new Request(
    "https://test.grove.place/api/tenants/test-tenant/secrets",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe("Secrets API Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerifiedTenantId.mockResolvedValue("tenant-123");
  });

  it("should reject unauthenticated GET requests", async () => {
    await expect(
      GET({
        params: { tenantId: "test" },
        platform: createMockPlatform(),
        locals: { user: null },
      } as Parameters<typeof GET>[0]),
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject unauthenticated PUT requests", async () => {
    await expect(
      PUT({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "test", value: "secret" }),
        platform: createMockPlatform(),
        locals: { user: null },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject unauthenticated DELETE requests", async () => {
    await expect(
      DELETE({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "test" }),
        platform: createMockPlatform(),
        locals: { user: null },
      } as Parameters<typeof DELETE>[0]),
    ).rejects.toThrow("Unauthorized");
  });
});

// =============================================================================
// TENANT ISOLATION TESTS
// =============================================================================

describe("Secrets API Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCSRF.mockReturnValue(true);
  });

  it("should reject access to another user's tenant secrets", async () => {
    // Simulate getVerifiedTenantId throwing when user doesn't own tenant
    mockGetVerifiedTenantId.mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), { status: 403 }),
    );

    await expect(
      GET({
        params: { tenantId: "someone-elses-tenant" },
        platform: createMockPlatform(),
        locals: { user: { id: "attacker-user" } },
      } as Parameters<typeof GET>[0]),
    ).rejects.toThrow("Forbidden");
  });

  it("should reject PUT to another user's tenant", async () => {
    mockGetVerifiedTenantId.mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), { status: 403 }),
    );

    await expect(
      PUT({
        params: { tenantId: "someone-elses-tenant" },
        request: createMockRequest({ keyName: "stolen", value: "data" }),
        platform: createMockPlatform(),
        locals: { user: { id: "attacker-user" } },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("Forbidden");
  });

  it("should reject DELETE on another user's tenant", async () => {
    mockGetVerifiedTenantId.mockRejectedValueOnce(
      Object.assign(new Error("Forbidden"), { status: 403 }),
    );

    await expect(
      DELETE({
        params: { tenantId: "someone-elses-tenant" },
        request: createMockRequest({ keyName: "their-secret" }),
        platform: createMockPlatform(),
        locals: { user: { id: "attacker-user" } },
      } as Parameters<typeof DELETE>[0]),
    ).rejects.toThrow("Forbidden");
  });
});

// =============================================================================
// CSRF VALIDATION TESTS
// =============================================================================

describe("Secrets API CSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerifiedTenantId.mockResolvedValue("tenant-123");
  });

  it("should reject PUT with invalid CSRF", async () => {
    mockValidateCSRF.mockReturnValueOnce(false);

    await expect(
      PUT({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "test", value: "secret" }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("Invalid origin");
  });

  it("should reject DELETE with invalid CSRF", async () => {
    mockValidateCSRF.mockReturnValueOnce(false);

    await expect(
      DELETE({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "test" }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof DELETE>[0]),
    ).rejects.toThrow("Invalid origin");
  });

  it("should allow GET without CSRF (read-only)", async () => {
    mockSecretsManager.listSecrets.mockResolvedValueOnce([]);

    const result = await GET({
      params: { tenantId: "test" },
      platform: createMockPlatform(),
      locals: { user: { id: "user-1" } },
    } as Parameters<typeof GET>[0]);

    expect(result.status).toBe(200);
    // CSRF not checked for GET
    expect(mockValidateCSRF).not.toHaveBeenCalled();
  });
});

// =============================================================================
// INPUT VALIDATION TESTS
// =============================================================================

describe("Secrets API Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerifiedTenantId.mockResolvedValue("tenant-123");
    mockValidateCSRF.mockReturnValue(true);
  });

  it("should reject PUT without keyName", async () => {
    await expect(
      PUT({
        params: { tenantId: "test" },
        request: createMockRequest({ value: "secret" }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("keyName is required");
  });

  it("should reject PUT with invalid keyName format", async () => {
    await expect(
      PUT({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "123invalid", value: "secret" }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("keyName must start with a letter");
  });

  it("should reject PUT with keyName too long", async () => {
    await expect(
      PUT({
        params: { tenantId: "test" },
        request: createMockRequest({
          keyName: "a".repeat(65),
          value: "secret",
        }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof PUT>[0]),
    ).rejects.toThrow("64 characters or less");
  });

  it("should reject DELETE without keyName", async () => {
    await expect(
      DELETE({
        params: { tenantId: "test" },
        request: createMockRequest({}),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof DELETE>[0]),
    ).rejects.toThrow("keyName is required");
  });
});

// =============================================================================
// SUCCESS PATH TESTS
// =============================================================================

describe("Secrets API Success Paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVerifiedTenantId.mockResolvedValue("tenant-123");
    mockValidateCSRF.mockReturnValue(true);
  });

  it("should list secrets for authenticated tenant owner", async () => {
    mockSecretsManager.listSecrets.mockResolvedValueOnce([
      { keyName: "API_KEY", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
    ]);

    const result = await GET({
      params: { tenantId: "test" },
      platform: createMockPlatform(),
      locals: { user: { id: "user-1" } },
    } as Parameters<typeof GET>[0]);

    expect(result.body).toEqual({
      success: true,
      secrets: [
        {
          keyName: "API_KEY",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ],
    });
  });

  it("should save a secret with valid input", async () => {
    mockSecretsManager.setSecret.mockResolvedValueOnce(undefined);

    const result = await PUT({
      params: { tenantId: "test" },
      request: createMockRequest({
        keyName: "MY_SECRET",
        value: "super-secret",
      }),
      platform: createMockPlatform(),
      locals: { user: { id: "user-1" } },
    } as Parameters<typeof PUT>[0]);

    expect(result.body).toEqual({
      success: true,
      message: "Secret 'MY_SECRET' saved",
    });
    expect(mockSecretsManager.setSecret).toHaveBeenCalledWith(
      "tenant-123",
      "MY_SECRET",
      "super-secret",
    );
  });

  it("should delete a secret that exists", async () => {
    mockSecretsManager.deleteSecret.mockResolvedValueOnce(true);

    const result = await DELETE({
      params: { tenantId: "test" },
      request: createMockRequest({ keyName: "OLD_KEY" }),
      platform: createMockPlatform(),
      locals: { user: { id: "user-1" } },
    } as Parameters<typeof DELETE>[0]);

    expect(result.body).toEqual({
      success: true,
      message: "Secret 'OLD_KEY' deleted",
    });
  });

  it("should return 404 when deleting non-existent secret", async () => {
    mockSecretsManager.deleteSecret.mockResolvedValueOnce(false);

    await expect(
      DELETE({
        params: { tenantId: "test" },
        request: createMockRequest({ keyName: "MISSING" }),
        platform: createMockPlatform(),
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof DELETE>[0]),
    ).rejects.toThrow("not found");
  });
});

// =============================================================================
// CONFIGURATION ERROR TESTS
// =============================================================================

describe("Secrets API Configuration Errors", () => {
  it("should reject when database is not configured", async () => {
    await expect(
      GET({
        params: { tenantId: "test" },
        platform: {
          env: { GROVE_KEK: { get: () => Promise.resolve("a".repeat(64)) } },
        },
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof GET>[0]),
    ).rejects.toThrow("Database not configured");
  });

  it("should reject when Secrets Store is not configured", async () => {
    await expect(
      GET({
        params: { tenantId: "test" },
        platform: { env: { DB: {} } },
        locals: { user: { id: "user-1" } },
      } as Parameters<typeof GET>[0]),
    ).rejects.toThrow("Secrets Store not configured");
  });
});
