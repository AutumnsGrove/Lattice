/**
 * Petal Integration Tests
 *
 * Tests the full classifyWithLumen pipeline:
 *   Image validation → Base64 conversion → LumenClient → Router →
 *   Provider (mocked fetch) → Response parsing → Classification result
 *
 * Mock boundary: global `fetch`
 * Everything else runs for real: image validation, base64 encoding,
 * data URI construction, LumenClient preprocessing, router task selection,
 * OpenRouter request formatting, response parsing, confidence clamping.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classifyWithLumen } from "./lumen-classify.js";
import { createLumenClient } from "$lib/lumen/index.js";
import { MODELS } from "$lib/lumen/config.js";

// =============================================================================
// MOCK FETCH
// =============================================================================

function mockOpenRouterVisionResponse(content: string, model?: string) {
  return {
    id: "gen-vision-123",
    choices: [
      {
        message: { role: "assistant", content },
        finish_reason: "stop",
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 800, // Vision requests use more tokens
      completion_tokens: 30,
      total_tokens: 830,
    },
    model: model ?? MODELS.GEMINI_FLASH,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// =============================================================================
// FULL PIPELINE: classifyWithLumen → LumenClient → Provider
// =============================================================================

describe("Integration: Petal classifyWithLumen → LumenClient", () => {
  it("should classify an image through the full Lumen pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          'Based on my analysis: {"category": "appropriate", "confidence": 0.92}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    const result = await classifyWithLumen(
      "base64ImageDataHere",
      "image/jpeg",
      lumen,
      "tenant_123",
    );

    // Verify classification result
    expect(result.category).toBe("appropriate");
    expect(result.confidence).toBe(0.92);
    expect(result.decision).toBe("allow");
    expect(result.model).toBe(MODELS.GEMINI_FLASH);
    expect(result.provider).toBe("openrouter");
  });

  it("should construct correct data URI and send to provider", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          '{"category": "nature", "confidence": 0.88}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await classifyWithLumen("SGVsbG8=", "image/png", lumen);

    // Verify the actual request sent to OpenRouter
    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const message = requestBody.messages[0];

    // Should be multimodal content
    expect(message.content).toHaveLength(2);
    expect(message.content[0].type).toBe("text");
    expect(message.content[0].text).toBeTruthy(); // CLASSIFICATION_PROMPT
    expect(message.content[1].type).toBe("image_url");
    expect(message.content[1].image_url.url).toBe(
      "data:image/png;base64,SGVsbG8=",
    );
  });

  it("should convert Uint8Array to base64 and send through pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          '{"category": "appropriate", "confidence": 0.95}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    const imageBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

    const result = await classifyWithLumen(imageBytes, "image/webp", lumen);

    expect(result.category).toBe("appropriate");

    // Verify base64 conversion happened
    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const imageUrl = requestBody.messages[0].content[1].image_url.url;
    expect(imageUrl).toMatch(/^data:image\/webp;base64,.+/);
  });

  it("should use image task routing (Gemini Flash primary)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          '{"category": "appropriate", "confidence": 0.9}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await classifyWithLumen("data", "image/jpeg", lumen);

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.model).toBe(MODELS.GEMINI_FLASH);
    expect(requestBody.max_tokens).toBe(100); // classifyWithLumen override
    expect(requestBody.temperature).toBe(0.1); // classifyWithLumen override
  });

  it("should skip PII scrubbing for classification prompts", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          '{"category": "appropriate", "confidence": 0.9}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await classifyWithLumen("imagedata", "image/jpeg", lumen);

    // The classification prompt is static and contains no PII patterns,
    // but verify skipPiiScrub means the prompt text is sent unmodified
    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const promptText = requestBody.messages[0].content[0].text;

    // CLASSIFICATION_PROMPT should be sent as-is (not scrubbed)
    expect(promptText).toContain("content safety classifier");
  });

  it("should fail-open when provider returns unparseable classification", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          "I cannot analyze this image due to safety restrictions.",
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    const result = await classifyWithLumen("data", "image/jpeg", lumen);

    // Fail-open: allow with low confidence
    expect(result.category).toBe("appropriate");
    expect(result.confidence).toBe(0.5);
    expect(result.decision).toBe("allow");
    expect(result.reason).toContain("parse error");
  });

  it("should reject invalid images before reaching the provider", async () => {
    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // Invalid MIME type
    await expect(
      classifyWithLumen("data", "application/json", lumen),
    ).rejects.toThrow("Unsupported image type");

    // Empty data
    await expect(classifyWithLumen("", "image/jpeg", lumen)).rejects.toThrow(
      "Empty image data",
    );

    // Provider should never be called
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should pass tenant for quota tracking through the pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterVisionResponse(
          '{"category": "appropriate", "confidence": 0.9}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
      // No DB = no quota enforcement, but tenant still gets logged
    });

    await classifyWithLumen("data", "image/jpeg", lumen, "tenant_abc");

    // Verify the request went through (tenant doesn't affect the fetch call
    // directly, but the pipeline should complete without errors)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should handle provider failure gracefully", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // Should propagate the error (not fail-open for provider errors)
    await expect(
      classifyWithLumen("data", "image/jpeg", lumen),
    ).rejects.toThrow();
  });
});
