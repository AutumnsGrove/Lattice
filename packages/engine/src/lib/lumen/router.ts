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

  // Add primary if available
  if (providers[config.primaryProvider]) {
    chain.push({
      provider: config.primaryProvider,
      model: options.model ?? config.primaryModel,
    });
  }

  // Add fallbacks
  for (const fallback of config.fallbackChain) {
    if (providers[fallback.provider]) {
      chain.push({
        provider: fallback.provider,
        model: options.model ?? fallback.model,
      });
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
 * Execute an embedding request (Cloudflare AI only)
 */
export async function executeEmbedding(
  input: string | string[],
  providers: ProviderRegistry,
  model?: string,
): Promise<{ embeddings: number[][]; tokens: number; model: string }> {
  const config = getTaskConfig("embedding");
  const cfProvider = providers["cloudflare-ai"];

  if (!cfProvider) {
    throw new LumenError(
      "Cloudflare AI provider required for embeddings",
      "ALL_PROVIDERS_FAILED",
      { task: "embedding" },
    );
  }

  if (!cfProvider.embed) {
    throw new LumenError(
      "Cloudflare AI provider does not support embeddings",
      "INVALID_TASK",
      { task: "embedding" },
    );
  }

  const result = await cfProvider.embed(model ?? config.primaryModel, input);

  return {
    embeddings: result.embeddings,
    tokens: result.tokens,
    model: model ?? config.primaryModel,
  };
}

/**
 * Execute a moderation request (Cloudflare AI only)
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
}> {
  const config = getTaskConfig("moderation");
  const cfProvider = providers["cloudflare-ai"];

  if (!cfProvider) {
    throw new LumenError(
      "Cloudflare AI provider required for moderation",
      "ALL_PROVIDERS_FAILED",
      { task: "moderation" },
    );
  }

  if (!cfProvider.moderate) {
    throw new LumenError(
      "Cloudflare AI provider does not support moderation",
      "INVALID_TASK",
      { task: "moderation" },
    );
  }

  const result = await cfProvider.moderate(
    model ?? config.primaryModel,
    content,
  );

  return {
    safe: result.safe,
    categories: result.categories,
    confidence: result.confidence,
    model: model ?? config.primaryModel,
  };
}
