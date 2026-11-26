/**
 * Which model serves which task.
 *
 * A decision, not a fact: the models exist whether or not we route to them, but
 * "summary uses DeepSeek V4.1 Flash and falls back to Qwen" is Grove's choice,
 * and it belongs somewhere a person can read it (#1602).
 */

import { MODELS } from "./models.js";

/** The providers Grove can route to. */
export type LumenProviderName = "openrouter" | "cloudflare-ai";

/**
 * Task types that map to a model.
 *
 * Each has a primary provider and fallback chain in `TASK_REGISTRY`.
 */
export type LumenTask =
	| "moderation" // Content safety → GPT-oss Safeguard (OpenRouter)
	| "generation" // Text generation → DeepSeek V4.1 Flash (OpenRouter)
	| "summary" // Summarization → DeepSeek V4.1 Flash (OpenRouter)
	| "embedding" // Vector embeddings → Perplexity Embed (OpenRouter)
	| "chat" // Conversational → DeepSeek V4.1 Flash (OpenRouter)
	| "image" // Image analysis → Claude Haiku 5.5 via OpenRouter
	| "code" // Code tasks → DeepSeek V4.1 Flash via OpenRouter
	| "transcription" // Voice-to-text → Whisper (CF Workers AI)
	/**
	 * A step in an agent loop: a tool-using model that is expected to call
	 * something rather than answer. Separate from `chat` because it needs its
	 * own model (one that supports tools), its own quota line, and its own
	 * Songbird context.
	 *
	 * Its quota is 0 on every tier until a real rule exists, so a caller has to
	 * pass `skipQuota`. That is deliberate: a ten-step run would otherwise cost
	 * ten requests against a limit meant for one answer.
	 */
	| "agent";

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
		// Also the ceiling the router falls back to when a caller's larger
		// max_tokens is refused by the provider (router.ts, isMaxTokensRejection).
		// 1024 was too tight for the timeline envelope — brief + detailed + gutter
		// as valid JSON — so a downgraded request would have come back truncated.
		defaultMaxTokens: 4096,
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

	// Agent loop step (DeepSeek V4.1 Flash)
	//
	// No fallback chain, on purpose. The router skips fallbacks whenever tools
	// are present (`skipFallbacks = !!options.model || !!options.tools`), because
	// tool schemas are model-specific — so a chain here could never run for the
	// task it is defined for. Fallback for agent calls lives in the caller
	// (Lyra decision 58), not in Lumen.
	agent: {
		primaryModel: MODELS.DEEPSEEK_V4_1_FLASH,
		primaryProvider: "openrouter",
		fallbackChain: [],
		// A reasoning model spends this allowance thinking before it writes a word, and
		// a turn that runs out mid-thought comes back as a successful reply with no
		// text (#1831). The same ceiling fixed compaction for the same reason; 4096 was
		// too small for a 42k-character day, which is what the timeline sends.
		defaultMaxTokens: 16_384,
		defaultTemperature: 0.2,
		description: "One step of an agent loop: a tool-using turn",
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

/** Get a task's configuration. */
export function getTaskConfig(task: LumenTask): TaskConfig {
	return TASK_REGISTRY[task];
}

/** Every model ID a provider serves, across every task and fallback. */
export function getModelsForProvider(provider: LumenProviderName): string[] {
	const models: string[] = [];

	for (const config of Object.values(TASK_REGISTRY)) {
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
