/**
 * Lumen Client - Main Entry Point
 *
 * The LumenClient is the primary interface for interacting with Grove's AI Gateway.
 * It handles:
 * - Request preprocessing (validation, PII scrubbing)
 * - Task routing (selecting provider/model)
 * - Provider execution with fallback
 * - Response postprocessing (normalization, logging)
 * - Quota enforcement
 *
 * Usage:
 * ```typescript
 * const lumen = createLumenClient({
 *   openrouterApiKey: env.OPENROUTER_API_KEY,
 *   ai: env.AI,
 *   db: env.DB,
 * });
 *
 * const response = await lumen.run({
 *   task: 'generation',
 *   input: 'Write a haiku about coding',
 *   tenant: 'tenant_123',
 * });
 * ```
 */

import type { TierKey } from "$lib/config/tiers.js";
import { safeDecryptToken, isEncryptedToken } from "$lib/server/encryption.js";

import { getTaskConfig } from "./config.js";
import { LumenError } from "./errors.js";
import { runSongbird } from "./songbird.js";
import { preprocess, type PreprocessResult } from "./pipeline/preprocessor.js";
import { normalizeResponse, createUsageLog } from "./pipeline/postprocessor.js";
import {
  createProviders,
  getAvailableProviders,
  type ProviderRegistry,
} from "./providers/index.js";
import { createQuotaTracker, type QuotaTracker } from "./quota/tracker.js";
import {
  executeWithFallback,
  executeEmbedding,
  executeModeration,
} from "./router.js";
import type {
  LumenClientConfig,
  LumenEmbeddingRequest,
  LumenEmbeddingResponse,
  LumenMessage,
  LumenModerationRequest,
  LumenModerationResponse,
  LumenRequest,
  LumenResponse,
  LumenStreamChunk,
  SongbirdOptions,
} from "./types.js";

// =============================================================================
// LUMEN CLIENT
// =============================================================================

export class LumenClient {
  private readonly providers: ProviderRegistry;
  private readonly quotaTracker?: QuotaTracker;
  private readonly enabled: boolean;

  constructor(config: LumenClientConfig) {
    this.enabled = config.enabled ?? true;
    this.providers = createProviders(config);

    // Initialize quota tracker if D1 is available
    if (config.db) {
      this.quotaTracker = createQuotaTracker(config.db);
    }
  }

  // ===========================================================================
  // MAIN INFERENCE
  // ===========================================================================

  /**
   * Run an inference request.
   * This is the main entry point for most AI tasks.
   */
  async run(request: LumenRequest, tier?: TierKey): Promise<LumenResponse> {
    // Check if Lumen is enabled
    if (!this.enabled) {
      throw new LumenError("Lumen is disabled", "DISABLED", {
        task: request.task,
      });
    }

    const startTime = Date.now();

    // 1. Preprocess (validate, scrub PII)
    const preprocessResult = preprocess(request, {
      skipPiiScrub: request.options?.skipPiiScrub,
    });

    // 2. Check quota (if tenant and tier provided)
    if (
      request.tenant &&
      tier &&
      this.quotaTracker &&
      !request.options?.skipQuota
    ) {
      await this.quotaTracker.enforceQuota(request.tenant, tier, request.task);
    }

    // 3. Songbird protection (if enabled)
    if (request.options?.songbird) {
      const songbirdOpts =
        typeof request.options.songbird === "object"
          ? request.options.songbird
          : undefined;

      const songbirdResult = await runSongbird(
        extractUserContent(preprocessResult.messages),
        request.task,
        this.providers,
        songbirdOpts,
      );

      if (!songbirdResult.passed) {
        throw new LumenError(
          "Content failed security validation",
          "SONGBIRD_REJECTED",
          {
            task: request.task,
          },
        );
      }
    }

    // 4. Get task config for defaults
    const taskConfig = getTaskConfig(request.task);

    // 5. Execute with fallback
    const result = await executeWithFallback(
      request.task,
      preprocessResult.messages,
      this.providers,
      {
        model: request.options?.model,
        maxTokens: request.options?.maxTokens ?? taskConfig.defaultMaxTokens,
        temperature:
          request.options?.temperature ?? taskConfig.defaultTemperature,
        apiKeyOverride: request.options?.tenantApiKey,
      },
    );

    // 6. Normalize response
    const response = normalizeResponse({
      providerResponse: result.response,
      provider: result.provider,
      task: request.task,
      model: result.model,
      startTime,
      cached: false,
    });

    // 7. Record usage (if tenant provided)
    if (request.tenant && this.quotaTracker) {
      await this.quotaTracker.recordUsage(
        request.tenant,
        request.task,
        result.model,
        result.provider,
        response.usage,
        response.latency,
        response.cached,
      );
    }

    return response;
  }

  // ===========================================================================
  // STREAMING
  // ===========================================================================

  /**
   * Run a streaming inference request.
   * Returns an async generator that yields chunks.
   */
  async *stream(
    request: LumenRequest,
    tier?: TierKey,
  ): AsyncGenerator<LumenStreamChunk> {
    // Check if Lumen is enabled
    if (!this.enabled) {
      throw new LumenError("Lumen is disabled", "DISABLED", {
        task: request.task,
      });
    }

    // 1. Preprocess (validate, scrub PII)
    const preprocessResult = preprocess(request, {
      skipPiiScrub: request.options?.skipPiiScrub,
    });

    // 2. Check quota (if tenant and tier provided)
    if (
      request.tenant &&
      tier &&
      this.quotaTracker &&
      !request.options?.skipQuota
    ) {
      await this.quotaTracker.enforceQuota(request.tenant, tier, request.task);
    }

    // 3. Get task config for defaults
    const taskConfig = getTaskConfig(request.task);

    // 4. Find provider with streaming support
    const provider = this.providers.openrouter;
    if (!provider?.stream) {
      throw new LumenError(
        "Streaming not available for this task",
        "INVALID_TASK",
        { task: request.task },
      );
    }

    // 5. Stream response
    const model = request.options?.model ?? taskConfig.primaryModel;

    const stream = provider.stream(model, preprocessResult.messages, {
      maxTokens: request.options?.maxTokens ?? taskConfig.defaultMaxTokens,
      temperature:
        request.options?.temperature ?? taskConfig.defaultTemperature,
      apiKeyOverride: request.options?.tenantApiKey,
    });

    // 6. Yield chunks and record usage on completion
    let finalUsage: LumenStreamChunk["usage"] | undefined;

    for await (const chunk of stream) {
      if (chunk.done && chunk.usage) {
        finalUsage = chunk.usage;
      }
      yield chunk;
    }

    // 7. Record usage (if tenant provided and we have final usage)
    if (request.tenant && this.quotaTracker && finalUsage) {
      await this.quotaTracker.recordUsage(
        request.tenant,
        request.task,
        model,
        "openrouter",
        finalUsage,
        0, // Latency not tracked for streaming
        false,
      );
    }
  }

  // ===========================================================================
  // EMBEDDINGS
  // ===========================================================================

  /**
   * Generate embeddings for text.
   * Uses Cloudflare AI (BGE model).
   */
  async embed(
    request: LumenEmbeddingRequest,
    tier?: TierKey,
  ): Promise<LumenEmbeddingResponse> {
    // Check if Lumen is enabled
    if (!this.enabled) {
      throw new LumenError("Lumen is disabled", "DISABLED", {
        task: "embedding",
      });
    }

    // Check quota
    if (request.tenant && tier && this.quotaTracker) {
      await this.quotaTracker.enforceQuota(request.tenant, tier, "embedding");
    }

    // Execute
    const result = await executeEmbedding(
      request.input,
      this.providers,
      request.model,
    );

    // Record usage
    if (request.tenant && this.quotaTracker) {
      await this.quotaTracker.recordUsage(
        request.tenant,
        "embedding",
        result.model,
        "cloudflare-ai",
        { input: result.tokens, output: 0, cost: 0 },
        0,
        false,
      );
    }

    return {
      embeddings: result.embeddings,
      model: result.model,
      provider: "cloudflare-ai",
      tokens: result.tokens,
    };
  }

  // ===========================================================================
  // MODERATION
  // ===========================================================================

  /**
   * Check content for safety.
   * Uses Cloudflare AI (LlamaGuard).
   */
  async moderate(
    request: LumenModerationRequest,
    tier?: TierKey,
  ): Promise<LumenModerationResponse> {
    // Check if Lumen is enabled
    if (!this.enabled) {
      throw new LumenError("Lumen is disabled", "DISABLED", {
        task: "moderation",
      });
    }

    // Check quota
    if (request.tenant && tier && this.quotaTracker) {
      await this.quotaTracker.enforceQuota(request.tenant, tier, "moderation");
    }

    // Execute
    const result = await executeModeration(request.content, this.providers);

    // Record usage
    if (request.tenant && this.quotaTracker) {
      await this.quotaTracker.recordUsage(
        request.tenant,
        "moderation",
        result.model,
        "cloudflare-ai",
        { input: Math.ceil(request.content.length / 4), output: 0, cost: 0 },
        0,
        false,
      );
    }

    return {
      safe: result.safe,
      categories: result.categories as LumenModerationResponse["categories"],
      model: result.model,
      confidence: result.confidence,
    };
  }

  // ===========================================================================
  // QUOTA & USAGE
  // ===========================================================================

  /**
   * Get current quota status for a tenant
   */
  async getQuotaStatus(tenantId: string, tier: TierKey) {
    if (!this.quotaTracker) {
      throw new LumenError(
        "Quota tracking not available (no D1 database)",
        "INVALID_INPUT",
      );
    }

    return this.quotaTracker.getTodayUsageAll(tenantId);
  }

  /**
   * Get usage history for a tenant
   */
  async getUsageHistory(
    tenantId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    if (!this.quotaTracker) {
      throw new LumenError(
        "Quota tracking not available (no D1 database)",
        "INVALID_INPUT",
      );
    }

    return this.quotaTracker.getUsageHistory(tenantId, options);
  }

  // ===========================================================================
  // HEALTH & INFO
  // ===========================================================================

  /**
   * Check which providers are available
   */
  getAvailableProviders() {
    return getAvailableProviders(this.providers);
  }

  /**
   * Check if Lumen is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Run health checks on all providers
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const providerName of getAvailableProviders(this.providers)) {
      const provider = this.providers[providerName];
      if (provider?.healthCheck) {
        results[providerName] = await provider.healthCheck();
      } else {
        results[providerName] = true; // Assume healthy if no healthCheck
      }
    }

    return results;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract user-role content from preprocessed messages.
 * Handles both string and multi-part content formats.
 */
function extractUserContent(messages: LumenMessage[]): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) =>
      typeof m.content === "string"
        ? m.content
        : m.content
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(" "),
    )
    .join("\n");
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a Lumen client instance.
 *
 * @param config - Client configuration
 * @returns Configured LumenClient
 *
 * @example
 * ```typescript
 * // In a SvelteKit endpoint
 * export async function POST({ request, platform, locals }) {
 *   const lumen = createLumenClient({
 *     openrouterApiKey: platform.env.OPENROUTER_API_KEY,
 *     ai: platform.env.AI,
 *     db: platform.env.DB,
 *   });
 *
 *   const response = await lumen.run({
 *     task: 'generation',
 *     input: 'Write a haiku about coding',
 *     tenant: locals.tenant?.id,
 *   }, locals.tenant?.tier);
 *
 *   return json(response);
 * }
 * ```
 */
export function createLumenClient(config: LumenClientConfig): LumenClient {
  return new LumenClient(config);
}

/**
 * Create a Lumen client with encrypted API key decryption.
 * Use this when the API key might be stored encrypted in the database.
 */
export async function createLumenClientWithDecryption(
  config: Omit<LumenClientConfig, "openrouterApiKey"> & {
    encryptedApiKey: string;
    encryptionKey: string;
  },
): Promise<LumenClient> {
  // Decrypt the API key if it looks encrypted
  let apiKey = config.encryptedApiKey;

  if (isEncryptedToken(config.encryptedApiKey)) {
    const decrypted = await safeDecryptToken(
      config.encryptedApiKey,
      config.encryptionKey,
    );
    if (!decrypted) {
      throw new LumenError("Failed to decrypt API key", "UNAUTHORIZED");
    }
    apiKey = decrypted;
  }

  return createLumenClient({
    ...config,
    openrouterApiKey: apiKey,
  });
}
