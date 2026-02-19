/**
 * Lumen Task Router
 *
 * Routes tasks to the appropriate provider and model based on configuration.
 * Handles fallback logic when providers fail.
 */

import { getTaskConfig, type TaskConfig } from "./config.js";
import { AllProvidersFailedError, LumenError } from "./errors.js";
import type {
  LumenMessage,
  LumenProviderName,
  LumenRequest,
  LumenTask,
} from "./types.js";
import type {
  ProviderRegistry,
  LumenProvider,
  LumenProviderResponse,
  LumenInferenceOptions,
} from "./providers/index.js";

// =============================================================================
// TYPES
// =============================================================================

export interface RouteResult {
  /** Provider to use */
  provider: LumenProviderName;

  /** Model to use */
  model: string;

  /** Task configuration */
  config: TaskConfig;
}

export interface ExecuteResult {
  /** Provider response */
  response: LumenProviderResponse;

  /** Provider that succeeded */
  provider: LumenProviderName;

  /** Model that was used */
  model: string;
}

// =============================================================================
// ROUTING
// =============================================================================

/**
 * Determine the route for a task (which provider/model to use)
 */
export function routeTask(
  task: LumenTask,
  providers: ProviderRegistry,
  modelOverride?: string,
): RouteResult {
  const config = getTaskConfig(task);

  // Check if primary provider is available
  const primaryAvailable = providers[config.primaryProvider] !== undefined;

  // Use model override if specified, otherwise use primary model
  const model = modelOverride ?? config.primaryModel;

  // If primary is available, use it
  if (primaryAvailable) {
    return {
      provider: config.primaryProvider,
      model,
      config,
    };
  }

  // Try fallback chain
  for (const fallback of config.fallbackChain) {
    if (providers[fallback.provider] !== undefined) {
      return {
        provider: fallback.provider,
        model: modelOverride ?? fallback.model,
        config,
      };
    }
  }

  // No providers available
  throw new LumenError(
    `No providers available for task "${task}"`,
    "ALL_PROVIDERS_FAILED",
    { task },
  );
}

// =============================================================================
// EXECUTION WITH FALLBACK
// =============================================================================

/**
 * Execute a request with automatic fallback on failure.
 * Tries primary provider first, then falls back through the chain.
 *
 * When `model` is explicitly specified, fallbacks are skipped — the user
 * chose a specific model (e.g., BYOK Timeline users), so trying other
 * models on failure would be unexpected.
 */
export async function executeWithFallback(
  task: LumenTask,
  messages: LumenMessage[],
  providers: ProviderRegistry,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    apiKeyOverride?: string;
  } = {},
): Promise<ExecuteResult> {
  const config = getTaskConfig(task);
  const attempts: Array<{
    provider: LumenProviderName;
    model: string;
    error: string;
  }> = [];

  // Build execution chain: primary + fallbacks
  const chain: Array<{ provider: LumenProviderName; model: string }> = [];

  // When model is explicitly specified, skip fallback chain entirely.
  // The user chose this model — don't silently switch to another.
  const skipFallbacks = !!options.model;

  // Add primary if available
  if (providers[config.primaryProvider]) {
    chain.push({
      provider: config.primaryProvider,
      model: options.model ?? config.primaryModel,
    });
  }

  // Add fallbacks (unless model override was specified)
  if (!skipFallbacks) {
    for (const fallback of config.fallbackChain) {
      if (providers[fallback.provider]) {
        chain.push({
          provider: fallback.provider,
          model: fallback.model,
        });
      }
    }
  }

  if (chain.length === 0) {
    throw new AllProvidersFailedError(task, [
      {
        provider: config.primaryProvider,
        model: config.primaryModel,
        error: "Provider not configured",
      },
    ]);
  }

  // Try each provider in the chain
  for (const { provider: providerName, model } of chain) {
    const provider = providers[providerName];
    if (!provider) continue;

    try {
      const inferenceOptions: LumenInferenceOptions = {
        maxTokens: options.maxTokens ?? config.defaultMaxTokens,
        temperature: options.temperature ?? config.defaultTemperature,
        timeoutMs: options.timeoutMs,
        apiKeyOverride: options.apiKeyOverride,
      };

      const response = await provider.inference(
        model,
        messages,
        inferenceOptions,
      );

      return {
        response,
        provider: providerName,
        model,
      };
    } catch (err) {
      attempts.push({
        provider: providerName,
        model,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      // Continue to next provider in chain
    }
  }

  // All providers failed
  throw new AllProvidersFailedError(task, attempts);
}

// =============================================================================
// SPECIALIZED EXECUTION
// =============================================================================

/**
 * Execute an embedding request with fallback chain
 * Tries OpenRouter first (BGE-M3), falls back to Cloudflare AI
 */
export async function executeEmbedding(
  input: string | string[],
  providers: ProviderRegistry,
  model?: string,
): Promise<{
  embeddings: number[][];
  tokens: number;
  model: string;
  provider: LumenProviderName;
}> {
  const config = getTaskConfig("embedding");
  const attempts: Array<{
    provider: LumenProviderName;
    model: string;
    error: string;
  }> = [];

  // Build the execution chain from config
  const chain: Array<{ provider: LumenProviderName; model: string }> = [];

  // Add primary if available
  if (providers[config.primaryProvider]) {
    chain.push({
      provider: config.primaryProvider,
      model: model ?? config.primaryModel,
    });
  }

  // Add fallbacks
  for (const fallback of config.fallbackChain) {
    if (providers[fallback.provider]) {
      chain.push({
        provider: fallback.provider,
        model: model ?? fallback.model,
      });
    }
  }

  if (chain.length === 0) {
    throw new AllProvidersFailedError("embedding", [
      {
        provider: config.primaryProvider,
        model: config.primaryModel,
        error: "No embedding providers configured",
      },
    ]);
  }

  // Try each provider in the chain
  for (const { provider: providerName, model: embedModel } of chain) {
    const provider = providers[providerName];
    if (!provider?.embed) continue;

    try {
      const result = await provider.embed(embedModel, input);
      return {
        embeddings: result.embeddings,
        tokens: result.tokens,
        model: embedModel,
        provider: providerName,
      };
    } catch (err) {
      attempts.push({
        provider: providerName,
        model: embedModel,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  throw new AllProvidersFailedError("embedding", attempts);
}

/**
 * Execute a moderation request with fallback chain
 * Tries OpenRouter (LlamaGuard 4) first, falls back to Cloudflare AI
 */
export async function executeModeration(
  content: string,
  providers: ProviderRegistry,
  model?: string,
): Promise<{
  safe: boolean;
  categories: string[];
  confidence: number;
  model: string;
  provider: LumenProviderName;
}> {
  const config = getTaskConfig("moderation");
  const attempts: Array<{
    provider: LumenProviderName;
    model: string;
    error: string;
  }> = [];

  // Build the execution chain from config
  const chain: Array<{ provider: LumenProviderName; model: string }> = [];

  // Add primary if available
  if (providers[config.primaryProvider]) {
    chain.push({
      provider: config.primaryProvider,
      model: model ?? config.primaryModel,
    });
  }

  // Add fallbacks
  for (const fallback of config.fallbackChain) {
    if (providers[fallback.provider]) {
      chain.push({
        provider: fallback.provider,
        model: model ?? fallback.model,
      });
    }
  }

  if (chain.length === 0) {
    throw new AllProvidersFailedError("moderation", [
      {
        provider: config.primaryProvider,
        model: config.primaryModel,
        error: "No moderation providers configured",
      },
    ]);
  }

  // Try each provider in the chain
  for (const { provider: providerName, model: modModel } of chain) {
    const provider = providers[providerName];
    if (!provider?.moderate) continue;

    try {
      const result = await provider.moderate(modModel, content);
      return {
        safe: result.safe,
        categories: result.categories,
        confidence: result.confidence,
        model: modModel,
        provider: providerName,
      };
    } catch (err) {
      attempts.push({
        provider: providerName,
        model: modModel,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  throw new AllProvidersFailedError("moderation", attempts);
}
