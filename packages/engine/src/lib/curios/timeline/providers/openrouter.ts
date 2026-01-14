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
  // Anthropic (via OpenRouter)
  "anthropic/claude-3.5-haiku": {
    name: "Claude 3.5 Haiku",
    quality: "high",
    speed: "fastest",
    inputCostPer1M: 1.0,
    outputCostPer1M: 5.0,
  },
  "anthropic/claude-3.5-sonnet": {
    name: "Claude 3.5 Sonnet",
    quality: "highest",
    speed: "fast",
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },

  // OpenAI (via OpenRouter)
  "openai/gpt-4o-mini": {
    name: "GPT-4o Mini",
    quality: "high",
    speed: "fastest",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
  },
  "openai/gpt-4o": {
    name: "GPT-4o",
    quality: "highest",
    speed: "fast",
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
  },

  // Google (via OpenRouter)
  "google/gemini-2.0-flash-001": {
    name: "Gemini 2.0 Flash",
    quality: "high",
    speed: "fastest",
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.4,
  },
  "google/gemini-pro-1.5": {
    name: "Gemini Pro 1.5",
    quality: "highest",
    speed: "medium",
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
  },

  // Meta Llama (via OpenRouter)
  "meta-llama/llama-3.3-70b-instruct": {
    name: "Llama 3.3 70B",
    quality: "high",
    speed: "medium",
    inputCostPer1M: 0.4,
    outputCostPer1M: 0.4,
  },

  // DeepSeek (via OpenRouter)
  "deepseek/deepseek-chat": {
    name: "DeepSeek V3",
    quality: "high",
    speed: "fast",
    inputCostPer1M: 0.14,
    outputCostPer1M: 0.28,
  },

  // Mistral (via OpenRouter)
  "mistralai/mistral-small-24b": {
    name: "Mistral Small 24B",
    quality: "high",
    speed: "fast",
    inputCostPer1M: 0.2,
    outputCostPer1M: 0.6,
  },

  // Qwen (via OpenRouter)
  "qwen/qwen-2.5-72b-instruct": {
    name: "Qwen 2.5 72B",
    quality: "high",
    speed: "medium",
    inputCostPer1M: 0.35,
    outputCostPer1M: 0.4,
  },
};

export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-3.5-haiku";

// =============================================================================
// Utilities
// =============================================================================

/**
 * Rough token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// =============================================================================
// API Implementation
// =============================================================================

/**
 * Call OpenRouter API
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: OpenRouterOptions = {},
): Promise<OpenRouterResponse> {
  const {
    maxTokens = 2048,
    temperature = 0.5,
    siteUrl = "https://grove.place",
    siteName = "Grove Timeline Curio",
  } = options;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenRouter API error (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = `OpenRouter: ${errorJson.error.message}`;
      }
    } catch {
      errorMessage += `: ${errorText.slice(0, 200)}`;
    }

    throw new Error(errorMessage);
  }

  const data = (await response.json()) as OpenRouterAPIResponse;
  const content = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};

  return {
    content,
    inputTokens:
      usage.prompt_tokens || estimateTokens(systemPrompt + userPrompt),
    outputTokens: usage.completion_tokens || estimateTokens(content),
    model: data.model || model,
    provider: "openrouter",
  };
}

/**
 * Calculate cost for OpenRouter request
 */
export function calculateOpenRouterCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const modelConfig = OPENROUTER_MODELS[model];

  if (!modelConfig) {
    return ((inputTokens + outputTokens) / 1_000_000) * 1.0;
  }

  const inputCost = (inputTokens / 1_000_000) * modelConfig.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelConfig.outputCostPer1M;

  return inputCost + outputCost;
}

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
