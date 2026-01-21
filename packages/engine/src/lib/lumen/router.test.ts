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

      // Moderation has CF as fallback
      const result = routeTask("moderation", providers);

      expect(result.provider).toBe("cloudflare-ai");
      expect(result.model).toBe(MODELS.CF_LLAMAGUARD_3);
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
    it("should fallback when primary fails", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          shouldFail: true,
          failMessage: "OpenRouter down",
        }),
        "cloudflare-ai": createMockProvider("cloudflare-ai"),
      };

      // For generation, fallbacks are also OpenRouter models, but for moderation
      // the fallback is CF, so let's test that
      const result = await executeWithFallback(
        "moderation",
        [{ role: "user", content: "Test" }],
        providers,
      );

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should try entire fallback chain", async () => {
      // Create providers where first two fail, third succeeds
      const failingOpenRouter = createMockProvider("openrouter", {
        shouldFail: true,
      });
      const workingCF = createMockProvider("cloudflare-ai");

      const providers: ProviderRegistry = {
        openrouter: failingOpenRouter,
        "cloudflare-ai": workingCF,
      };

      // Moderation: OpenRouter LlamaGuard4 (fail) → CF LlamaGuard3 (succeed)
      const result = await executeWithFallback(
        "moderation",
        [{ role: "user", content: "Test" }],
        providers,
      );

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should throw AllProvidersFailedError when all fail", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          shouldFail: true,
          failMessage: "OR error",
        }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          shouldFail: true,
          failMessage: "CF error",
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
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          shouldFail: true,
          failMessage: "CF error",
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
        expect(error.attempts.length).toBeGreaterThanOrEqual(2);
        expect(error.attempts.some((a) => a.provider === "openrouter")).toBe(
          true,
        );
        expect(error.attempts.some((a) => a.provider === "cloudflare-ai")).toBe(
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
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasModerate: true,
        }),
      };

      const result = await executeModeration("test content", providers);

      expect(result.provider).toBe("openrouter");
      expect(result.safe).toBe(true);
    });

    it("should fallback when primary fails", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", {
          hasModerate: true,
          shouldFail: true,
        }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasModerate: true,
        }),
      };

      const result = await executeModeration("test content", providers);

      expect(result.provider).toBe("cloudflare-ai");
    });

    it("should skip providers without moderate method", async () => {
      const providers: ProviderRegistry = {
        openrouter: createMockProvider("openrouter", { hasModerate: false }),
        "cloudflare-ai": createMockProvider("cloudflare-ai", {
          hasModerate: true,
        }),
      };

      const result = await executeModeration("test content", providers);

      expect(result.provider).toBe("cloudflare-ai");
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
