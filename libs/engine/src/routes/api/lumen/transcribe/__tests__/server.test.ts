/**
 * Scribe Transcription Endpoint Tests
 *
 * Tests the POST /api/lumen/transcribe endpoint behavior.
 * Focus: Auth, validation, error handling, response shapes.
 *
 * @see /grove-testing for testing philosophy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Track mock calls for assertions
const mockTranscribe = vi.fn();
const mockValidateCSRF = vi.fn(() => true);
const mockGetVerifiedTenantId = vi.fn();
const mockGetTenantSubscription = vi.fn();
const mockValidateEnv = vi.fn(() => ({ valid: true }));

// Mock SvelteKit error
const errorResponses: Map<
  number,
  { status: number; body: { message: string } }
> = new Map();

vi.mock("@sveltejs/kit", () => ({
  json: (data: unknown) => ({ status: 200, body: data }),
  error: (
    status: number,
    body: { message: string; code: string; category: string },
  ) => {
    const err = new Error() as Error & { status: number; body: typeof body };
    err.status = status;
    err.body = body;
    throw err;
  },
}));

vi.mock("$lib/utils/csrf.js", () => ({
  validateCSRF: () => mockValidateCSRF(),
}));

vi.mock("$lib/auth/session.js", () => ({
  getVerifiedTenantId: (...args: unknown[]) => mockGetVerifiedTenantId(...args),
}));

vi.mock("$lib/server/billing.js", () => ({
  getTenantSubscription: (...args: unknown[]) =>
    mockGetTenantSubscription(...args),
}));

vi.mock("$lib/server/env-validation.js", () => ({
  validateEnv: () => mockValidateEnv(),
}));

vi.mock("$lib/lumen/client.js", () => ({
  createLumenClient: () => ({
    transcribe: mockTranscribe,
  }),
}));

vi.mock("$lib/errors", async () => {
  const actual =
    await vi.importActual<typeof import("$lib/errors")>("$lib/errors");
  return {
    ...actual,
    throwGroveError: (
      status: number,
      groveError: { userMessage: string; code: string },
      _prefix: string,
      _context?: unknown,
    ) => {
      const err = new Error(groveError.userMessage) as Error & {
        status: number;
      };
      err.status = status;
      throw err;
    },
    logGroveError: vi.fn(),
  };
});

// Import after mocks are set up
import { POST } from "../+server.js";

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(options: {
  audio?: Blob | null;
  mode?: string;
  contentType?: string;
}): Request {
  const formData = new FormData();

  if (options.audio !== null) {
    const audioBlob =
      options.audio ?? new Blob(["test"], { type: "audio/webm" });
    formData.append("audio", audioBlob, "recording.webm");
  }

  if (options.mode) {
    formData.append("mode", options.mode);
  }

  return new Request("https://test.grove.place/api/lumen/transcribe", {
    method: "POST",
    body: formData,
  });
}

function createMockContext(overrides: {
  user?: { id: string } | null;
  tenantId?: string | null;
  platform?: unknown;
}): { request: Request; platform: unknown; locals: unknown } {
  return {
    request: createMockRequest({
      audio: new Blob(["test"], { type: "audio/webm" }),
    }),
    platform: overrides.platform ?? {
      env: {
        DB: {},
        AI: {},
        OPENROUTER_API_KEY: "test-key",
      },
    },
    locals: {
      // Use 'in' check to allow explicit null values (null ?? default returns default!)
      user: "user" in overrides ? overrides.user : { id: "user_123" },
      tenantId: "tenantId" in overrides ? overrides.tenantId : "tenant_123",
    },
  };
}

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribe.mockResolvedValue({
      text: "Hello world",
      wordCount: 2,
      duration: 1.5,
      latency: 100,
      model: "@cf/openai/whisper-large-v3-turbo",
      provider: "cloudflare-ai",
    });
    mockGetTenantSubscription.mockResolvedValue({
      tier: "seedling",
      isActive: true,
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should reject unauthenticated requests", async () => {
    const ctx = createMockContext({ user: null });

    await expect(POST(ctx as any)).rejects.toThrow("sign in");
  });

  it("should reject requests without tenant context", async () => {
    const ctx = createMockContext({ tenantId: null });

    await expect(POST(ctx as any)).rejects.toThrow("Something went wrong");
  });

  // NOTE: CSRF validation is now handled globally in hooks.server.ts
  // Individual endpoints no longer need per-route CSRF checks
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribe.mockResolvedValue({
      text: "Hello world",
      wordCount: 2,
      duration: 1.5,
      latency: 100,
      model: "@cf/openai/whisper-large-v3-turbo",
      provider: "cloudflare-ai",
    });
    mockGetTenantSubscription.mockResolvedValue({
      tier: "seedling",
      isActive: true,
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should reject missing audio file", async () => {
    const ctx = createMockContext({});
    // Create request without audio
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: new FormData(),
    });

    await expect(POST(ctx as any)).rejects.toThrow("required fields");
  });

  it("should reject invalid audio MIME type", async () => {
    const ctx = createMockContext({});
    const formData = new FormData();
    formData.append(
      "audio",
      new Blob(["test"], { type: "text/plain" }),
      "recording.txt",
    );
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: formData,
    });

    await expect(POST(ctx as any)).rejects.toThrow("file type");
  });

  it("should reject oversized audio files", { timeout: 15000 }, async () => {
    const ctx = createMockContext({});
    // Create a 30MB file (over 25MB limit)
    // Note: Large buffer allocation can be slow, hence extended timeout
    const largeBuffer = new ArrayBuffer(30 * 1024 * 1024);
    const formData = new FormData();
    formData.append(
      "audio",
      new Blob([largeBuffer], { type: "audio/webm" }),
      "recording.webm",
    );
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: formData,
    });

    await expect(POST(ctx as any)).rejects.toThrow("too large");
  });

  it("should accept valid audio types", async () => {
    const validTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav"];

    for (const type of validTypes) {
      vi.clearAllMocks();
      mockTranscribe.mockResolvedValue({
        text: "Test",
        wordCount: 1,
        duration: 1,
        latency: 50,
        model: "test",
        provider: "cloudflare-ai",
      });
      mockGetTenantSubscription.mockResolvedValue({
        tier: "seedling",
        isActive: true,
      });
      mockGetVerifiedTenantId.mockResolvedValue("tenant_123");

      const ctx = createMockContext({});
      const formData = new FormData();
      formData.append("audio", new Blob(["test"], { type }), "recording.webm");
      ctx.request = new Request(
        "https://test.grove.place/api/lumen/transcribe",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await POST(ctx as any)) as { status: number };
      expect(result.status).toBe(200);
    }
  });
});

// =============================================================================
// SUBSCRIPTION TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribe.mockResolvedValue({
      text: "Hello",
      wordCount: 1,
      duration: 1,
      latency: 50,
      model: "test",
      provider: "cloudflare-ai",
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should reject if tenant not found", async () => {
    mockGetTenantSubscription.mockResolvedValue(null);
    const ctx = createMockContext({});

    await expect(POST(ctx as any)).rejects.toThrow("doesn't exist");
  });

  it("should reject inactive subscriptions", async () => {
    mockGetTenantSubscription.mockResolvedValue({
      tier: "seedling",
      isActive: false,
    });
    const ctx = createMockContext({});

    await expect(POST(ctx as any)).rejects.toThrow("active subscription");
  });
});

// =============================================================================
// SUCCESS RESPONSE TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantSubscription.mockResolvedValue({
      tier: "seedling",
      isActive: true,
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should return transcription for raw mode", async () => {
    mockTranscribe.mockResolvedValue({
      text: "Hello world, this is a test.",
      wordCount: 6,
      duration: 2.5,
      latency: 150,
      model: "@cf/openai/whisper-large-v3-turbo",
      provider: "cloudflare-ai",
    });

    const ctx = createMockContext({});
    const formData = new FormData();
    formData.append(
      "audio",
      new Blob(["test"], { type: "audio/webm" }),
      "recording.webm",
    );
    formData.append("mode", "raw");
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: formData,
    });

    const result = (await POST(ctx as any)) as {
      status: number;
      body: {
        success: boolean;
        text: string;
        wordCount: number;
        duration: number;
        mode: string;
      };
    };

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.text).toBe("Hello world, this is a test.");
    expect(result.body.wordCount).toBe(6);
    expect(result.body.duration).toBe(2.5);
    expect(result.body.mode).toBe("raw");
  });

  it("should return gutterContent for draft mode", async () => {
    mockTranscribe.mockResolvedValue({
      text: "Structured transcript.",
      wordCount: 2,
      duration: 1.0,
      latency: 200,
      model: "@cf/openai/whisper-large-v3-turbo",
      provider: "cloudflare-ai",
      gutterContent: [
        { type: "vine", content: "A tangent", anchor: "transcript" },
      ],
      rawTranscript: "Original raw transcript.",
    });

    const ctx = createMockContext({});
    const formData = new FormData();
    formData.append(
      "audio",
      new Blob(["test"], { type: "audio/webm" }),
      "recording.webm",
    );
    formData.append("mode", "draft");
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: formData,
    });

    const result = (await POST(ctx as any)) as {
      status: number;
      body: {
        success: boolean;
        text: string;
        mode: string;
        gutterContent: Array<{ type: string; content: string }>;
        rawTranscript: string;
      };
    };

    expect(result.status).toBe(200);
    expect(result.body.mode).toBe("draft");
    expect(result.body.gutterContent).toHaveLength(1);
    expect(result.body.gutterContent[0].type).toBe("vine");
    expect(result.body.rawTranscript).toBe("Original raw transcript.");
  });

  it("should default to raw mode when not specified", async () => {
    mockTranscribe.mockResolvedValue({
      text: "Test",
      wordCount: 1,
      duration: 0.5,
      latency: 50,
      model: "test",
      provider: "cloudflare-ai",
    });

    const ctx = createMockContext({});
    const formData = new FormData();
    formData.append(
      "audio",
      new Blob(["test"], { type: "audio/webm" }),
      "recording.webm",
    );
    // No mode specified
    ctx.request = new Request("https://test.grove.place/api/lumen/transcribe", {
      method: "POST",
      body: formData,
    });

    const result = (await POST(ctx as any)) as {
      body: { mode: string };
    };

    expect(result.body.mode).toBe("raw");
    // Should NOT have draft-specific fields
    expect(result.body).not.toHaveProperty("gutterContent");
    expect(result.body).not.toHaveProperty("rawTranscript");
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantSubscription.mockResolvedValue({
      tier: "seedling",
      isActive: true,
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should return 429 when quota is exceeded", async () => {
    mockTranscribe.mockRejectedValue(
      new Error("Daily transcription quota exceeded"),
    );

    const ctx = createMockContext({});

    await expect(POST(ctx as any)).rejects.toThrow("usage limit");
  });

  it("should return 422 when transcription fails to parse", async () => {
    mockTranscribe.mockRejectedValue(
      new Error("Transcription failed: empty response"),
    );

    const ctx = createMockContext({});

    await expect(POST(ctx as any)).rejects.toThrow("file type");
  });

  it("should return 503 when environment is misconfigured", async () => {
    mockValidateEnv.mockReturnValueOnce({
      valid: false,
      message: "Missing DB",
    });

    const ctx = createMockContext({});

    await expect(POST(ctx as any)).rejects.toThrow("isn't available");
  });
});

// =============================================================================
// TIER-BASED TESTS
// =============================================================================

describe("POST /api/lumen/transcribe - Tier Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribe.mockResolvedValue({
      text: "Test",
      wordCount: 1,
      duration: 0.5,
      latency: 50,
      model: "test",
      provider: "cloudflare-ai",
    });
    mockGetVerifiedTenantId.mockResolvedValue("tenant_123");
  });

  it("should pass tier to transcribe for quota checking", async () => {
    mockGetTenantSubscription.mockResolvedValue({
      tier: "oak",
      isActive: true,
    });

    const ctx = createMockContext({});
    await POST(ctx as any);

    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: "tenant_123",
      }),
      "oak",
    );
  });
});
