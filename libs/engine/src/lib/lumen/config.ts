/**
 * Lumen AI Gateway - Configuration
 *
 * Task registry and model configurations.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODEL UPDATES: To change models, update the MODELS constant below.
 * Each task has a primary model and a fallback chain. OpenRouter model IDs
 * can be found at: https://openrouter.ai/models
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  LumenProviderConfig,
  LumenProviderName,
  LumenTask,
} from "./types.js";

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const PROVIDERS: Record<LumenProviderName, LumenProviderConfig> = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    zdr: true, // OpenRouter partners have ZDR agreements
    timeoutMs: 60000, // 60 seconds for long generations
  },
  "cloudflare-ai": {
    name: "Cloudflare Workers AI",
    baseUrl: "", // Uses binding, not HTTP
    zdr: true, // Data stays in CF network
    timeoutMs: 30000, // 30 seconds
  },
};

// =============================================================================
// MODEL DEFINITIONS
// =============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  EASILY UPDATEABLE MODEL REGISTRY                                           │
 * │                                                                             │
 * │  To update models:                                                          │
 * │  1. Find model IDs at https://openrouter.ai/models                         │
 * │  2. Update the corresponding entry below                                    │
 * │  3. Test with a simple inference call                                       │
 * │                                                                             │
 * │  Model ID format: "provider/model-name" (e.g., "deepseek/deepseek-chat")   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const MODELS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // OpenRouter Models - Generation, Chat, Summary
  // ─────────────────────────────────────────────────────────────────────────────

  /** Primary model - DeepSeek v3.2 (fast, cheap, excellent quality) */
  DEEPSEEK_V3: "deepseek/deepseek-v3.2",

  /** Secondary fallback - Kimi K2 (great reasoning, huge context) */
  KIMI_K2: "moonshotai/kimi-k2-0905",

  /** Tertiary fallback - Llama 3.3 70B (reliable open source) */
  LLAMA_70B: "meta-llama/llama-3.3-70b-instruct",

  // ─────────────────────────────────────────────────────────────────────────────
  // OpenRouter Models - Image & Code
  // ─────────────────────────────────────────────────────────────────────────────

  /** Image analysis & code fallback - Claude Haiku 4.5 (fast, vision-capable) */
  CLAUDE_HAIKU: "anthropic/claude-haiku-4.5",

  /** Image fallback - Gemini 2.5 Flash (fast, vision-capable) */
  GEMINI_FLASH: "google/gemini-2.5-flash",

  // ─────────────────────────────────────────────────────────────────────────────
  // OpenRouter Models - Moderation
  // ─────────────────────────────────────────────────────────────────────────────

  /** Content moderation - GPT-oss Safeguard 20B (policy-based safety reasoning) */
  GPT_OSS_SAFEGUARD: "openai/gpt-oss-safeguard-20b",

  /** Content moderation fallback - LlamaGuard 4 12B (safety classification) */
  LLAMAGUARD_4: "meta-llama/llama-guard-4-12b",

  // ─────────────────────────────────────────────────────────────────────────────
  // OpenRouter Models - Embeddings
  // ─────────────────────────────────────────────────────────────────────────────

  /** Primary embeddings - BGE-M3 (multilingual, high quality) */
  BGE_M3: "baai/bge-m3",

  /** Fallback embeddings - Qwen3 8B */
  QWEN3_EMBED: "qwen/qwen3-embedding-8b",

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloudflare Workers AI Models (last-resort fallbacks)
  // ─────────────────────────────────────────────────────────────────────────────

  /** CF fallback moderation - ShieldGemma 2 (4B, can self-host on RunPod) */
  CF_SHIELDGEMMA: "@hf/google/shieldgemma-2b",

  /** CF fallback embeddings - BGE Base (768 dimensions) */
  CF_BGE_BASE: "@cf/baai/bge-base-en-v1.5",

  /** CF legacy moderation - LlamaGuard 3 (only v3 available on CF) */
  CF_LLAMAGUARD_3: "@cf/meta/llama-guard-3-8b",

  /** CF vision - Llama 4 Scout (vision-capable, for image classification) */
  CF_LLAMA4_SCOUT: "@cf/meta/llama-4-scout-17b-16e-instruct",

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloudflare Workers AI Models - Transcription (Whisper)
  // ─────────────────────────────────────────────────────────────────────────────

  /** CF transcription - Whisper Large V3 Turbo (fast, accurate, multilingual) */
  CF_WHISPER_TURBO: "@cf/openai/whisper-large-v3-turbo",

  /** CF transcription - Whisper Large V3 (slower but most accurate) */
  CF_WHISPER: "@cf/openai/whisper",

  /** CF transcription - Whisper Tiny EN (English-only, fastest, lower accuracy) */
  CF_WHISPER_TINY: "@cf/openai/whisper-tiny-en",
} as const;

// =============================================================================
// COST TRACKING (USD per million tokens)
// =============================================================================

/**
 * Cost per million tokens for each model.
 * Update these when model pricing changes.
 * Prices from: https://openrouter.ai/models
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Generation models
  [MODELS.DEEPSEEK_V3]: { input: 0.25, output: 0.38 },
  [MODELS.KIMI_K2]: { input: 0.39, output: 1.9 },
  [MODELS.LLAMA_70B]: { input: 0.1, output: 0.32 },

  // Image/Code models
  [MODELS.CLAUDE_HAIKU]: { input: 1.0, output: 5.0 },
  [MODELS.GEMINI_FLASH]: { input: 0.15, output: 0.6 },

  // Moderation (OpenRouter)
  [MODELS.GPT_OSS_SAFEGUARD]: { input: 0.075, output: 0.3 },
  [MODELS.LLAMAGUARD_4]: { input: 0.1, output: 0.1 },

  // Embeddings (OpenRouter)
  [MODELS.BGE_M3]: { input: 0.02, output: 0 },
  [MODELS.QWEN3_EMBED]: { input: 0.02, output: 0 },

  // Cloudflare AI models are included in Workers pricing (effectively free)
  [MODELS.CF_SHIELDGEMMA]: { input: 0, output: 0 },
  [MODELS.CF_BGE_BASE]: { input: 0, output: 0 },
  [MODELS.CF_LLAMAGUARD_3]: { input: 0, output: 0 },
  [MODELS.CF_LLAMA4_SCOUT]: { input: 0, output: 0 },
  [MODELS.CF_WHISPER_TURBO]: { input: 0, output: 0 },
  [MODELS.CF_WHISPER]: { input: 0, output: 0 },
  [MODELS.CF_WHISPER_TINY]: { input: 0, output: 0 },
};

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
 * │  Fallback: Cloudflare Workers AI (fast, local, free as last resort)        │
 * │                                                                             │
 * │  Each task tries models in order until one succeeds.                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export const TASK_REGISTRY: Record<LumenTask, TaskConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Content Moderation (GPT-oss Safeguard → LlamaGuard 4 → DeepSeek V3.2)
  //
  // Primary: GPT-oss Safeguard 20B — specialized safety reasoning model with
  //   policy-based classification and chain-of-thought reasoning. Returns
  //   confidence scores and audit-ready reasoning traces.
  // Fallback 1: LlamaGuard 4 12B — fast binary safety classifier (safe/unsafe).
  // Fallback 2: DeepSeek V3.2 — general-purpose model as last resort.
  // ─────────────────────────────────────────────────────────────────────────────
  moderation: {
    primaryModel: MODELS.GPT_OSS_SAFEGUARD,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.LLAMAGUARD_4 },
      { provider: "openrouter", model: MODELS.DEEPSEEK_V3 },
    ],
    defaultMaxTokens: 512,
    defaultTemperature: 0,
    description: "Content safety classification",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Text Generation (DeepSeek → Kimi K2 → Llama 70B)
  // ─────────────────────────────────────────────────────────────────────────────
  generation: {
    primaryModel: MODELS.DEEPSEEK_V3,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.KIMI_K2 },
      { provider: "openrouter", model: MODELS.LLAMA_70B },
    ],
    defaultMaxTokens: 2048,
    defaultTemperature: 0.7,
    description: "General text generation",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Summarization (DeepSeek → Kimi K2 → Llama 70B)
  // ─────────────────────────────────────────────────────────────────────────────
  summary: {
    primaryModel: MODELS.DEEPSEEK_V3,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.KIMI_K2 },
      { provider: "openrouter", model: MODELS.LLAMA_70B },
    ],
    defaultMaxTokens: 1024,
    defaultTemperature: 0.3,
    description: "Content summarization",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Embeddings (OpenRouter BGE-M3 → Qwen3 → CF BGE Base)
  // ─────────────────────────────────────────────────────────────────────────────
  embedding: {
    primaryModel: MODELS.BGE_M3,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.QWEN3_EMBED },
      { provider: "cloudflare-ai", model: MODELS.CF_BGE_BASE },
    ],
    defaultMaxTokens: 0, // Not applicable for embeddings
    defaultTemperature: 0,
    description: "Text embeddings for semantic search",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Chat/Conversational (DeepSeek → Kimi K2 → Llama 70B)
  // ─────────────────────────────────────────────────────────────────────────────
  chat: {
    primaryModel: MODELS.DEEPSEEK_V3,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.KIMI_K2 },
      { provider: "openrouter", model: MODELS.LLAMA_70B },
    ],
    defaultMaxTokens: 4096,
    defaultTemperature: 0.8,
    description: "Conversational AI",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Image Analysis (Gemini Flash → Claude Haiku)
  // ─────────────────────────────────────────────────────────────────────────────
  image: {
    primaryModel: MODELS.GEMINI_FLASH,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.CLAUDE_HAIKU },
      { provider: "cloudflare-ai", model: MODELS.CF_LLAMA4_SCOUT },
    ],
    defaultMaxTokens: 1024,
    defaultTemperature: 0.2,
    description: "Image analysis and description",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Code Tasks (DeepSeek → Claude Haiku → Kimi K2)
  // ─────────────────────────────────────────────────────────────────────────────
  code: {
    primaryModel: MODELS.DEEPSEEK_V3,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.CLAUDE_HAIKU },
      { provider: "openrouter", model: MODELS.KIMI_K2 },
    ],
    defaultMaxTokens: 4096,
    defaultTemperature: 0.1,
    description: "Code generation and analysis",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Transcription (CF Whisper Turbo → Whisper → Whisper Tiny)
  // ─────────────────────────────────────────────────────────────────────────────
  transcription: {
    primaryModel: MODELS.CF_WHISPER_TURBO,
    primaryProvider: "cloudflare-ai",
    fallbackChain: [
      { provider: "cloudflare-ai", model: MODELS.CF_WHISPER },
      { provider: "cloudflare-ai", model: MODELS.CF_WHISPER_TINY },
    ],
    defaultMaxTokens: 0, // Not applicable for transcription
    defaultTemperature: 0,
    description: "Voice-to-text transcription",
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get task configuration
 */
export function getTaskConfig(task: LumenTask): TaskConfig {
  return TASK_REGISTRY[task];
}

/**
 * Get model cost per million tokens
 */
export function getModelCost(model: string): { input: number; output: number } {
  return MODEL_COSTS[model] ?? { input: 1.0, output: 1.0 }; // Default to $1/M if unknown
}

/**
 * Calculate cost for a request
 *
 * Uses 6 decimal places of precision to avoid floating-point errors
 * while maintaining sub-cent accuracy for billing purposes.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const costs = getModelCost(model);
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  // Round to 6 decimal places to avoid floating-point precision issues
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: LumenProviderName): string[] {
  const models: string[] = [];
  for (const [task, config] of Object.entries(TASK_REGISTRY)) {
    if (config.primaryProvider === provider) {
      models.push(config.primaryModel);
    }
    for (const fallback of config.fallbackChain) {
      if (fallback.provider === provider) {
        models.push(fallback.model);
      }
    }
  }
  return [...new Set(models)]; // Deduplicate
}
