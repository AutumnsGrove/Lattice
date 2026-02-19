/**
 * Lumen Integration Tests
 *
 * Tests the full LumenClient pipeline with only the network boundary mocked.
 * These tests verify real behavior across:
 *   Client → Preprocessor → Router → Provider → Postprocessor
 *
 * Mock boundary: global `fetch` (the network call to OpenRouter/CF)
 * Everything else runs for real: PII scrubbing, task routing, model selection,
 * request formatting, response parsing, cost calculation, usage normalization.
 *
 * Covers three integration paths introduced by the Lumen migration:
 * 1. Wisp generation — text in, text out, PII scrubbed
 * 2. Timeline BYOK — tenantApiKey threaded to auth header
 * 3. Petal image — multimodal content with data URI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLumenClient, LumenClient } from "./client.js";
import { MODELS } from "./config.js";

// =============================================================================
// MOCK FETCH - THE ONLY BOUNDARY
// =============================================================================

/**
 * Create a mock OpenRouter API response.
 * Mimics the actual response shape from https://openrouter.ai/docs/api-reference
 */
function mockOpenRouterResponse(content: string, model?: string) {
  return {
    id: "gen-test-123",
    choices: [
      {
        message: { role: "assistant", content },
        finish_reason: "stop",
        index: 0,
      },
    ],
    usage: {
      prompt_tokens: 150,
      completion_tokens: 50,
      total_tokens: 200,
    },
    model: model ?? MODELS.DEEPSEEK_V3,
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
// WISP GENERATION PATH
// =============================================================================

describe("Integration: Wisp Generation Path", () => {
  it("should run full pipeline for text generation task", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterResponse(
          '{"grammar":[],"tone":"professional","readability":"clear"}',
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-global-key",
    });

    const response = await lumen.run({
      task: "generation",
      input: "Check this text for grammar issues.",
    });

    // Verify response is normalized
    expect(response.content).toContain("grammar");
    expect(response.model).toBe(MODELS.DEEPSEEK_V3);
    expect(response.provider).toBe("openrouter");
    expect(response.usage.input).toBe(150);
    expect(response.usage.output).toBe(50);
    expect(response.latency).toBeGreaterThanOrEqual(0);
    expect(response.cached).toBe(false);
  });

  it("should scrub PII from content before sending to provider", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("No issues found."),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "generation",
      input: "My email is autumn@grove.place and my phone is 555-123-4567.",
    });

    // Verify the request body sent to fetch has PII scrubbed
    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const userMessage = requestBody.messages[0].content;

    expect(userMessage).toContain("[EMAIL]");
    expect(userMessage).toContain("[PHONE]");
    expect(userMessage).not.toContain("autumn@grove.place");
    expect(userMessage).not.toContain("555-123-4567");
  });

  it("should skip PII scrubbing when skipPiiScrub is true", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("Analysis complete."),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "generation",
      input: "Contact autumn@grove.place for details.",
      options: { skipPiiScrub: true },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const userMessage = requestBody.messages[0].content;

    // PII should remain intact
    expect(userMessage).toContain("autumn@grove.place");
  });

  it("should use correct model and temperature defaults for generation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("Result"),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "generation",
      input: "Hello",
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.model).toBe(MODELS.DEEPSEEK_V3);
    expect(requestBody.max_tokens).toBe(2048); // generation default
    expect(requestBody.temperature).toBe(0.7); // generation default
  });

  it("should calculate cost correctly from usage", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockOpenRouterResponse("Done"),
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
      }),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    const response = await lumen.run({
      task: "generation",
      input: "Test",
    });

    // DeepSeek v3: $0.25/M input, $0.38/M output
    // Cost = (1000/1M * 0.25) + (500/1M * 0.38) = 0.00025 + 0.00019 = 0.00044
    expect(response.usage.cost).toBeCloseTo(0.00044, 5);
  });
});

// =============================================================================
// TIMELINE BYOK PATH
// =============================================================================

describe("Integration: Timeline BYOK Path", () => {
  it("should thread tenantApiKey to Authorization header", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterResponse("Today I worked on the Lumen integration."),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "global-grove-key",
    });

    await lumen.run({
      task: "summary",
      input: "Summarize today's commits.",
      tenant: "tenant_autumn",
      options: {
        tenantApiKey: "user-own-openrouter-key",
      },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const headers = fetchCall[1].headers;

    // BYOK: user's key should be in auth header, NOT the global key
    expect(headers.Authorization).toBe("Bearer user-own-openrouter-key");
    expect(headers.Authorization).not.toContain("global-grove-key");
  });

  it("should use summary task defaults (lower temperature, fewer tokens)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("Summary here."),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "summary",
      input: "Summarize this.",
      options: { tenantApiKey: "byok-key" },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.max_tokens).toBe(1024); // summary default
    expect(requestBody.temperature).toBe(0.3); // summary default (more deterministic)
  });

  it("should use global key when no tenantApiKey provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("Summary."),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "the-global-key",
    });

    await lumen.run({
      task: "summary",
      input: "Summarize.",
    });

    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe("Bearer the-global-key");
  });

  it("should allow model override for BYOK users", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterResponse("Done.", "anthropic/claude-sonnet-4"),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "global-key",
    });

    const response = await lumen.run({
      task: "summary",
      input: "Summarize.",
      options: {
        model: "anthropic/claude-sonnet-4",
        tenantApiKey: "byok-key",
      },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.model).toBe("anthropic/claude-sonnet-4");
    expect(response.model).toBe("anthropic/claude-sonnet-4");
  });

  it("should not fallback when model is explicitly set and provider fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => '{"error":{"message":"Invalid API key"}}',
    });

    const lumen = createLumenClient({
      openrouterApiKey: "bad-key",
    });

    await expect(
      lumen.run({
        task: "summary",
        input: "Test",
        options: {
          model: "anthropic/claude-sonnet-4",
          tenantApiKey: "invalid-byok-key",
        },
      }),
    ).rejects.toThrow();

    // Should only have made ONE fetch call (no fallback attempts)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// PETAL IMAGE CLASSIFICATION PATH
// =============================================================================

describe("Integration: Petal Image Classification Path", () => {
  it("should send multimodal content through the full pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterResponse(
          '{"category": "appropriate", "confidence": 0.95}',
          MODELS.GEMINI_FLASH,
        ),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    const response = await lumen.run({
      task: "image",
      input: [
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this image." },
            {
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64,/9j/4AAQ" },
            },
          ],
        },
      ],
      tenant: "tenant_123",
      options: {
        maxTokens: 100,
        temperature: 0.1,
        skipPiiScrub: true,
      },
    });

    expect(response.content).toContain("appropriate");
    expect(response.model).toBe(MODELS.GEMINI_FLASH);
    expect(response.provider).toBe("openrouter");
  });

  it("should format multimodal messages correctly for OpenRouter API", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockOpenRouterResponse('{"category": "nature", "confidence": 0.9}'),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "image",
      input: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is this?" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,iVBOR" },
            },
          ],
        },
      ],
      options: { skipPiiScrub: true },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const message = requestBody.messages[0];

    // Verify multimodal format
    expect(message.role).toBe("user");
    expect(message.content).toEqual([
      { type: "text", text: "What is this?" },
      {
        type: "image_url",
        image_url: { url: "data:image/png;base64,iVBOR", detail: "auto" },
      },
    ]);
  });

  it("should use image task defaults (Gemini Flash, low temperature)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("{}"),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "image",
      input: [
        {
          role: "user",
          content: [
            { type: "text", text: "Classify." },
            {
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64,abc" },
            },
          ],
        },
      ],
      options: { skipPiiScrub: true },
    });

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.model).toBe(MODELS.GEMINI_FLASH);
    expect(requestBody.temperature).toBe(0.2); // image task default
    expect(requestBody.max_tokens).toBe(1024); // image task default
  });

  it("should include Grove site headers for attribution", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterResponse("OK"),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await lumen.run({
      task: "generation",
      input: "Test",
    });

    const fetchCall = fetchMock.mock.calls[0];
    const headers = fetchCall[1].headers;

    expect(headers["HTTP-Referer"]).toBe("https://grove.place");
    expect(headers["X-Title"]).toBe("Grove");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

// =============================================================================
// ERROR HANDLING - FULL PIPELINE
// =============================================================================

describe("Integration: Error Handling", () => {
  it("should propagate provider errors with context", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => '{"error":{"message":"Rate limit exceeded"}}',
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await expect(
      lumen.run({ task: "generation", input: "Hello" }),
    ).rejects.toThrow(/Rate limit exceeded|All providers failed/);
  });

  it("should throw when Lumen is disabled", async () => {
    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
      enabled: false,
    });

    await expect(
      lumen.run({ task: "generation", input: "Test" }),
    ).rejects.toThrow("Lumen is disabled");

    // Should never reach fetch
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should handle network failures gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    await expect(
      lumen.run({ task: "generation", input: "Hello" }),
    ).rejects.toThrow();
  });

  it("should handle malformed API responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        // Missing choices, usage, etc.
        id: "gen-123",
      }),
    });

    const lumen = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // Should not crash — returns empty content with estimated tokens
    const response = await lumen.run({
      task: "generation",
      input: "Test",
    });

    expect(response.content).toBe("");
    expect(response.usage.input).toBeGreaterThan(0); // Estimated
  });
});
