/**
 * Router BYOK & Model Override Tests
 *
 * Tests the new behaviors introduced by Lumen integration:
 * - BYOK (Bring Your Own Key) passthrough to provider inference
 * - Model override skips fallback chain (user chose this model, don't switch)
 *
 * Extends (not duplicates) the existing router.test.ts.
 */

import { describe, it, expect, vi } from "vitest";
import { executeWithFallback } from "./router.js";
import { AllProvidersFailedError, ProviderError } from "./errors.js";
import type { ProviderRegistry, LumenProvider } from "./providers/index.js";

// =============================================================================
// MOCK PROVIDER FACTORY
// =============================================================================

function createMockProvider(
  name: string,
  options: {
    shouldFail?: boolean;
    failMessage?: string;
  } = {},
): LumenProvider {
  return {
    name: name as any,
    inference: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new ProviderError(
          name as any,
          options.failMessage ?? "Mock failure",
        );
      }
      return {
        content: `Response from ${name}`,
        usage: { input: 100, output: 50, cost: 0.001 },
        model: "test-model",
        raw: {},
      };
    }),
    stream: vi.fn(),
  };
}

// =============================================================================
// BYOK KEY PASSTHROUGH
// =============================================================================

describe("BYOK Key Passthrough", () => {
  it("should pass apiKeyOverride to provider inference options", async () => {
    const mockProvider = createMockProvider("openrouter");
    const providers: ProviderRegistry = { openrouter: mockProvider };

    await executeWithFallback(
      "generation",
      [{ role: "user", content: "Hello" }],
      providers,
      { apiKeyOverride: "user-tenant-key-123" },
    );

    expect(mockProvider.inference).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        apiKeyOverride: "user-tenant-key-123",
      }),
    );
  });

  it("should use default key when no override provided", async () => {
    const mockProvider = createMockProvider("openrouter");
    const providers: ProviderRegistry = { openrouter: mockProvider };

    await executeWithFallback(
      "generation",
      [{ role: "user", content: "Hello" }],
      providers,
    );

    expect(mockProvider.inference).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        apiKeyOverride: undefined,
      }),
    );
  });

  it("should thread apiKeyOverride through fallback chain", async () => {
    const failingOpenRouter = createMockProvider("openrouter", {
      shouldFail: true,
    });
    const workingCF = createMockProvider("cloudflare-ai");

    const providers: ProviderRegistry = {
      openrouter: failingOpenRouter,
      "cloudflare-ai": workingCF,
    };

    // Use moderation task (has CF fallback) without model override
    // so fallback chain is used
    await executeWithFallback(
      "moderation",
      [{ role: "user", content: "Test" }],
      providers,
      { apiKeyOverride: "tenant-key-abc" },
    );

    // The fallback provider should also receive the apiKeyOverride
    expect(workingCF.inference).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        apiKeyOverride: "tenant-key-abc",
      }),
    );
  });
});

// =============================================================================
// MODEL OVERRIDE SKIPS FALLBACK
// =============================================================================

describe("Model Override Skips Fallback", () => {
  it("should skip fallback chain when model is explicitly set", async () => {
    const failingOpenRouter = createMockProvider("openrouter", {
      shouldFail: true,
      failMessage: "Model unavailable",
    });
    const workingCF = createMockProvider("cloudflare-ai");

    const providers: ProviderRegistry = {
      openrouter: failingOpenRouter,
      "cloudflare-ai": workingCF,
    };

    // With model set, should NOT fall through to CF
    await expect(
      executeWithFallback(
        "moderation",
        [{ role: "user", content: "Test" }],
        providers,
        { model: "custom/my-model" },
      ),
    ).rejects.toThrow(AllProvidersFailedError);

    // CF should never be called
    expect(workingCF.inference).not.toHaveBeenCalled();
  });

  it("should throw (not fallback) when specified model's provider fails", async () => {
    const failingOpenRouter = createMockProvider("openrouter", {
      shouldFail: true,
      failMessage: "API key invalid",
    });
    const workingCF = createMockProvider("cloudflare-ai");

    const providers: ProviderRegistry = {
      openrouter: failingOpenRouter,
      "cloudflare-ai": workingCF,
    };

    // Explicit model → no fallback
    await expect(
      executeWithFallback(
        "generation",
        [{ role: "user", content: "Hello" }],
        providers,
        { model: "anthropic/claude-sonnet-4" },
      ),
    ).rejects.toThrow(AllProvidersFailedError);
  });

  it("should still use fallback chain when no model specified", async () => {
    const failingOpenRouter = createMockProvider("openrouter", {
      shouldFail: true,
    });
    const workingCF = createMockProvider("cloudflare-ai");

    const providers: ProviderRegistry = {
      openrouter: failingOpenRouter,
      "cloudflare-ai": workingCF,
    };

    // No model override → fallback chain is used
    const result = await executeWithFallback(
      "moderation",
      [{ role: "user", content: "Test" }],
      providers,
    );

    expect(result.provider).toBe("cloudflare-ai");
    expect(workingCF.inference).toHaveBeenCalled();
  });

  it("should use the specified model name in provider call", async () => {
    const mockProvider = createMockProvider("openrouter");
    const providers: ProviderRegistry = { openrouter: mockProvider };

    await executeWithFallback(
      "generation",
      [{ role: "user", content: "Hello" }],
      providers,
      { model: "anthropic/claude-sonnet-4" },
    );

    // First argument to inference should be the custom model
    expect(mockProvider.inference).toHaveBeenCalledWith(
      "anthropic/claude-sonnet-4",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("should combine model override with apiKeyOverride", async () => {
    const mockProvider = createMockProvider("openrouter");
    const providers: ProviderRegistry = { openrouter: mockProvider };

    await executeWithFallback(
      "generation",
      [{ role: "user", content: "Hello" }],
      providers,
      { model: "anthropic/claude-sonnet-4", apiKeyOverride: "byok-key" },
    );

    expect(mockProvider.inference).toHaveBeenCalledWith(
      "anthropic/claude-sonnet-4",
      expect.any(Array),
      expect.objectContaining({
        apiKeyOverride: "byok-key",
      }),
    );
  });
});
