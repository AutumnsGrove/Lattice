/**
 * Image Upload Endpoint Integration Tests
 *
 * Tests for the POST /api/images/upload endpoint that handles:
 * - Authentication (locals.user) → 401
 * - Tenant context (locals.tenantId) → 403
 * - CSRF validation
 * - Feature flag gate (image_uploads_enabled) → 403
 * - Rate limiting (50/hour) → 429
 * - File validation (presence, MIME type, magic bytes, size)
 * - R2 storage with tenant-prefixed keys
 * - CDN URL generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../../src/routes/api/images/upload/+server.js";
import {
  createMockRequestEvent,
  createAuthenticatedTenantEvent,
  createMockD1,
  createMockR2,
  createMockKV,
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

vi.mock("$lib/threshold/factory.js", () => ({
  createThreshold: vi.fn(() => ({ _mock: true })),
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
  thresholdCheckWithResult: vi.fn(async () => ({
    result: { allowed: true, remaining: 49, resetAt: Date.now() / 1000 + 3600 },
  })),
  thresholdHeaders: vi.fn(() => ({})),
}));

vi.mock("$lib/server/env-validation.js", () => ({
  validateEnv: vi.fn(() => ({ valid: true })),
  hasAnyEnv: vi.fn(() => true),
}));

vi.mock("$lib/feature-flags/index.js", () => ({
  isFeatureEnabled: vi.fn(async () => true),
  isInGreenhouse: vi.fn(async () => false),
}));

vi.mock("$lib/server/petal/index.js", () => ({
  scanImage: vi.fn(async () => ({ approved: true })),
}));

vi.mock("$lib/server/upload-gate.js", () => ({
  canUploadImages: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("$lib/utils/upload-validation.js", () => ({
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/jxl",
  ],
  ALLOWED_TYPES_DISPLAY: "JPEG, PNG, GIF, WebP, JXL",
  FILE_SIGNATURES: {
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],
    "image/jpeg": [
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xe1],
      [0xff, 0xd8, 0xff, 0xdb],
    ],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  },
  MIME_TO_EXTENSIONS: {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/gif": ["gif"],
    "image/webp": ["webp"],
    "image/jxl": ["jxl"],
  },
  WEBP_MARKER: [0x57, 0x45, 0x42, 0x50],
  isAllowedImageType: vi.fn((type) =>
    [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/jxl",
    ].includes(type),
  ),
  validateFileSignature: vi.fn(() => true),
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a FormData with a test image file
 */
function createImageFormData(
  mimeType: string = "image/png",
  fileBuffer?: Uint8Array,
  filename: string = "test.png",
): FormData {
  const formData = new FormData();

  // Default PNG magic bytes: 89 50 4E 47 (PNG signature)
  let buffer = fileBuffer || new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

  // Ensure buffer is at least some minimal size for validation
  if (buffer.length < 8) {
    const padding = new Uint8Array(8);
    padding.set(buffer);
    buffer = padding;
  }

  const blob = new Blob([buffer], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });
  formData.append("file", file);

  return formData;
}

/**
 * Create a JPEG test image with proper magic bytes
 */
function createJpegFormData(fileBuffer?: Uint8Array): FormData {
  // JPEG magic bytes: FF D8 FF
  const buffer =
    fileBuffer || new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  return createImageFormData("image/jpeg", buffer, "test.jpg");
}

/**
 * Create a GIF test image with proper magic bytes
 */
function createGifFormData(fileBuffer?: Uint8Array): FormData {
  // GIF header: GIF89a or GIF87a (47 49 46 38 39 61)
  const buffer =
    fileBuffer ||
    new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00,
    ]);
  return createImageFormData("image/gif", buffer, "test.gif");
}

/**
 * Create a WebP test image with proper magic bytes
 */
function createWebpFormData(fileBuffer?: Uint8Array): FormData {
  // WebP: RIFF...WEBP (52 49 46 46 ... 57 45 42 50)
  const buffer = fileBuffer || new Uint8Array(12);
  buffer[0] = 0x52; // R
  buffer[1] = 0x49; // I
  buffer[2] = 0x46; // F
  buffer[3] = 0x46; // F
  buffer[4] = 0x00;
  buffer[5] = 0x00;
  buffer[6] = 0x00;
  buffer[7] = 0x00;
  buffer[8] = 0x57; // W
  buffer[9] = 0x45; // E
  buffer[10] = 0x42; // B
  buffer[11] = 0x50; // P

  return createImageFormData("image/webp", buffer, "test.webp");
}

// ============================================================================
// Mock Imports (must come after vi.mock declarations above)
// ============================================================================

import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { createThreshold } from "$lib/threshold/factory.js";
import {
  thresholdCheckWithResult,
  thresholdHeaders,
} from "$lib/threshold/adapters/sveltekit.js";
import { isFeatureEnabled } from "$lib/feature-flags/index.js";
import { scanImage } from "$lib/server/petal/index.js";
import { canUploadImages } from "$lib/server/upload-gate.js";
import {
  isAllowedImageType,
  validateFileSignature,
} from "$lib/utils/upload-validation.js";
import { validateEnv } from "$lib/server/env-validation.js";

// ============================================================================
// Test Mocks Setup
// ============================================================================

const mockValidateCSRF = vi.mocked(validateCSRF);
const mockGetVerifiedTenantId = vi.mocked(getVerifiedTenantId);
const mockCreateThreshold = vi.mocked(createThreshold);
const mockThresholdCheckWithResult = vi.mocked(thresholdCheckWithResult);
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockScanImage = vi.mocked(scanImage);
const mockCanUploadImages = vi.mocked(canUploadImages);
const mockIsAllowedImageType = vi.mocked(isAllowedImageType);
const mockValidateFileSignature = vi.mocked(validateFileSignature);

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Set default behavior
  mockValidateCSRF.mockReturnValue(true);
  mockGetVerifiedTenantId.mockResolvedValue("tenant-1");
  mockCreateThreshold.mockReturnValue({ _mock: true } as any);
  mockThresholdCheckWithResult.mockResolvedValue({
    result: {
      allowed: true,
      remaining: 49,
      resetAt: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  mockIsFeatureEnabled.mockResolvedValue(true);
  mockScanImage.mockResolvedValue({ approved: true });
  mockCanUploadImages.mockResolvedValue({ allowed: true });
  mockIsAllowedImageType.mockImplementation((type: unknown) =>
    [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/jxl",
    ].includes(type),
  );
});

// ============================================================================
// Authentication Tests
// ============================================================================

describe("Image Upload Endpoint - Authentication", () => {
  it("should return 401 when user is not authenticated", async () => {
    const event = createMockRequestEvent({
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      locals: {
        user: null,
        tenantId: "tenant-1",
        csrfToken: "test-csrf-token",
      },
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(401);
      expect(error.body.message).toContain("sign in");
    }
  });

  it("should return 403 when tenant context is missing", async () => {
    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      locals: {
        user: { id: "user-1", email: "test@example.com" },
        tenantId: null,
        csrfToken: "test-csrf-token",
      },
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(403);
      expect(error.body.message).toContain("went wrong");
    }
  });

  // NOTE: CSRF validation is now handled globally in hooks.server.ts
  // Individual endpoints no longer need per-route CSRF checks
});

// ============================================================================
// Feature Flag Tests
// ============================================================================

describe("Image Upload Endpoint - Feature Flag", () => {
  it("should return 403 with feature_disabled code when feature is disabled", async () => {
    mockCanUploadImages.mockResolvedValue({
      allowed: false,
      reason: "Image uploads are disabled",
    });

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error_code).toBe("GROVE-API-047");
    expect(data.error_description).toContain("isn't enabled");
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe("Image Upload Endpoint - Rate Limiting", () => {
  it("should return 429 when rate limit is exceeded", async () => {
    mockThresholdCheckWithResult.mockResolvedValue({
      result: {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + 3600,
        retryAfter: 3600,
      },
      response: new Response(
        JSON.stringify({
          error: "rate_limited",
          message:
            "You're moving faster than we can keep up! Take a moment and try again soon.",
          retryAfter: 3600,
          resetAt: new Date(
            (Math.floor(Date.now() / 1000) + 3600) * 1000,
          ).toISOString(),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "50",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
          },
        },
      ),
    });

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe("rate_limited");
  });
});

// ============================================================================
// File Validation Tests
// ============================================================================

describe("Image Upload Endpoint - File Validation", () => {
  it("should return 400 when no file is provided", async () => {
    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: new FormData(), // Empty form data
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("couldn't be processed");
    }
  });

  it("should return 400 for invalid MIME type (application/pdf)", async () => {
    mockIsAllowedImageType.mockReturnValue(false);

    const formData = new FormData();
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes
    const blob = new Blob([buffer], { type: "application/pdf" });
    const file = new File([blob], "test.pdf", { type: "application/pdf" });
    formData.append("file", file);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("file type");
    }
  });

  it("should return 400 when file extension does not match MIME type", async () => {
    const formData = new FormData();
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const blob = new Blob([buffer], { type: "image/png" });
    const file = new File([blob], "test.jpg", { type: "image/png" }); // Wrong extension
    formData.append("file", file);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("file type");
    }
  });

  it("should return 400 when file has no extension", async () => {
    const formData = new FormData();
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const blob = new Blob([buffer], { type: "image/png" });
    const file = new File([blob], "testimage.", { type: "image/png" }); // Extension resolves to empty string
    formData.append("file", file);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("isn't quite right");
    }
  });

  it("should return 400 when file has suspicious double extension", async () => {
    const formData = new FormData();
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const blob = new Blob([buffer], { type: "image/png" });
    const file = new File([blob], "test.php.png", { type: "image/png" });
    formData.append("file", file);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("file type");
    }
  });

  it("should return 400 when file exceeds 10MB size limit", async () => {
    // Create a large buffer (11MB)
    const largeBuffer = new Uint8Array(11 * 1024 * 1024);
    // Set PNG magic bytes
    largeBuffer[0] = 0x89;
    largeBuffer[1] = 0x50;
    largeBuffer[2] = 0x4e;
    largeBuffer[3] = 0x47;

    const formData = new FormData();
    const blob = new Blob([largeBuffer], { type: "image/png" });
    const file = new File([blob], "large.png", { type: "image/png" });
    formData.append("file", file);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("too large");
    }
  });

  it("should return 400 when file magic bytes do not match MIME type", async () => {
    // PNG file type but JPEG magic bytes
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const formData = createImageFormData("image/png", jpegBytes, "test.png");

    mockValidateFileSignature.mockReturnValueOnce(false);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("file type");
    }
  });

  it("should return 400 when WebP file is missing WEBP marker", async () => {
    // RIFF header but not a WebP (no WEBP marker at offset 8)
    const buffer = new Uint8Array(12);
    buffer[0] = 0x52; // R
    buffer[1] = 0x49; // I
    buffer[2] = 0x46; // F
    buffer[3] = 0x46; // F
    // Missing WEBP marker at offset 8-11

    const formData = createImageFormData("image/webp", buffer, "test.webp");

    mockValidateFileSignature.mockReturnValueOnce(false);

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as { status: number; body: { message: string } };
      expect(error.status).toBe(400);
      expect(error.body.message).toContain("file type");
    }
  });
});

// ============================================================================
// Successful Upload Tests
// ============================================================================

describe("Image Upload Endpoint - Successful Uploads", () => {
  it("should successfully upload a PNG file", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toContain("https://cdn.grove.place/");
    expect(data.key).toContain("tenant-1/photos/");
    expect(data.type).toBe("image/png");
  });

  it("should successfully upload a JPEG file", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createJpegFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe("image/jpeg");
  });

  it("should successfully upload a GIF file", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createGifFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe("image/gif");
  });

  it("should successfully upload a WebP file", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createWebpFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe("image/webp");
  });

  it("should return CDN URL in response", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(data.url).toMatch(/^https:\/\/cdn\.grove\.place\//);
    expect(data.markdown).toContain(`![Image](${data.url})`);
    expect(data.html).toContain(`<img src="${data.url}"`);
  });

  it("should prefix R2 key with tenant ID", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();
    let uploadedKey: string | null = null;

    // Spy on R2 put method
    vi.spyOn(mockR2, "put").mockImplementation(async (key, data) => {
      uploadedKey = key as string;
      return;
    });

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    await POST(event as any);

    expect(uploadedKey).toBeDefined();
    expect(uploadedKey).toMatch(/^tenant-1\/photos\/\d{4}\/\d{2}\/\d{2}\//);
  });

  it("should include alt text and description in response", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const formData = createImageFormData();
    formData.append("altText", "A beautiful sunset");
    formData.append("description", "This is a test image");

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(data.altText).toBe("A beautiful sunset");
    expect(data.description).toBe("This is a test image");
  });

  it("should generate markdown, HTML, and Svelte formats", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const formData = createImageFormData();
    formData.append("altText", "Test image");

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(data.markdown).toMatch(/^!\[Test image\]\(.+\)$/);
    expect(data.html).toMatch(/^<img src=".+" alt="Test image" \/>$/);
    expect(data.svelte).toMatch(/^<img src=".+" alt="Test image" \/>$/);
  });
});

// ============================================================================
// Content Moderation Tests
// ============================================================================

describe("Image Upload Endpoint - Content Moderation", () => {
  it("should call scanImage with correct parameters", async () => {
    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const formData = createImageFormData();
    formData.append("context", "general");

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: formData,
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
          AI: { fetch: vi.fn() },
        },
      },
    });

    await POST(event as any);

    expect(mockScanImage).toHaveBeenCalled();
    const callArgs = mockScanImage.mock.calls[0];
    expect(callArgs[0].mimeType).toBe("image/png");
    expect(callArgs[0].context).toBe("general");
    expect(callArgs[0].userId).toBe("user-1");
    expect(callArgs[0].tenantId).toBe("tenant-1");
  });

  it("should return 400 when content is rejected by Petal", async () => {
    mockScanImage.mockResolvedValue({
      approved: false,
      allowed: false,
      message: "Content violates policy",
      processingTimeMs: 150,
    });

    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
          AI: { fetch: vi.fn() },
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error_code).toBe("GROVE-API-046");
    expect(data.error).toBe("GROVE-API-046");
  });
});

// ============================================================================
// Rate Limit Abuse Detection Tests
// ============================================================================

describe("Image Upload Endpoint - Abuse Detection", () => {
  it("should return 429 when rejected upload count exceeds limit", async () => {
    let callCount = 0;
    mockThresholdCheckWithResult.mockImplementation(async () => {
      callCount++;
      // First call: normal rate limit check (passes)
      if (callCount === 1) {
        return {
          result: {
            allowed: true,
            remaining: 49,
            resetAt: Math.floor(Date.now() / 1000) + 3600,
          },
        };
      }
      // Second call: rejected uploads abuse check (fails)
      return {
        result: {
          allowed: false,
          remaining: 0,
          resetAt: Math.floor(Date.now() / 1000) + 3600,
          retryAfter: 3600,
        },
        response: new Response(
          JSON.stringify({
            error: "rate_limited",
            message:
              "You're moving faster than we can keep up! Take a moment and try again soon.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      };
    });

    mockScanImage.mockResolvedValue({
      approved: false,
      allowed: false,
      message: "Content violates policy",
      processingTimeMs: 150,
    });

    const mockR2 = createMockR2();
    const mockDB = createMockD1();

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
      platform: {
        env: {
          IMAGES: mockR2,
          DB: mockDB,
          CACHE_KV: createMockKV(),
          AI: { fetch: vi.fn() },
        },
      },
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error_code).toBe("GROVE-API-062");
  });
});

// ============================================================================
// Environment Validation Tests
// ============================================================================

describe("Image Upload Endpoint - Environment Validation", () => {
  it("should return 503 when required environment variables are missing", async () => {
    const mockValidateEnv = vi.mocked(validateEnv);
    mockValidateEnv.mockReturnValue({
      valid: false,
      message: "Missing required environment variables: IMAGES",
    });

    const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
      url: "https://test-tenant.grove.place/api/images/upload",
      method: "POST",
      body: createImageFormData(),
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const httpError = err as { status: number; body: { message: string } };
      expect(httpError.status).toBe(503);
      expect(httpError.body.message).toContain("temporarily unavailable");
    }
  });
});
