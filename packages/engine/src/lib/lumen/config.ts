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
  // OpenRouter Models (for generation, chat, summary, image, code)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Default model for text generation - DeepSeek v3 (fast, cheap, great quality) */
  DEEPSEEK_CHAT: "deepseek/deepseek-chat",

  /** Fallback for generation - Llama 3.3 70B (reliable open source) */
  LLAMA_70B: "meta-llama/llama-3.3-70b-instruct",

  /** Premium model for image/code tasks - Claude Sonnet via OpenRouter */
  CLAUDE_SONNET: "anthropic/claude-sonnet-4",

  /** Budget fallback - Qwen (good quality, very cheap) */
  QWEN: "qwen/qwen-2.5-72b-instruct",

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloudflare Workers AI Models (for moderation, embeddings)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Content moderation - LlamaGuard 3 */
  LLAMAGUARD: "@cf/meta/llama-guard-3-8b",

  /** Embedding model - BGE Base (768 dimensions) */
  BGE_BASE: "@cf/baai/bge-base-en-v1.5",

  /** Fallback moderation - ShieldGemma */
  SHIELDGEMMA: "@hf/google/shieldgemma-2b",
} as const;

// =============================================================================
// COST TRACKING (USD per million tokens)
// =============================================================================

/**
 * Cost per million tokens for each model.
 * Update these when model pricing changes.
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  [MODELS.DEEPSEEK_CHAT]: { input: 0.14, output: 0.28 },
  [MODELS.LLAMA_70B]: { input: 0.1, output: 0.32 },
  [MODELS.CLAUDE_SONNET]: { input: 3.0, output: 15.0 },
  [MODELS.QWEN]: { input: 0.15, output: 0.4 },
  // Cloudflare AI models are included in Workers pricing (effectively free)
  [MODELS.LLAMAGUARD]: { input: 0, output: 0 },
  [MODELS.BGE_BASE]: { input: 0, output: 0 },
  [MODELS.SHIELDGEMMA]: { input: 0, output: 0 },
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
 */
export const TASK_REGISTRY: Record<LumenTask, TaskConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Content Moderation (Cloudflare AI - fast, local, free)
  // ─────────────────────────────────────────────────────────────────────────────
  moderation: {
    primaryModel: MODELS.LLAMAGUARD,
    primaryProvider: "cloudflare-ai",
    fallbackChain: [{ provider: "cloudflare-ai", model: MODELS.SHIELDGEMMA }],
    defaultMaxTokens: 256,
    defaultTemperature: 0,
    description: "Content safety classification",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Text Generation (OpenRouter - DeepSeek primary)
  // ─────────────────────────────────────────────────────────────────────────────
  generation: {
    primaryModel: MODELS.DEEPSEEK_CHAT,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.LLAMA_70B },
      { provider: "openrouter", model: MODELS.QWEN },
    ],
    defaultMaxTokens: 2048,
    defaultTemperature: 0.7,
    description: "General text generation",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Summarization (OpenRouter - DeepSeek primary)
  // ─────────────────────────────────────────────────────────────────────────────
  summary: {
    primaryModel: MODELS.DEEPSEEK_CHAT,
    primaryProvider: "openrouter",
    fallbackChain: [{ provider: "openrouter", model: MODELS.LLAMA_70B }],
    defaultMaxTokens: 1024,
    defaultTemperature: 0.3,
    description: "Content summarization",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Embeddings (Cloudflare AI - local, fast)
  // ─────────────────────────────────────────────────────────────────────────────
  embedding: {
    primaryModel: MODELS.BGE_BASE,
    primaryProvider: "cloudflare-ai",
    fallbackChain: [], // No fallback for embeddings - CF AI is very reliable
    defaultMaxTokens: 0, // Not applicable for embeddings
    defaultTemperature: 0,
    description: "Text embeddings for semantic search",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Chat/Conversational (OpenRouter - DeepSeek primary)
  // ─────────────────────────────────────────────────────────────────────────────
  chat: {
    primaryModel: MODELS.DEEPSEEK_CHAT,
    primaryProvider: "openrouter",
    fallbackChain: [{ provider: "openrouter", model: MODELS.LLAMA_70B }],
    defaultMaxTokens: 4096,
    defaultTemperature: 0.8,
    description: "Conversational AI",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Image Analysis (OpenRouter - Claude for vision)
  // ─────────────────────────────────────────────────────────────────────────────
  image: {
    primaryModel: MODELS.CLAUDE_SONNET,
    primaryProvider: "openrouter",
    fallbackChain: [], // Claude is best for vision, no good fallback
    defaultMaxTokens: 1024,
    defaultTemperature: 0.2,
    description: "Image analysis and description",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Code Tasks (OpenRouter - Claude for code)
  // ─────────────────────────────────────────────────────────────────────────────
  code: {
    primaryModel: MODELS.CLAUDE_SONNET,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.DEEPSEEK_CHAT }, // DeepSeek is great at code too
    ],
    defaultMaxTokens: 4096,
    defaultTemperature: 0.1,
    description: "Code generation and analysis",
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
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const costs = getModelCost(model);
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
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
