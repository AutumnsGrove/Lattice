/**
 * Lumen Router Tests
 *
 * Tests task routing and fallback chain behavior.
 * These tests ensure reliability when providers fail.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  routeTask,
  executeWithFallback,
  executeEmbedding,
  executeModeration,
} from "./router.js";
import { getTaskConfig, MODELS } from "./config.js";
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
    hasEmbed?: boolean;
    hasModerate?: boolean;
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
    embed: options.hasEmbed
      ? vi.fn().mockImplementation(async () => {
          if (options.shouldFail) {
            throw new ProviderError(
              name as any,
              options.failMessage ?? "Mock failure",
            );
          }
          return { embeddings: [[0.1, 0.2, 0.3]], tokens: 10 };
        })
      : undefined,
    moderate: options.hasModerate
      ? vi.fn().mockImplementation(async () => {
          if (options.shouldFail) {
            throw new ProviderError(
              name as any,
              options.failMessage ?? "Mock failure",
            );
          }
          return { safe: true, categories: [], confidence: 1.0 };
        })
      : undefined,
  };
}

// =============================================================================
// TASK ROUTING
// =============================================================================

describe("Task Routing", () => {
  describe("routeTask - Provider Selection", () => {
    it("should select primary provider when available", () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter"),
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      const result = routeTask("generation", providers);

      expect(result.provider).toBe("openrouter");
      expect(result.model).toBe(MODELS.DEEPSEEK_V3);
    });

    it("should use first available fallback when primary unavailable", () => {
      const providers: ProviderRegistry = {
        // No openrouter, only cloudflare-ai
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      // Embedding has CF as fallback
      const result = routeTask("embedding", providers);

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should throw when moderation has no OpenRouter provider", () => {
      const providers: ProviderRegistry = {
        // Moderation cascade is all-OpenRouter, so CF-only won't help
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      expect(() => routeTask("moderation", providers)).toThrow(
        "No providers available",
      );
    });

    it("should throw when no providers are available", () => {
      const providers: ProviderRegistry = {};

      expect(() => routeTask("generation", providers)).toThrow(
        "No providers available",
      );
    });

    it("should respect model override", () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter"),
      };

      const result = routeTask("generation", providers, "custom/model");

      expect(result.model).toBe("custom/model");
      expect(result.provider).toBe("openrouter");
    });
  });

  describe("routeTask - All Task Types", () => {
    it("should route all task types correctly", () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter"),
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      const tasks = [
        "generation",
        "summary",
        "chat",
        "image",
        "code",
        "moderation",
        "embedding",
      ] as const;

      for (const task of tasks) {
        const result = routeTask(task, providers);
        const config = getTaskConfig(task);

        expect(result.provider).toBe(config.primaryProvider);
        expect(result.model).toBe(config.primaryModel);
      }
    });
  });
});

// =============================================================================
// FALLBACK EXECUTION
// =============================================================================

describe("Fallback Execution", () => {
  describe("executeWithFallback - Success Paths", () => {
    it("should succeed with primary provider", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter"),
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      const result = await executeWithFallback(
        "generation",
        [{ role: "user", content: "Hello" }],
        providers,
      );

      expect(result.provider).toBe("openrouter");
      expect(result.response.content).toContain("openrouter");
    });

    it("should apply custom options", async () => {
      const mockProvider = createMockProvider("openrouter");
      const providers: ProviderRegistry = { openrouter: mockProvider };

      await executeWithFallback(
        "generation",
        [{ role: "user", content: "Hello" }],
        providers,
        { maxTokens: 500, temperature: 0.5 },
      );

      expect(mockProvider.inference).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          maxTokens: 500,
          temperature: 0.5,
        }),
      );
    });
  });

  describe("executeWithFallback - Fallback Behavior", () => {
    it("should fallback to second model when primary fails", async () => {
      // Embedding has cross-provider fallback (OpenRouter → CF)
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          shouldFail: true,
          failMessage: "OpenRouter down",
        }),
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      const result = await executeWithFallback(
        "embedding",
        [{ role: "user", content: "Test" }],
        providers,
      );

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should try all models in all-OpenRouter cascade", async () => {
      // Moderation cascade is all-OpenRouter:
      // GPT-oss Safeguard → LlamaGuard 4 → DeepSeek V3.2
      // When the provider itself fails, all three attempts fail
      const failingOpenRouter = createMockProvider("openrouter", {
        shouldFail: true,
      });

      const providers: ProviderRegistry = {
        openrouter: failingOpenRouter,
      };

      await expect(
        executeWithFallback(
          "moderation",
          [{ role: "user", content: "Test" }],
          providers,
        ),
      ).rejects.toThrow(AllProvidersFailedError);

      // Should have tried all 3 models in the cascade (primary + 2 fallbacks)
      expect(failingOpenRouter.inference).toHaveBeenCalledTimes(3);
    });

    it("should throw AllProvidersFailedError when all fail", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          shouldFail: true,
          failMessage: "OR error",
        }),
      };

      await expect(
        executeWithFallback(
          "moderation",
          [{ role: "user", content: "Test" }],
          providers,
        ),
      ).rejects.toThrow(AllProvidersFailedError);
    });

    it("should include all attempts in AllProvidersFailedError", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          shouldFail: true,
          failMessage: "OR error",
        }),
      };

      try {
        await executeWithFallback(
          "moderation",
          [{ role: "user", content: "Test" }],
          providers,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AllProvidersFailedError);
        const error = err as AllProvidersFailedError;
        // All 3 models in the cascade attempted through OpenRouter
        expect(error.attempts.length).toBe(3);
        expect(error.attempts.every((a) => a.provider === "openrouter")).toBe(
          true,
        );
      }
    });
  });
});

// =============================================================================
// SPECIALIZED EXECUTION
// =============================================================================

describe("Specialized Execution", () => {
  describe("executeEmbedding - Fallback Chain", () => {
    it("should use primary embedding provider", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", { hasEmbed: true }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasEmbed: true,
        }),
      };

      const result = await executeEmbedding("test text", providers);

      expect(result.provider).toBe("openrouter");
      expect(result.embeddings).toBeDefined();
    });

    it("should fallback when primary fails", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          hasEmbed: true,
          shouldFail: true,
        }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasEmbed: true,
        }),
      };

      const result = await executeEmbedding("test text", providers);

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should skip providers without embed method", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", { hasEmbed: false }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasEmbed: true,
        }),
      };

      const result = await executeEmbedding("test text", providers);

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should handle array input", async () => {
      const mockProvider = createMockProvider("openrouter", { hasEmbed: true });
      const providers: ProviderRegistry = { openrouter: mockProvider };

      await executeEmbedding(["text 1", "text 2"], providers);

      expect(mockProvider.embed).toHaveBeenCalledWith(expect.any(String), [
        "text 1",
        "text 2",
      ]);
    });
  });

  describe("executeModeration - Fallback Chain", () => {
    it("should use primary moderation provider", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", { hasModerate: true }),
      };

      const result = await executeModeration("test content", providers);

      expect(result.provider).toBe("openrouter");
      expect(result.safe).toBe(true);
    });

    it("should try all cascade models when provider fails", async () => {
      // All moderation models route through OpenRouter
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          hasModerate: true,
          shouldFail: true,
        }),
      };

      await expect(
        executeModeration("test content", providers),
      ).rejects.toThrow(AllProvidersFailedError);
    });

    it("should skip providers without moderate method", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", { hasModerate: false }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasModerate: true,
        }),
      };

      // OpenRouter skipped (no moderate), CF not in moderation cascade
      await expect(
        executeModeration("test content", providers),
      ).rejects.toThrow(AllProvidersFailedError);
    });

    it("should respect model override", async () => {
      const mockProvider = createMockProvider("openrouter", {
        hasModerate: true,
      });
      const providers: ProviderRegistry = { openrouter: mockProvider };

      await executeModeration("test", providers, "custom/guard-model");

      expect(mockProvider.moderate).toHaveBeenCalledWith(
        "custom/guard-model",
        "test",
      );
    });
  });
});
