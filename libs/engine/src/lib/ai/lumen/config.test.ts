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
		expect(MODELS.DEEPSEEK_V4_1_FLASH).toContain("deepseek");
		expect(MODELS.QWEN3_8_FLASH).toContain("qwen");
		expect(MODELS.LLAMA_3_1_8B).toContain("llama");
		expect(MODELS.KIMI_K2_7_CODE).toContain("kimi");

		// Vision
		expect(MODELS.CLAUDE_HAIKU_55).toContain("claude");
		expect(MODELS.GEMMA_4_26B).toContain("gemma");

		// Moderation
		expect(MODELS.GPT_OSS_SAFEGUARD).toContain("gpt-oss-safeguard");
		expect(MODELS.LLAMAGUARD_4).toContain("llama-guard");

		// Embeddings
		expect(MODELS.PPLX_EMBED_0_6B).toContain("pplx-embed");
		expect(MODELS.BGE_M3).toContain("bge");
	});

	it("should have Cloudflare fallback models", () => {
		expect(MODELS.CF_SHIELDGEMMA).toContain("@");
		expect(MODELS.CF_BGE_BASE).toContain("@cf/");
		expect(MODELS.CF_LLAMAGUARD_3).toContain("@cf/");
	});

	it("should use proper model ID format", () => {
		// OpenRouter models: provider/model-name
		expect(MODELS.DEEPSEEK_V4_1_FLASH).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/i);
		expect(MODELS.CLAUDE_HAIKU_55).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/i);

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
		"transcription",
		"agent",
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

		// All tasks except transcription use OpenRouter as primary
		const cfTasks = allTasks.filter(
			(task) => TASK_REGISTRY[task].primaryProvider === "cloudflare-ai",
		);
		expect(openRouterPrimary.length + cfTasks.length).toBe(allTasks.length);
		expect(cfTasks).toEqual(["transcription"]);
	});

	it("gives the agent task no fallback chain, because it could never run", () => {
		// The router skips fallbacks whenever tools are present, and the agent task
		// exists to carry tools. A chain here would be decoration; fallback for
		// agent calls lives in the caller (Lyra decision 58).
		expect(TASK_REGISTRY.agent.fallbackChain).toEqual([]);
		expect(TASK_REGISTRY.agent.defaultMaxTokens).toBeGreaterThan(0);
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
		it("should use DeepSeek V4.1 Flash as primary", () => {
			expect(TASK_REGISTRY.generation.primaryModel).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
			expect(TASK_REGISTRY.summary.primaryModel).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
			expect(TASK_REGISTRY.chat.primaryModel).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
		});

		it("should have consistent fallback chain", () => {
			const genFallbacks = TASK_REGISTRY.generation.fallbackChain;
			const sumFallbacks = TASK_REGISTRY.summary.fallbackChain;

			// Generation and summary should have similar fallbacks
			expect(genFallbacks.some((f) => f.model === MODELS.QWEN3_8_FLASH)).toBe(true);
			expect(sumFallbacks.some((f) => f.model === MODELS.QWEN3_8_FLASH)).toBe(true);
		});
	});

	describe("Moderation Task", () => {
		it("should use GPT-oss Safeguard as primary", () => {
			expect(TASK_REGISTRY.moderation.primaryModel).toBe(MODELS.GPT_OSS_SAFEGUARD);
		});

		it("should have LlamaGuard 4 and DeepSeek V3 as fallbacks", () => {
			const fallbacks = TASK_REGISTRY.moderation.fallbackChain;

			expect(fallbacks[0].model).toBe(MODELS.LLAMAGUARD_4);
			expect(fallbacks[1].model).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
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
		it("should use Perplexity Embed 0.6B as primary", () => {
			expect(TASK_REGISTRY.embedding.primaryModel).toBe(MODELS.PPLX_EMBED_0_6B);
		});

		it("should have maxTokens of 0 (not applicable)", () => {
			expect(TASK_REGISTRY.embedding.defaultMaxTokens).toBe(0);
		});

		it("should keep the fallback dimension-compatible", () => {
			const fallbacks = TASK_REGISTRY.embedding.fallbackChain;
			const lastFallback = fallbacks[fallbacks.length - 1];

			// BGE-M3 is also 1024-dim, so a fallback cannot change vector shape.
			expect(lastFallback.provider).toBe("openrouter");
			expect(lastFallback.model).toBe(MODELS.BGE_M3);
		});
	});

	describe("Image Task", () => {
		it("should use Claude Haiku 5.5 as primary", () => {
			expect(TASK_REGISTRY.image.primaryModel).toBe(MODELS.CLAUDE_HAIKU_55);
		});

		it("should have Gemma 4 as fallback", () => {
			const fallbacks = TASK_REGISTRY.image.fallbackChain;
			expect(fallbacks.some((f) => f.model === MODELS.GEMMA_4_26B)).toBe(true);
		});

		it("should use low temperature for accurate descriptions", () => {
			expect(TASK_REGISTRY.image.defaultTemperature).toBeLessThanOrEqual(0.3);
		});
	});

	describe("Code Task", () => {
		it("should use DeepSeek as primary", () => {
			expect(TASK_REGISTRY.code.primaryModel).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
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
		const primaryModels = Object.values(TASK_REGISTRY).map((config) => config.primaryModel);

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
		// The last-resort fallback should be the cheapest paid model
		const deepseekCost = MODEL_COSTS[MODELS.DEEPSEEK_V4_1_FLASH];
		const llamaCost = MODEL_COSTS[MODELS.LLAMA_3_1_8B];

		expect(llamaCost.input).toBeLessThan(deepseekCost.input);
		expect(llamaCost.output).toBeLessThan(deepseekCost.output);
	});
});

describe("getModelCost", () => {
	it("should return costs for known models", () => {
		// Read from the registry rather than repeating a price here: the numbers move
		// (they were wrong until 2026-11-24) and a test should not be a second copy of
		// them. #1822 is where the underlying brittleness lives.
		const cost = getModelCost(MODELS.DEEPSEEK_V4_1_FLASH);
		expect(cost.input).toBe(MODEL_COSTS[MODELS.DEEPSEEK_V4_1_FLASH].input);
		expect(cost.output).toBe(MODEL_COSTS[MODELS.DEEPSEEK_V4_1_FLASH].output);
	});

	it("should return default $1/M for unknown models", () => {
		const cost = getModelCost("unknown/model");
		expect(cost.input).toBe(1.0);
		expect(cost.output).toBe(1.0);
	});
});

describe("calculateCost", () => {
	it("should calculate cost correctly", () => {
		const { input, output } = MODEL_COSTS[MODELS.DEEPSEEK_V4_1_FLASH];
		const cost = calculateCost(MODELS.DEEPSEEK_V4_1_FLASH, 1_000_000, 1_000_000);

		expect(cost).toBeCloseTo(input + output, 5);
	});

	it("should handle small token counts", () => {
		const { input, output } = MODEL_COSTS[MODELS.DEEPSEEK_V4_1_FLASH];
		// 1000 tokens = 0.001M tokens. The assertion is the function's own contract
		// (six decimals, so sub-cent costs do not carry float tails) rather than a
		// higher precision than it promises — the price changed under this test when
		// the catalog arrived (#1822) and the old tolerance was only "passing"
		// because the two prices happened to sum to an exact 6-decimal figure.
		const exact = (input + output) / 1000;
		const cost = calculateCost(MODELS.DEEPSEEK_V4_1_FLASH, 1000, 1000);

		// Within a rounding step of the exact figure, and holding no more than six
		// decimals — which is what the function promises.
		expect(Math.abs(cost - exact)).toBeLessThan(1e-6);
		expect(Number(cost.toFixed(6))).toBe(cost);
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

		expect(config.primaryModel).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
		expect(config.primaryProvider).toBe("openrouter");
	});
});

describe("getModelsForProvider", () => {
	it("should return all OpenRouter models", () => {
		const models = getModelsForProvider("openrouter");

		expect(models).toContain(MODELS.DEEPSEEK_V4_1_FLASH);
		expect(models).toContain(MODELS.CLAUDE_HAIKU_55);
		expect(models).toContain(MODELS.GPT_OSS_SAFEGUARD);
		expect(models).toContain(MODELS.LLAMAGUARD_4);
		expect(models).toContain(MODELS.PPLX_EMBED_0_6B);
	});

	it("should return Cloudflare models", () => {
		const models = getModelsForProvider("cloudflare-ai");

		expect(models).toContain(MODELS.CF_LLAMA4_SCOUT);
		expect(models).toContain(MODELS.CF_WHISPER_TURBO);
	});

	it("should deduplicate models", () => {
		const models = getModelsForProvider("openrouter");
		const uniqueModels = [...new Set(models)];

		expect(models.length).toBe(uniqueModels.length);
	});
});
