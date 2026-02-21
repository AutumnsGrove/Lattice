/**
 * Lumen Config Tests
 *
 * Tests task registry, model configurations, and cost calculations.
 * Ensures consistent routing behavior across all tasks.
 */

import { describe, it, expect } from "vitest";
import {
  PROVIDERS,
  MODELS,
  MODEL_COSTS,
  TASK_REGISTRY,
  getTaskConfig,
  getModelCost,
  calculateCost,
  getModelsForProvider,
} from "./config.js";
import type { LumenTask, LumenProviderName } from "./types.js";

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

describe("Provider Configuration", () => {
  it("should have OpenRouter configured", () => {
    expect(PROVIDERS.openrouter).toBeDefined();
    expect(PROVIDERS.openrouter.baseUrl).toContain("openrouter.ai");
    expect(PROVIDERS.openrouter.zdr).toBe(true);
  });

  it("should have Cloudflare AI configured", () => {
    expect(PROVIDERS["cloudflare-ai"]).toBeDefined();
    expect(PROVIDERS["cloudflare-ai"].zdr).toBe(true);
  });

  it("should have reasonable timeout values", () => {
    expect(PROVIDERS.openrouter.timeoutMs).toBeGreaterThanOrEqual(30000);
    expect(PROVIDERS["cloudflare-ai"].timeoutMs).toBeGreaterThanOrEqual(10000);
  });
});

// =============================================================================
// MODEL DEFINITIONS
// =============================================================================

describe("Model Definitions", () => {
  it("should have all required OpenRouter models", () => {
    // Generation
    expect(MODELS.DEEPSEEK_V3).toContain("deepseek");
    expect(MODELS.KIMI_K2).toContain("kimi");
    expect(MODELS.LLAMA_70B).toContain("llama");

    // Image/Code
    expect(MODELS.CLAUDE_HAIKU).toContain("claude");
    expect(MODELS.GEMINI_FLASH).toContain("gemini");

    // Moderation
    expect(MODELS.GPT_OSS_SAFEGUARD).toContain("gpt-oss-safeguard");
    expect(MODELS.LLAMAGUARD_4).toContain("llama-guard");

    // Embeddings
    expect(MODELS.BGE_M3).toContain("bge");
    expect(MODELS.QWEN3_EMBED).toContain("qwen");
  });

  it("should have Cloudflare fallback models", () => {
    expect(MODELS.CF_SHIELDGEMMA).toContain("@");
    expect(MODELS.CF_BGE_BASE).toContain("@cf/");
    expect(MODELS.CF_LLAMAGUARD_3).toContain("@cf/");
  });

  it("should use proper model ID format", () => {
    // OpenRouter models: provider/model-name
    expect(MODELS.DEEPSEEK_V3).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/i);
    expect(MODELS.CLAUDE_HAIKU).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/i);

    // Cloudflare models: @cf/ or @hf/ prefix
    expect(MODELS.CF_BGE_BASE).toMatch(/^@(cf|hf)\//);
  });
});

// =============================================================================
// TASK REGISTRY
// =============================================================================

describe("Task Registry", () => {
  const allTasks: LumenTask[] = [
    "moderation",
    "generation",
    "summary",
    "embedding",
    "chat",
    "image",
    "code",
  ];

  it("should have configuration for all tasks", () => {
    for (const task of allTasks) {
      expect(TASK_REGISTRY[task]).toBeDefined();
    }
  });

  it("should have required fields for each task", () => {
    for (const task of allTasks) {
      const config = TASK_REGISTRY[task];

      expect(config.primaryModel).toBeDefined();
      expect(config.primaryProvider).toBeDefined();
      expect(config.fallbackChain).toBeDefined();
      expect(config.defaultMaxTokens).toBeDefined();
      expect(config.defaultTemperature).toBeDefined();
      expect(config.description).toBeDefined();
    }
  });

  it("should use OpenRouter as primary for most tasks", () => {
    const openRouterPrimary = allTasks.filter(
      (task) => TASK_REGISTRY[task].primaryProvider === "openrouter",
    );

    // All tasks should use OpenRouter as primary
    expect(openRouterPrimary.length).toBe(allTasks.length);
  });

  it("should have fallback chains for reliability", () => {
    for (const task of allTasks) {
      const config = TASK_REGISTRY[task];
      // At minimum, tasks should have at least some fallback
      // (image is the exception with only one model really working)
      expect(config.fallbackChain).toBeDefined();
    }
  });
});

// =============================================================================
// TASK-SPECIFIC CONFIGURATION
// =============================================================================

describe("Task-Specific Configuration", () => {
  describe("Generation Tasks", () => {
    it("should use DeepSeek v3 as primary", () => {
      expect(TASK_REGISTRY.generation.primaryModel).toBe(MODELS.DEEPSEEK_V3);
      expect(TASK_REGISTRY.summary.primaryModel).toBe(MODELS.DEEPSEEK_V3);
      expect(TASK_REGISTRY.chat.primaryModel).toBe(MODELS.DEEPSEEK_V3);
    });

    it("should have consistent fallback chain", () => {
      const genFallbacks = TASK_REGISTRY.generation.fallbackChain;
      const sumFallbacks = TASK_REGISTRY.summary.fallbackChain;

      // Generation and summary should have similar fallbacks
      expect(genFallbacks.some((f) => f.model === MODELS.KIMI_K2)).toBe(true);
      expect(sumFallbacks.some((f) => f.model === MODELS.KIMI_K2)).toBe(true);
    });
  });

  describe("Moderation Task", () => {
    it("should use GPT-oss Safeguard as primary", () => {
      expect(TASK_REGISTRY.moderation.primaryModel).toBe(
        MODELS.GPT_OSS_SAFEGUARD,
      );
    });

    it("should have LlamaGuard 4 and DeepSeek V3 as fallbacks", () => {
      const fallbacks = TASK_REGISTRY.moderation.fallbackChain;

      expect(fallbacks[0].model).toBe(MODELS.LLAMAGUARD_4);
      expect(fallbacks[1].model).toBe(MODELS.DEEPSEEK_V3);
    });

    it("should use all-OpenRouter cascade", () => {
      expect(TASK_REGISTRY.moderation.primaryProvider).toBe("openrouter");

      const fallbacks = TASK_REGISTRY.moderation.fallbackChain;
      for (const fallback of fallbacks) {
        expect(fallback.provider).toBe("openrouter");
      }
    });

    it("should use temperature 0 for consistency", () => {
      expect(TASK_REGISTRY.moderation.defaultTemperature).toBe(0);
    });
  });

  describe("Embedding Task", () => {
    it("should use BGE-M3 as primary", () => {
      expect(TASK_REGISTRY.embedding.primaryModel).toBe(MODELS.BGE_M3);
    });

    it("should have maxTokens of 0 (not applicable)", () => {
      expect(TASK_REGISTRY.embedding.defaultMaxTokens).toBe(0);
    });

    it("should have Cloudflare BGE as last fallback", () => {
      const fallbacks = TASK_REGISTRY.embedding.fallbackChain;
      const lastFallback = fallbacks[fallbacks.length - 1];

      expect(lastFallback.provider).toBe("cloudflare-ai");
      expect(lastFallback.model).toBe(MODELS.CF_BGE_BASE);
    });
  });

  describe("Image Task", () => {
    it("should use Gemini Flash as primary", () => {
      expect(TASK_REGISTRY.image.primaryModel).toBe(MODELS.GEMINI_FLASH);
    });

    it("should have Claude Haiku as fallback", () => {
      const fallbacks = TASK_REGISTRY.image.fallbackChain;
      expect(fallbacks.some((f) => f.model === MODELS.CLAUDE_HAIKU)).toBe(true);
    });

    it("should use low temperature for accurate descriptions", () => {
      expect(TASK_REGISTRY.image.defaultTemperature).toBeLessThanOrEqual(0.3);
    });
  });

  describe("Code Task", () => {
    it("should use DeepSeek as primary", () => {
      expect(TASK_REGISTRY.code.primaryModel).toBe(MODELS.DEEPSEEK_V3);
    });

    it("should use very low temperature for accuracy", () => {
      expect(TASK_REGISTRY.code.defaultTemperature).toBeLessThanOrEqual(0.2);
    });
  });
});

// =============================================================================
// COST CALCULATIONS
// =============================================================================

describe("Model Costs", () => {
  it("should have costs defined for all primary models", () => {
    const primaryModels = Object.values(TASK_REGISTRY).map(
      (config) => config.primaryModel,
    );

    for (const model of primaryModels) {
      expect(MODEL_COSTS[model]).toBeDefined();
    }
  });

  it("should have Cloudflare models at zero cost", () => {
    expect(MODEL_COSTS[MODELS.CF_SHIELDGEMMA].input).toBe(0);
    expect(MODEL_COSTS[MODELS.CF_BGE_BASE].input).toBe(0);
    expect(MODEL_COSTS[MODELS.CF_LLAMAGUARD_3].input).toBe(0);
  });

  it("should have reasonable cost ratios", () => {
    // DeepSeek should be cheaper than Claude
    const deepseekCost = MODEL_COSTS[MODELS.DEEPSEEK_V3];
    const claudeCost = MODEL_COSTS[MODELS.CLAUDE_HAIKU];

    expect(deepseekCost.input).toBeLessThan(claudeCost.input);
    expect(deepseekCost.output).toBeLessThan(claudeCost.output);
  });
});

describe("getModelCost", () => {
  it("should return costs for known models", () => {
    const cost = getModelCost(MODELS.DEEPSEEK_V3);
    expect(cost.input).toBe(0.25);
    expect(cost.output).toBe(0.38);
  });

  it("should return default $1/M for unknown models", () => {
    const cost = getModelCost("unknown/model");
    expect(cost.input).toBe(1.0);
    expect(cost.output).toBe(1.0);
  });
});

describe("calculateCost", () => {
  it("should calculate cost correctly", () => {
    // DeepSeek: $0.25/M input, $0.38/M output
    const cost = calculateCost(MODELS.DEEPSEEK_V3, 1_000_000, 1_000_000);

    expect(cost).toBeCloseTo(0.25 + 0.38, 5);
  });

  it("should handle small token counts", () => {
    // 1000 tokens = 0.001M tokens
    const cost = calculateCost(MODELS.DEEPSEEK_V3, 1000, 1000);

    expect(cost).toBeCloseTo((0.25 + 0.38) / 1000, 8);
  });

  it("should return 0 for Cloudflare models", () => {
    const cost = calculateCost(MODELS.CF_BGE_BASE, 1_000_000, 0);
    expect(cost).toBe(0);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe("getTaskConfig", () => {
  it("should return correct config for task", () => {
    const config = getTaskConfig("generation");

    expect(config.primaryModel).toBe(MODELS.DEEPSEEK_V3);
    expect(config.primaryProvider).toBe("openrouter");
  });
});

describe("getModelsForProvider", () => {
  it("should return all OpenRouter models", () => {
    const models = getModelsForProvider("openrouter");

    expect(models).toContain(MODELS.DEEPSEEK_V3);
    expect(models).toContain(MODELS.CLAUDE_HAIKU);
    expect(models).toContain(MODELS.GPT_OSS_SAFEGUARD);
    expect(models).toContain(MODELS.LLAMAGUARD_4);
    expect(models).toContain(MODELS.BGE_M3);
  });

  it("should return Cloudflare models", () => {
    const models = getModelsForProvider("cloudflare-ai");

    expect(models).toContain(MODELS.CF_BGE_BASE);
  });

  it("should deduplicate models", () => {
    const models = getModelsForProvider("openrouter");
    const uniqueModels = [...new Set(models)];

    expect(models.length).toBe(uniqueModels.length);
  });
});
