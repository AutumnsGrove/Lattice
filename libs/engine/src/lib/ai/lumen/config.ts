/**
 * Lumen AI Gateway - Configuration
 *
 * Task registry and model configurations.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODEL UPDATES: To change models, update lumen-models.json in lib/data/.
 * Each task has a primary model and a fallback chain. OpenRouter model IDs
 * can be found at: https://openrouter.ai/models
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LumenProviderConfig, LumenProviderName, LumenTask } from "./types.js";
import modelData from "../../data/lumen-models.json";

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const PROVIDERS: Record<LumenProviderName, LumenProviderConfig> = {
	openrouter: {
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		zdr: true, // OpenRouter partners have ZDR agreements
		timeoutMs: 120000, // 120 seconds for long generations
	},
	"cloudflare-ai": {
		name: "Cloudflare Workers AI",
		baseUrl: "", // Uses binding, not HTTP
		zdr: true, // Data stays in CF network
		timeoutMs: 30000, // 30 seconds
	},
};

// =============================================================================
// MODEL DEFINITIONS — sourced from lumen-models.json
// =============================================================================

type ModelKey = keyof typeof modelData.models;

/** Resolve a model ID from the centralized JSON registry */
function m(key: ModelKey): string {
	return modelData.models[key].id;
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  CENTRALIZED MODEL REGISTRY                                                │
 * │                                                                             │
 * │  All model IDs are defined in: libs/engine/src/lib/data/lumen-models.json  │
 * │  This constant maps friendly keys to their OpenRouter/CF model IDs.        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const MODELS = {
	// OpenRouter — Generation, Chat, Summary
	DEEPSEEK_V4_1_FLASH: m("DEEPSEEK_V4_1_FLASH"),
	QWEN3_8_FLASH: m("QWEN3_8_FLASH"),
	LLAMA_3_1_8B: m("LLAMA_3_1_8B"),
	KIMI_K2_7_CODE: m("KIMI_K2_7_CODE"),

	// OpenRouter — Vision
	CLAUDE_HAIKU_55: m("CLAUDE_HAIKU_55"),
	GEMMA_4_26B: m("GEMMA_4_26B"),

	// OpenRouter — Moderation
	GPT_OSS_SAFEGUARD: m("GPT_OSS_SAFEGUARD"),
	LLAMAGUARD_4: m("LLAMAGUARD_4"),

	// OpenRouter — Embeddings
	PPLX_EMBED_0_6B: m("PPLX_EMBED_0_6B"),
	BGE_M3: m("BGE_M3"),

	// Cloudflare Workers AI (last-resort fallbacks)
	CF_SHIELDGEMMA: m("CF_SHIELDGEMMA"),
	CF_BGE_BASE: m("CF_BGE_BASE"),
	CF_LLAMAGUARD_3: m("CF_LLAMAGUARD_3"),
	CF_LLAMA4_SCOUT: m("CF_LLAMA4_SCOUT"),

	// Cloudflare Workers AI — Transcription (Whisper)
	CF_WHISPER_TURBO: m("CF_WHISPER_TURBO"),
	CF_WHISPER: m("CF_WHISPER"),
	CF_WHISPER_TINY: m("CF_WHISPER_TINY"),
} as const;

// =============================================================================
// COST TRACKING (USD per million tokens) — sourced from lumen-models.json
// =============================================================================

/**
 * Cost per million tokens for each model.
 * Auto-generated from lumen-models.json — update costs there.
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = Object.fromEntries(
	Object.values(modelData.models).map((model) => [model.id, model.cost]),
);

// =============================================================================
// TASK REGISTRY
// =============================================================================

export interface TaskConfig {
	/** Primary model to use */
	primaryModel: string;

	/** Primary provider */
	primaryProvider: LumenProviderName;

	/** Fallback chain (tried in order if primary fails) */
	fallbackChain: Array<{
		provider: LumenProviderName;
		model: string;
	}>;

	/** Default max tokens for this task */
	defaultMaxTokens: number;

	/** Default temperature for this task */
	defaultTemperature: number;

	/** Description for logging/debugging */
	description: string;
}

/**
 * Task registry mapping task types to provider/model configurations.
 * Each task has optimal defaults and a fallback chain.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  FALLBACK STRATEGY                                                          │
 * │                                                                             │
 * │  Primary: OpenRouter (best quality, most options)                           │
 * │  Fallback: another OpenRouter model, then Cloudflare Workers AI last       │
 * │                                                                             │
 * │  Each task tries models in order until one succeeds.                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const TASK_REGISTRY: Record<LumenTask, TaskConfig> = {
	// Content Moderation (GPT-oss Safeguard → LlamaGuard 4 → DeepSeek V4.1 Flash)
	moderation: {
		primaryModel: MODELS.GPT_OSS_SAFEGUARD,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.LLAMAGUARD_4 },
			{ provider: "openrouter", model: MODELS.DEEPSEEK_V4_1_FLASH },
		],
		defaultMaxTokens: 512,
		defaultTemperature: 0,
		description: "Content safety classification",
	},

	// Text Generation (DeepSeek V4.1 Flash → Qwen3.8 Flash → Llama 3.1 8B)
	generation: {
		primaryModel: MODELS.DEEPSEEK_V4_1_FLASH,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.QWEN3_8_FLASH },
			{ provider: "openrouter", model: MODELS.LLAMA_3_1_8B },
		],
		defaultMaxTokens: 2048,
		defaultTemperature: 0.7,
		description: "General text generation",
	},

	// Summarization (DeepSeek V4.1 Flash → Qwen3.8 Flash → Llama 3.1 8B)
	summary: {
		primaryModel: MODELS.DEEPSEEK_V4_1_FLASH,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.QWEN3_8_FLASH },
			{ provider: "openrouter", model: MODELS.LLAMA_3_1_8B },
		],
		defaultMaxTokens: 1024,
		defaultTemperature: 0.3,
		description: "Content summarization",
	},

	// Embeddings (Perplexity 0.6B → BGE-M3, both 1024-dim)
	// Kept dimension-compatible so a fallback cannot change vector shape.
	embedding: {
		primaryModel: MODELS.PPLX_EMBED_0_6B,
		primaryProvider: "openrouter",
		fallbackChain: [{ provider: "openrouter", model: MODELS.BGE_M3 }],
		defaultMaxTokens: 0,
		defaultTemperature: 0,
		description: "Text embeddings for semantic search",
	},

	// Chat/Conversational (DeepSeek V4.1 Flash → Qwen3.8 Flash → Llama 3.1 8B)
	chat: {
		primaryModel: MODELS.DEEPSEEK_V4_1_FLASH,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.QWEN3_8_FLASH },
			{ provider: "openrouter", model: MODELS.LLAMA_3_1_8B },
		],
		defaultMaxTokens: 4096,
		defaultTemperature: 0.8,
		description: "Conversational AI",
	},

	// Image Analysis (Claude Haiku 5.5 → Gemma 4 26B → CF Llama 4 Scout)
	image: {
		primaryModel: MODELS.CLAUDE_HAIKU_55,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.GEMMA_4_26B },
			{ provider: "cloudflare-ai", model: MODELS.CF_LLAMA4_SCOUT },
		],
		defaultMaxTokens: 1024,
		defaultTemperature: 0.2,
		description: "Image analysis and description",
	},

	// Code Tasks (DeepSeek V4.1 Flash → Claude Haiku 5.5 → Kimi K2.7 Code)
	code: {
		primaryModel: MODELS.DEEPSEEK_V4_1_FLASH,
		primaryProvider: "openrouter",
		fallbackChain: [
			{ provider: "openrouter", model: MODELS.CLAUDE_HAIKU_55 },
			{ provider: "openrouter", model: MODELS.KIMI_K2_7_CODE },
		],
		defaultMaxTokens: 4096,
		defaultTemperature: 0.1,
		description: "Code generation and analysis",
	},

	// Transcription (CF Whisper Turbo → Whisper → Whisper Tiny)
	transcription: {
		primaryModel: MODELS.CF_WHISPER_TURBO,
		primaryProvider: "cloudflare-ai",
		fallbackChain: [
			{ provider: "cloudflare-ai", model: MODELS.CF_WHISPER },
			{ provider: "cloudflare-ai", model: MODELS.CF_WHISPER_TINY },
		],
		defaultMaxTokens: 0,
		defaultTemperature: 0,
		description: "Voice-to-text transcription",
	},
};

// =============================================================================
// HELPERS
// =============================================================================

/** Get task configuration */
export function getTaskConfig(task: LumenTask): TaskConfig {
	return TASK_REGISTRY[task];
}

/** Get model cost per million tokens */
export function getModelCost(model: string): { input: number; output: number } {
	return MODEL_COSTS[model] ?? { input: 1.0, output: 1.0 };
}

/**
 * Calculate cost for a request
 *
 * Uses 6 decimal places of precision to avoid floating-point errors
 * while maintaining sub-cent accuracy for billing purposes.
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const costs = getModelCost(model);
	const inputCost = (inputTokens / 1_000_000) * costs.input;
	const outputCost = (outputTokens / 1_000_000) * costs.output;
	return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/** Get all models for a specific provider */
export function getModelsForProvider(provider: LumenProviderName): string[] {
	const models: string[] = [];
	for (const [_task, config] of Object.entries(TASK_REGISTRY)) {
		if (config.primaryProvider === provider) {
			models.push(config.primaryModel);
		}
		for (const fallback of config.fallbackChain) {
			if (fallback.provider === provider) {
				models.push(fallback.model);
			}
		}
	}
	return [...new Set(models)];
}
