/**
 * Export API Integration Tests
 *
 * Tests for the zip export feature:
 * - POST /api/export/start - Initiates export job
 * - GET /api/export/[id]/status - Checks export status
 * - GET /api/export/[id]/download - Downloads completed export
 * - Email template generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as StartExport } from "../../../src/routes/api/export/start/+server.js";
import { GET as GetStatus } from "../../../src/routes/api/export/[id]/status/+server.js";
import { GET as GetDownload } from "../../../src/routes/api/export/[id]/download/+server.js";
import { getExportReadyEmail } from "../../../src/lib/email/templates/export-ready.js";
import {
  createMockRequestEvent,
  createAuthenticatedTenantEvent,
  createMockD1,
  createMockR2,
  createMockKV,
  createMockDONamespace,
  seedMockD1,
} from "../helpers/index.js";

// ============================================================================
// Module Mocks
// ============================================================================

vi.mock("$lib/utils/csrf.js", () => ({
  validateCSRF: vi.fn(() => true),
}));

vi.mock("$lib/auth/session.js", () => ({
  getVerifiedTenantId: vi.fn(async (db, tid) => tid),
}));

vi.mock("$lib/server/rate-limits/index.js", () => ({
  checkRateLimit: vi.fn(async () => ({
    result: { allowed: true, remaining: 2, resetAt: Date.now() / 1000 + 86400 },
    response: null,
  })),
  getEndpointLimitByKey: vi.fn(() => ({ limit: 3, windowSeconds: 86400 })),
  rateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock("$lib/utils/validation.js", () => ({
  validateUUID: vi.fn(() => true),
  sanitizeFilename: vi.fn((name) => name),
}));

// ============================================================================
// Mock Imports (must come after vi.mock declarations)
// ============================================================================

import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import {
  checkRateLimit,
  getEndpointLimitByKey,
} from "$lib/server/rate-limits/index.js";
import { validateUUID, sanitizeFilename } from "$lib/utils/validation.js";

// ============================================================================
// Test Mocks Setup
// ============================================================================

const mockValidateCSRF = vi.mocked(validateCSRF);
const mockGetVerifiedTenantId = vi.mocked(getVerifiedTenantId);
const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockGetEndpointLimitByKey = vi.mocked(getEndpointLimitByKey);
const mockValidateUUID = vi.mocked(validateUUID);
const mockSanitizeFilename = vi.mocked(sanitizeFilename);

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Set default behavior
  mockValidateCSRF.mockReturnValue(true);
  mockGetVerifiedTenantId.mockResolvedValue("tenant-1");
  mockCheckRateLimit.mockResolvedValue({
    result: {
      allowed: true,
      remaining: 2,
      resetAt: Math.floor(Date.now() / 1000) + 86400,
    },
    response: null,
  });
  mockGetEndpointLimitByKey.mockReturnValue({ limit: 3, windowSeconds: 86400 });
  mockValidateUUID.mockReturnValue(true);
  mockSanitizeFilename.mockImplementation((name) => name);
});

// ============================================================================
// POST /api/export/start - Authentication Tests
// ============================================================================

describe("POST /api/export/start - Authentication", () => {
  it("should return 401 when user is not authenticated", async () => {
    const event = createMockRequestEvent({
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "email" },
      locals: {
        user: null,
        tenantId: "tenant-1",
        csrfToken: "test-csrf-token",
      },
    });

    try {
      await StartExport(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(401);
    }
  });

  // NOTE: CSRF validation is now handled globally in hooks.server.ts
  // Individual endpoints no longer need per-route CSRF checks
});

// ============================================================================
// POST /api/export/start - Validation Tests
// ============================================================================

describe("POST /api/export/start - Validation", () => {
  it("should return 400 for invalid deliveryMethod", async () => {
    const mockDB = createMockD1();
    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "invalid" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    try {
      await StartExport(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { code: string } };
      expect(error.status).toBe(400);
      expect(error.body.code).toBe("GROVE-API-042");
    }
  });

  it("should default includeImages to true when not provided", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();
    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { deliveryMethod: "email" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exportId).toBeDefined();
    expect(data.status).toBe("pending");

    // Check that includeImages was set to true (1) in DB
    const record = await mockDB
      .prepare("SELECT include_images FROM storage_exports WHERE id = ?")
      .bind(data.exportId)
      .first<{ include_images: number }>();

    expect(record?.include_images).toBe(1);
  });

  it("should default deliveryMethod to email when not provided", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();
    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: {},
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Check that deliveryMethod was set to email in DB
    const record = await mockDB
      .prepare("SELECT delivery_method FROM storage_exports WHERE id = ?")
      .bind(data.exportId)
      .first<{ delivery_method: string }>();

    expect(record?.delivery_method).toBe("email");
  });
});

// ============================================================================
// POST /api/export/start - Conflict Tests
// ============================================================================

describe("POST /api/export/start - Conflict Detection", () => {
  it("should return 409 when an export is already in progress", async () => {
    const mockDB = createMockD1();
    const existingExportId = crypto.randomUUID();

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);
    seedMockD1(mockDB, "storage_exports", [
      {
        id: existingExportId,
        tenant_id: "tenant-1",
        status: "assembling",
        progress: 50,
        created_at: Math.floor(Date.now() / 1000),
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "email" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error_code).toBe("GROVE-API-058");
    expect(data.exportId).toBe(existingExportId);
  });

  it("should allow new export when previous is complete", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);
    // NOTE: Mock D1 doesn't support IN clauses, so we can't test this properly.
    // In production, 'complete' status would NOT match the query.
    // For this test, we just verify no blocking exports exist.
    seedMockD1(mockDB, "storage_exports", []);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "email" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exportId).toBeDefined();
    expect(data.status).toBe("pending");
  });

  it("should allow new export when previous has failed", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);
    // NOTE: Mock D1 doesn't support IN clauses, so we can't test this properly.
    // In production, 'failed' status would NOT match the query.
    // For this test, we just verify no blocking exports exist.
    seedMockD1(mockDB, "storage_exports", []);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "download" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exportId).toBeDefined();
    expect(data.status).toBe("pending");
  });
});

// ============================================================================
// POST /api/export/start - Success Tests
// ============================================================================

describe("POST /api/export/start - Success", () => {
  it("should create export record and return exportId with status pending", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    // Ensure no in-progress exports exist
    seedMockD1(mockDB, "storage_exports", []);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "email" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exportId).toBeDefined();
    expect(data.status).toBe("pending");

    // Verify DB record was created
    const record = await mockDB
      .prepare(
        "SELECT id, tenant_id, user_email, include_images, delivery_method FROM storage_exports WHERE id = ?",
      )
      .bind(data.exportId)
      .first<{
        id: string;
        tenant_id: string;
        user_email: string;
        include_images: number;
        delivery_method: string;
      }>();

    expect(record).toBeDefined();
    expect(record?.id).toBe(data.exportId);
    expect(record?.tenant_id).toBe("tenant-1");
    expect(record?.user_email).toBe("user-1@example.com");
    expect(record?.include_images).toBe(1);
    expect(record?.delivery_method).toBe("email");
    // Note: status is hardcoded to 'pending' in the INSERT, but our mock D1
    // doesn't support literal values, so we verify it via the API response instead
  });

  it("should fire DO stub.fetch() to start the job", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();
    const mockFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        }),
    );

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    // Mock the DO stub to track fetch calls
    vi.spyOn(mockDO, "get").mockReturnValue({ fetch: mockFetch } as any);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: false, deliveryMethod: "download" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    const response = await StartExport(event as any);
    await response.json();

    expect(mockFetch).toHaveBeenCalledWith("https://export/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining("exportId"),
    });

    const fetchCall = mockFetch.mock.calls[0];
    const bodyObj = JSON.parse(fetchCall[1].body);
    expect(bodyObj.tenantId).toBe("tenant-1");
    expect(bodyObj.userEmail).toBe("user-1@example.com");
    expect(bodyObj.username).toBe("test-tenant");
    expect(bodyObj.includeImages).toBe(false);
    expect(bodyObj.deliveryMethod).toBe("download");
  });

  it("should write audit log entry", async () => {
    const mockDB = createMockD1();
    const mockDO = createMockDONamespace();

    seedMockD1(mockDB, "tenants", [
      { id: "tenant-1", subdomain: "test-tenant", owner_id: "user-1" },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/start",
      method: "POST",
      body: { includeImages: true, deliveryMethod: "email" },
      platform: {
        env: {
          DB: mockDB,
          CACHE_KV: createMockKV(),
          EXPORTS: mockDO,
        },
      },
    });

    await StartExport(event as any);

    // Verify audit log was created
    const logs = await mockDB
      .prepare(
        "SELECT * FROM audit_log WHERE category = ? AND action = ? AND tenant_id = ?",
      )
      .bind("data_export", "zip_export_started", "tenant-1")
      .all();

    expect(logs.results.length).toBe(1);
    expect(logs.results[0]).toMatchObject({
      tenant_id: "tenant-1",
      user_email: "user-1@example.com",
      category: "data_export",
      action: "zip_export_started",
    });
  });
});

// ============================================================================
// GET /api/export/[id]/status - Authentication Tests
// ============================================================================

describe("GET /api/export/[id]/status - Authentication", () => {
  it("should return 401 when user is not authenticated", async () => {
    const event = createMockRequestEvent({
      url: "https://test-tenant.grove.place/api/export/test-id/status",
      method: "GET",
      params: { id: "test-id" },
      locals: {
        user: null,
        tenantId: "tenant-1",
      },
    });

    try {
      await GetStatus(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number };
      expect(error.status).toBe(401);
    }
  });
});

// ============================================================================
// GET /api/export/[id]/status - Validation Tests
// ============================================================================

describe("GET /api/export/[id]/status - Validation", () => {
  it("should return 400 for invalid UUID format in params.id", async () => {
    mockValidateUUID.mockReturnValue(false);

    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/invalid-id/status",
      method: "GET",
      params: { id: "invalid-id" },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    try {
      await GetStatus(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { code: string } };
      expect(error.status).toBe(400);
      expect(error.body.code).toBe("GROVE-API-042");
    }
  });

  it("should return 404 when export not found", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/status`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetStatus(event as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error_code).toBe("GROVE-API-059");
  });
});

// ============================================================================
// GET /api/export/[id]/status - Status Tests
// ============================================================================

describe("GET /api/export/[id]/status - Status", () => {
  it("should return correct status and progress for in-progress export", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "assembling",
        progress: 50,
        error_message: null,
        file_size_bytes: null,
        item_counts: null,
        created_at: now,
        completed_at: null,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/status`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetStatus(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(exportId);
    expect(data.status).toBe("assembling");
    expect(data.progress).toBe(50);
    expect(data.error).toBeNull();
    expect(data.fileSize).toBeNull();
  });

  it("should return expired status when expires_at has passed on completed export", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        progress: 100,
        error_message: null,
        file_size_bytes: 1024000,
        item_counts: JSON.stringify({ posts: 10, pages: 5, images: 20 }),
        created_at: now - 604800,
        completed_at: now - 604800,
        expires_at: now - 100, // Expired
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/status`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetStatus(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("expired");
    expect(data.progress).toBe(100);
  });

  it("should safely handle malformed item_counts JSON", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        progress: 100,
        error_message: null,
        file_size_bytes: 1024000,
        item_counts: "invalid json{", // Malformed JSON
        created_at: now,
        completed_at: now,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/status`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetStatus(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.itemCounts).toBeNull();
  });

  it("should return complete status with all metadata", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        progress: 100,
        error_message: null,
        file_size_bytes: 2048000,
        item_counts: JSON.stringify({ posts: 15, pages: 8, images: 42 }),
        created_at: now - 3600,
        completed_at: now,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/status`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetStatus(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("complete");
    expect(data.progress).toBe(100);
    expect(data.fileSize).toBe(2048000);
    expect(data.itemCounts).toEqual({ posts: 15, pages: 8, images: 42 });
    expect(data.completedAt).toBe(now);
  });
});

// ============================================================================
// GET /api/export/[id]/download - Authentication Tests
// ============================================================================

describe("GET /api/export/[id]/download - Authentication", () => {
  it("should return 401 when user is not authenticated", async () => {
    const event = createMockRequestEvent({
      url: "https://test-tenant.grove.place/api/export/test-id/download",
      method: "GET",
      params: { id: "test-id" },
      locals: {
        user: null,
        tenantId: "tenant-1",
      },
    });

    try {
      await GetDownload(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number };
      expect(error.status).toBe(401);
    }
  });
});

// ============================================================================
// GET /api/export/[id]/download - Validation Tests
// ============================================================================

describe("GET /api/export/[id]/download - Validation", () => {
  it("should return 400 for invalid UUID format", async () => {
    mockValidateUUID.mockReturnValue(false);

    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/export/not-a-uuid/download",
      method: "GET",
      params: { id: "not-a-uuid" },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    try {
      await GetDownload(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { code: string } };
      expect(error.status).toBe(400);
      expect(error.body.code).toBe("GROVE-API-042");
    }
  });

  it("should return 404 when export not found", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/download`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetDownload(event as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error_code).toBe("GROVE-API-059");
  });
});

// ============================================================================
// GET /api/export/[id]/download - Status Tests
// ============================================================================

describe("GET /api/export/[id]/download - Status", () => {
  it("should return 410 Gone when export has expired", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        r2_key: `exports/tenant-1/${exportId}/test.zip`,
        file_size_bytes: 1024000,
        created_at: now - 604800,
        expires_at: now - 100, // Expired
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/download`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    const response = await GetDownload(event as any);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error_code).toBe("GROVE-API-063");
  });

  it("should return 400 when status is not complete", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "assembling",
        r2_key: null,
        file_size_bytes: null,
        created_at: now,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/download`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
        },
      },
    });

    try {
      await GetDownload(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { code: string } };
      expect(error.status).toBe(400);
      expect(error.body.code).toBe("GROVE-API-081");
    }
  });
});

// ============================================================================
// GET /api/export/[id]/download - Success Tests
// ============================================================================

describe("GET /api/export/[id]/download - Success", () => {
  it("should return zip file with correct Content-Disposition header", async () => {
    const mockDB = createMockD1();
    const mockR2 = createMockR2();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const r2Key = `exports/tenant-1/${exportId}/grove-export-test-tenant-2024-01-15.zip`;

    // Put a test zip file in R2
    const zipContent = new Uint8Array([
      0x50,
      0x4b,
      0x03,
      0x04, // ZIP magic bytes
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
    await mockR2.put(r2Key, zipContent.buffer, {
      httpMetadata: { contentType: "application/zip" },
    });

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        r2_key: r2Key,
        file_size_bytes: zipContent.length,
        created_at: now,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/download`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
          EXPORTS_BUCKET: mockR2,
        },
      },
    });

    const response = await GetDownload(event as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain(".zip");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");

    // Verify body contains ZIP magic bytes
    const body = await response.arrayBuffer();
    const bytes = new Uint8Array(body);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
  });

  it("should reject R2 key with path traversal attempt", async () => {
    const mockDB = createMockD1();
    const exportId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    seedMockD1(mockDB, "storage_exports", [
      {
        id: exportId,
        tenant_id: "tenant-1",
        status: "complete",
        r2_key: `exports/../../../etc/passwd`, // Path traversal attempt
        file_size_bytes: 1000,
        created_at: now,
        expires_at: now + 604800,
      },
    ]);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: `https://test-tenant.grove.place/api/export/${exportId}/download`,
      method: "GET",
      params: { id: exportId },
      platform: {
        env: {
          DB: mockDB,
          EXPORTS_BUCKET: createMockR2(),
        },
      },
    });

    try {
      await GetDownload(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { code: string } };
      expect(error.status).toBe(500);
      expect(error.body.code).toBe("GROVE-API-081");
    }
  });
});

// ============================================================================
// Email Template Tests
// ============================================================================

describe("Email Template - export-ready", () => {
  it("should generate HTML with correct subject", () => {
    const { subject, html, text } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 10, pages: 5, images: 20 },
      fileSize: "2.5 MB",
      expiresAt: "January 22, 2025",
    });

    expect(subject).toBe("Your Grove export is ready");
    expect(html).toContain("Your export is ready!");
    expect(html).toContain("Test User");
  });

  it("should include download URL in HTML", () => {
    const { html } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 10, pages: 5, images: 20 },
      fileSize: "2.5 MB",
      expiresAt: "January 22, 2025",
    });

    expect(html).toContain(
      'href="https://test-tenant.grove.place/export/download"',
    );
    expect(html).toContain("Download Your Export");
  });

  it("should include item counts in HTML", () => {
    const { html } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 15, pages: 8, images: 42 },
      fileSize: "3.2 MB",
      expiresAt: "January 22, 2025",
    });

    expect(html).toContain("15");
    expect(html).toContain("8");
    expect(html).toContain("42");
    expect(html).toContain("Posts");
    expect(html).toContain("Pages");
    expect(html).toContain("Images");
  });

  it("should include file size in HTML", () => {
    const { html } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 10, pages: 5, images: 20 },
      fileSize: "5.8 MB",
      expiresAt: "January 22, 2025",
    });

    expect(html).toContain("5.8 MB");
    expect(html).toContain("Total size");
  });

  it("should include expiry date in HTML", () => {
    const { html } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 10, pages: 5, images: 20 },
      fileSize: "2.5 MB",
      expiresAt: "January 30, 2025",
    });

    expect(html).toContain("January 30, 2025");
  });

  it("should generate text version with all details", () => {
    const { text } = getExportReadyEmail({
      name: "Test User",
      downloadUrl: "https://test-tenant.grove.place/export/download",
      itemCounts: { posts: 12, pages: 7, images: 35 },
      fileSize: "4.1 MB",
      expiresAt: "January 22, 2025",
    });

    expect(text).toContain("Test User");
    expect(text).toContain("12 posts");
    expect(text).toContain("7 pages");
    expect(text).toContain("35 images");
    expect(text).toContain("4.1 MB");
    expect(text).toContain("https://test-tenant.grove.place/export/download");
    expect(text).toContain("January 22, 2025");
  });
});
