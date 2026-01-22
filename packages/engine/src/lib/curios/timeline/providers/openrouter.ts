/**
 * OpenRouter Provider
 *
 * Universal AI gateway supporting 100+ models through a single API.
 * Users bring their own API key and pick their preferred model.
 *
 * @see https://openrouter.ai/docs
 */

// =============================================================================
// Types
// =============================================================================

export interface OpenRouterModel {
  name: string;
  quality: "highest" | "high" | "good";
  speed: "fastest" | "fast" | "medium";
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export interface OpenRouterResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: "openrouter";
}

export interface OpenRouterOptions {
  maxTokens?: number;
  temperature?: number;
  siteUrl?: string;
  siteName?: string;
}

export interface OpenRouterKeyValidation {
  valid: boolean;
  error?: string;
  credits?: number;
  usage?: number;
}

// API Response types
interface OpenRouterAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
}

interface OpenRouterKeyResponse {
  data?: {
    limit_remaining?: number;
    usage?: number;
  };
}

// =============================================================================
// Model Definitions
// =============================================================================

/**
 * Popular models available through OpenRouter
 * Users can use ANY OpenRouter model, but these are recommended defaults
 */
export const OPENROUTER_MODELS: Record<string, OpenRouterModel> = {
  // DeepSeek - DEFAULT (Best value for code summarization)
  "deepseek/deepseek-v3.2": {
    name: "DeepSeek V3.2",
    quality: "highest",
    speed: "fast",
    inputCostPer1M: 0.25,
    outputCostPer1M: 0.38,
  },

  // Kimi (Great reasoning, huge context)
  "moonshotai/kimi-k2-0905": {
    name: "Kimi K2",
    quality: "highest",
    speed: "fast",
    inputCostPer1M: 0.39,
    outputCostPer1M: 1.9,
  },

  // MiniMax (Fast, good quality)
  "minimax/minimax-m2.1": {
    name: "MiniMax M2.1",
    quality: "high",
    speed: "fastest",
    inputCostPer1M: 0.27,
    outputCostPer1M: 1.12,
  },

  // Anthropic (Premium quality)
  "anthropic/claude-haiku-4.5": {
    name: "Claude Haiku 4.5",
    quality: "highest",
    speed: "fast",
    inputCostPer1M: 1.0,
    outputCostPer1M: 5.0,
  },

  // OpenAI OSS (Ultra budget)
  "openai/gpt-oss-120b": {
    name: "GPT-OSS 120B",
    quality: "high",
    speed: "fast",
    inputCostPer1M: 0.04,
    outputCostPer1M: 0.19,
  },

  // Qwen (Large context, budget friendly)
  "qwen/qwen3-235b-a22b-2507": {
    name: "Qwen3 235B",
    quality: "high",
    speed: "medium",
    inputCostPer1M: 0.07,
    outputCostPer1M: 0.46,
  },

  // Meta Llama 3.3 (Open source, reliable)
  "meta-llama/llama-3.3-70b-instruct": {
    name: "Llama 3.3 70B",
    quality: "high",
    speed: "medium",
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.32,
  },

  // GLM (Good multilingual)
  "z-ai/glm-4.7": {
    name: "GLM 4.7",
    quality: "high",
    speed: "fast",
    inputCostPer1M: 0.4,
    outputCostPer1M: 1.5,
  },

  // Meta Llama 4 Maverick (Massive 1M context)
  "meta-llama/llama-4-maverick": {
    name: "Llama 4 Maverick",
    quality: "high",
    speed: "medium",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },
};

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v3.2";

// =============================================================================
// UI Utilities (kept for model picker and key validation)
// =============================================================================

/**
 * Get list of recommended OpenRouter models for the UI
 */
export function getOpenRouterModels() {
  return Object.entries(OPENROUTER_MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    quality: config.quality,
    speed: config.speed,
    inputCostPer1M: config.inputCostPer1M,
    outputCostPer1M: config.outputCostPer1M,
    isDefault: id === DEFAULT_OPENROUTER_MODEL,
  }));
}

/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(
  apiKey: string,
): Promise<OpenRouterKeyValidation> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }
      return { valid: false, error: `API error: ${response.status}` };
    }

    const data = (await response.json()) as OpenRouterKeyResponse;

    return {
      valid: true,
      credits: data.data?.limit_remaining,
      usage: data.data?.usage,
    };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}
