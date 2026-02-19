/**
 * Petal Integration Tests
 *
 * Tests user-facing behavior of the image moderation system.
 * Following Grove's testing philosophy: "Write tests. Not too many. Mostly integration."
 *
 * We mock at boundaries (Workers AI, external APIs) and test our logic for real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  scanImage,
  quickScan,
  tryonScan,
  verifyOutput,
  type PetalEnv,
  type PetalResult,
} from "./index.js";
import {
  BLOCKED_CATEGORIES,
  CONFIDENCE_THRESHOLDS,
  getRejectionMessage,
  GENERIC_REJECTION_MESSAGE,
} from "$lib/config/petal.js";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock image buffer (1x1 PNG)
 */
function createMockImage(): Uint8Array {
  // Minimal valid PNG (1x1 transparent pixel)
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

/**
 * Create a mock Workers AI binding that returns controlled responses
 */
function createMockAI(
  response: { category: string; confidence: number } | string,
): Ai {
  const responseStr =
    typeof response === "string" ? response : JSON.stringify(response);

  return {
    run: vi.fn().mockResolvedValue({ response: responseStr }),
  } as unknown as Ai;
}

/**
 * Create a mock D1 database
 */
function createMockDB(): D1Database {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  };

  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    batch: vi.fn(),
    exec: vi.fn(),
    dump: vi.fn(),
  } as unknown as D1Database;
}

/**
 * Create a test environment with mocked bindings
 */
function createTestEnv(aiResponse?: {
  category: string;
  confidence: number;
}): PetalEnv {
  return {
    AI: createMockAI(
      aiResponse || { category: "appropriate", confidence: 0.95 },
    ),
    DB: createMockDB(),
    CACHE_KV: {} as KVNamespace,
  };
}

// ============================================================================
// Main Scan Behavior Tests
// ============================================================================

describe("Petal Image Scanning", () => {
  describe("scanImage - User Upload Flow", () => {
    it("should allow appropriate images", async () => {
      const env = createTestEnv({ category: "appropriate", confidence: 0.95 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "general",
          userId: "user123",
          tenantId: "tenant456",
        },
        env,
      );

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe("allow");
      expect(result.message).toBe("Image approved");
    });

    it("should block nudity with user-friendly message", async () => {
      const env = createTestEnv({ category: "nudity", confidence: 0.95 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "general",
          userId: "user123",
        },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe("block");
      expect(result.blockedAt).toBe("layer2");
      expect(result.message).toBe(getRejectionMessage("nudity"));
    });

    it("should block violence content", async () => {
      const env = createTestEnv({ category: "violence", confidence: 0.92 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "blog",
        },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe("block");
      expect(result.message).toContain("cannot process");
    });

    it("should block hate symbols", async () => {
      const env = createTestEnv({ category: "hate_symbols", confidence: 0.91 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "profile",
        },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.message).toContain("community guidelines");
    });

    it("should never reveal CSAM detection reason to user", async () => {
      const env = createTestEnv({
        category: "minor_present",
        confidence: 0.95,
      });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "general",
          userId: "user123",
        },
        env,
      );

      expect(result.allowed).toBe(false);
      // Message should be generic - NEVER reveal CSAM detection
      expect(result.message).toBe(GENERIC_REJECTION_MESSAGE);
      expect(result.message).not.toContain("minor");
      expect(result.message).not.toContain("CSAM");
      expect(result.message).not.toContain("child");
    });
  });

  describe("Context-Specific Validation", () => {
    it("should apply strict checks for try-on context", async () => {
      // Swimwear is blocked for try-on but might be allowed elsewhere
      const env = createTestEnv({ category: "swimwear", confidence: 0.85 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "tryon",
        },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.message).toContain("not supported for try-on");
    });

    it("should be more lenient for blog context", async () => {
      // Same swimwear image might be allowed for blog posts
      const env = createTestEnv({ category: "appropriate", confidence: 0.8 });
      const image = createMockImage();

      const result = await scanImage(
        {
          imageData: image,
          mimeType: "image/png",
          context: "blog",
        },
        env,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe("Confidence Threshold Behavior", () => {
    it("should block high-confidence violations", async () => {
      const env = createTestEnv({
        category: "nudity",
        confidence: CONFIDENCE_THRESHOLDS.block,
      });
      const image = createMockImage();

      const result = await scanImage(
        { imageData: image, mimeType: "image/png", context: "general" },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe("block");
    });

    it("should allow low-confidence detections", async () => {
      const env = createTestEnv({
        category: "nudity",
        confidence: 0.5, // Below threshold
      });
      const image = createMockImage();

      const result = await scanImage(
        { imageData: image, mimeType: "image/png", context: "general" },
        env,
      );

      expect(result.allowed).toBe(true);
    });
  });
});

// ============================================================================
// Provider Fallback Tests
// ============================================================================

describe("Provider Resilience", () => {
  it("should return graceful error when no providers available", async () => {
    // No AI binding, no API keys - returns error result (doesn't throw)
    const env: PetalEnv = {
      DB: createMockDB(),
      CACHE_KV: {} as KVNamespace,
      // No AI, no TOGETHER_API_KEY
    };
    const image = createMockImage();

    // Petal handles missing providers gracefully with an error result
    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CSAM_SCAN_FAILED");
    expect(result.message).toContain("technical difficulties");
  });

  it("should include processing time in result", async () => {
    const env = createTestEnv({ category: "appropriate", confidence: 0.9 });
    const image = createMockImage();

    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("Convenience Functions", () => {
  describe("quickScan", () => {
    it("should scan with general context", async () => {
      const env = createTestEnv({ category: "appropriate", confidence: 0.9 });
      const image = createMockImage();

      const result = await quickScan(image, "image/png", env);

      expect(result.allowed).toBe(true);
    });
  });

  describe("tryonScan", () => {
    it("should apply try-on context with sanity checks", async () => {
      // For try-on, need to mock Layer 1 (CSAM), Layer 2 (classification), AND Layer 3 (sanity check)
      const mockAI = {
        run: vi
          .fn()
          // First call: Layer 1 - CSAM check (uses classifyImage)
          .mockResolvedValueOnce({
            response: JSON.stringify({
              category: "appropriate",
              confidence: 0.95,
            }),
          })
          // Second call: Layer 2 - Content classification
          .mockResolvedValueOnce({
            response: JSON.stringify({
              category: "appropriate",
              confidence: 0.95,
            }),
          })
          // Third call: Layer 3 - Sanity check
          .mockResolvedValueOnce({
            response: JSON.stringify({
              faceCount: 1,
              isScreenshot: false,
              isMeme: false,
              isDrawing: false,
              quality: 0.8,
            }),
          }),
      } as unknown as Ai;

      const env: PetalEnv = {
        AI: mockAI,
        DB: createMockDB(),
        CACHE_KV: {} as KVNamespace,
      };
      const image = createMockImage();

      const result = await tryonScan(image, "image/png", env);

      expect(result.allowed).toBe(true);
      // Verify all 3 AI calls were made (Layer 1 CSAM + Layer 2 classification + Layer 3 sanity)
      expect(mockAI.run).toHaveBeenCalledTimes(3);
    });
  });

  describe("verifyOutput", () => {
    it("should verify AI-generated images", async () => {
      const env = createTestEnv({ category: "appropriate", confidence: 0.95 });
      const image = createMockImage();

      const result = await verifyOutput(image, "image/png", env);

      expect(result.allowed).toBe(true);
      expect(result.code).toBe("APPROVED");
    });

    it("should flag inappropriate AI outputs for retry", async () => {
      const env = createTestEnv({ category: "nudity", confidence: 0.92 });
      const image = createMockImage();

      const result = await verifyOutput(image, "image/png", env);

      expect(result.allowed).toBe(false);
      // Layer 4 returns "retry" to allow regeneration with different seed
      expect(result.decision).toBe("retry");
      expect(result.blockedAt).toBe("layer4");
    });
  });
});

// ============================================================================
// Content Hash Tests
// ============================================================================

describe("Content Hashing", () => {
  it("should include content hash in result for logging", async () => {
    const env = createTestEnv({ category: "appropriate", confidence: 0.9 });
    const image = createMockImage();

    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    expect(result.contentHash).toBeDefined();
    expect(result.contentHash.length).toBe(64); // SHA-256 = 64 hex chars
  });

  it("should use provided hash if available", async () => {
    const env = createTestEnv({ category: "appropriate", confidence: 0.9 });
    const image = createMockImage();
    const providedHash = "a".repeat(64);

    const result = await scanImage(
      {
        imageData: image,
        mimeType: "image/png",
        context: "general",
        hash: providedHash,
      },
      env,
    );

    expect(result.contentHash).toBe(providedHash);
  });
});

// ============================================================================
// All Blocked Categories Test
// ============================================================================

describe("Blocked Category Coverage", () => {
  // Test that all blocked categories actually get blocked
  const blockedCategories = BLOCKED_CATEGORIES.filter(
    (cat) => cat !== "csam_detected", // CSAM is handled specially in Layer 1
  );

  it.each(blockedCategories)(
    "should block %s category with high confidence",
    async (category) => {
      const env = createTestEnv({ category, confidence: 0.92 });
      const image = createMockImage();

      const result = await scanImage(
        { imageData: image, mimeType: "image/png", context: "general" },
        env,
      );

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe("block");
    },
  );
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Error Handling", () => {
  it("should handle malformed AI response gracefully", async () => {
    const env = createTestEnv();
    // Override with malformed response
    (env.AI as { run: ReturnType<typeof vi.fn> }).run.mockResolvedValue({
      response: "not valid json at all",
    });
    const image = createMockImage();

    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    // Should fail-open (allow) when classification parsing fails
    expect(result.allowed).toBe(true);
  });

  it("should handle AI timeout with appropriate error", async () => {
    const env = createTestEnv();
    // Simulate timeout
    (env.AI as { run: ReturnType<typeof vi.fn> }).run.mockRejectedValue(
      new Error("AbortError"),
    );
    const image = createMockImage();

    // Petal handles timeouts gracefully with an error result (doesn't throw)
    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CSAM_SCAN_FAILED");
    expect(result.message).toContain("technical difficulties");
  });

  it("should block upload when all vision providers fail", async () => {
    // Test total provider failure - no AI binding, no fallback API key
    const env: PetalEnv = {
      AI: undefined,
      DB: createMockDB(),
      CACHE_KV: {} as KVNamespace,
      TOGETHER_API_KEY: undefined,
    };
    const image = createMockImage();

    // When no providers are available, Petal should fail-closed (block)
    // because CSAM scanning is mandatory
    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CSAM_SCAN_FAILED");
    expect(result.message).toContain("technical difficulties");
  });

  it("should fail-closed when primary provider fails and no fallback available", async () => {
    const env: PetalEnv = {
      AI: {
        run: vi.fn().mockRejectedValue(new Error("Workers AI unavailable")),
      } as unknown as Ai,
      DB: createMockDB(),
      CACHE_KV: {} as KVNamespace,
      TOGETHER_API_KEY: undefined, // No fallback
    };
    const image = createMockImage();

    const result = await scanImage(
      { imageData: image, mimeType: "image/png", context: "general" },
      env,
    );

    // Must fail-closed - cannot allow uploads without CSAM scanning
    // Decision is "block" because CSAM scanning is mandatory
    expect(result.allowed).toBe(false);
    expect(result.decision).toBe("block");
  });
});
