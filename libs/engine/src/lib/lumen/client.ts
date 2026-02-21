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
  GutterItem,
  LumenClientConfig,
  LumenEmbeddingRequest,
  LumenEmbeddingResponse,
  LumenMessage,
  LumenModerationRequest,
  LumenModerationResponse,
  LumenRequest,
  LumenResponse,
  LumenStreamChunk,
  LumenTranscriptionRequest,
  LumenTranscriptionResponse,
  SongbirdOptions,
} from "./types.js";
import { scrubPii } from "./pipeline/preprocessor.js";
import {
  SCRIBE_DRAFT_SYSTEM_PROMPT,
  buildScribeDraftPrompt,
  parseScribeDraftResponse,
} from "./prompts/scribe-draft.js";

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

      // Log metrics for threshold tuning over time
      if (songbirdResult.metrics.canaryMs || songbirdResult.metrics.kestrelMs) {
        console.log(
          `[Lumen/Songbird] task=${request.task} passed=${songbirdResult.passed}` +
            ` canary=${songbirdResult.metrics.canaryMs ?? "-"}ms` +
            ` kestrel=${songbirdResult.metrics.kestrelMs ?? "-"}ms` +
            (songbirdResult.confidence != null
              ? ` confidence=${songbirdResult.confidence}`
              : ""),
        );
      }

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
   * Uses OpenRouter: GPT-oss Safeguard 20B → LlamaGuard 4 → DeepSeek V3.2.
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
        result.provider,
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
  // TRANSCRIPTION (SCRIBE)
  // ===========================================================================

  /**
   * Transcribe audio to text.
   * Uses Cloudflare AI (Whisper).
   *
   * Supports two modes:
   * - "raw": Direct 1:1 transcription (1 quota unit)
   * - "draft": AI-structured with auto-generated Vines (2 quota units)
   *
   * @param request - Transcription request with audio data
   * @param tier - Tenant tier for quota enforcement
   * @returns Transcription response with text and metadata
   */
  async transcribe(
    request: LumenTranscriptionRequest,
    tier?: TierKey,
  ): Promise<LumenTranscriptionResponse> {
    const startTime = Date.now();
    const mode = request.options?.mode ?? "raw";

    // Check if Lumen is enabled
    if (!this.enabled) {
      throw new LumenError("Lumen is disabled", "DISABLED", {
        task: "transcription",
      });
    }

    // Validate audio data
    if (!request.audio || request.audio.length === 0) {
      throw new LumenError("Audio data is required", "INVALID_INPUT", {
        task: "transcription",
      });
    }

    // Check audio size (max 25MB as per plan)
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    if (request.audio.length > MAX_AUDIO_SIZE) {
      throw new LumenError(
        `Audio exceeds maximum size of 25MB (got ${(request.audio.length / 1024 / 1024).toFixed(1)}MB)`,
        "INVALID_INPUT",
        { task: "transcription" },
      );
    }

    // Check quotas (Draft mode needs both transcription + generation)
    if (
      request.tenant &&
      tier &&
      this.quotaTracker &&
      !request.options?.skipQuota
    ) {
      await this.quotaTracker.enforceQuota(
        request.tenant,
        tier,
        "transcription",
      );

      // Draft mode also requires generation quota
      if (mode === "draft") {
        await this.quotaTracker.enforceQuota(
          request.tenant,
          tier,
          "generation",
        );
      }
    }

    // Get Cloudflare AI provider
    const provider = this.providers["cloudflare-ai"];
    if (!provider?.transcribe) {
      throw new LumenError(
        "Transcription not available (no Cloudflare AI binding)",
        "PROVIDER_ERROR",
        { task: "transcription" },
      );
    }

    // Get task config for model selection
    const taskConfig = getTaskConfig("transcription");

    // Execute transcription with fallback
    let result:
      | { text: string; wordCount: number; duration: number }
      | undefined = undefined;
    let usedModel = taskConfig.primaryModel;

    try {
      result = await provider.transcribe(
        taskConfig.primaryModel,
        request.audio,
      );
    } catch (primaryError) {
      // Try fallback chain
      let lastError = primaryError;

      for (const fallback of taskConfig.fallbackChain) {
        try {
          if (fallback.provider === "cloudflare-ai" && provider.transcribe) {
            result = await provider.transcribe(fallback.model, request.audio);
            usedModel = fallback.model;
            break;
          }
        } catch (fallbackError) {
          lastError = fallbackError;
          continue;
        }
      }

      // If we still don't have a result, throw the last error
      if (!result) {
        throw lastError;
      }
    }

    // Scrub PII from transcription output (unless skipped)
    let rawText = result.text;
    if (!request.options?.skipPiiScrub) {
      const scrubbed = scrubPii(result.text);
      rawText = scrubbed.text;

      if (scrubbed.piiCount > 0) {
        console.log(
          `[Lumen/Transcribe] Scrubbed ${scrubbed.piiCount} PII items: ${scrubbed.piiTypes.join(", ")}`,
        );
      }
    }

    // Record transcription usage
    if (request.tenant && this.quotaTracker) {
      await this.quotaTracker.recordUsage(
        request.tenant,
        "transcription",
        usedModel,
        "cloudflare-ai",
        { input: 0, output: 0, cost: 0 }, // CF AI is included in Workers pricing
        Date.now() - startTime,
        false,
      );
    }

    // For raw mode, return the transcription directly
    if (mode === "raw") {
      return {
        text: rawText,
        wordCount: result.wordCount,
        duration: result.duration,
        latency: Date.now() - startTime,
        model: usedModel,
        provider: "cloudflare-ai",
      };
    }

    // Draft mode: structure the transcript with LLM
    const draftResult = await this.structureDraftTranscript(
      rawText,
      request.tenant,
      tier,
    );

    // Note: wordCount reflects cleaned text (filler words removed)
    // duration reflects original audio length, not cleaned text
    return {
      text: draftResult.text,
      wordCount: draftResult.text.split(/\s+/).filter(Boolean).length,
      duration: result.duration,
      latency: Date.now() - startTime,
      model: usedModel,
      provider: "cloudflare-ai",
      gutterContent: draftResult.gutterContent,
      rawTranscript: rawText,
    };
  }

  /**
   * Structure a raw transcript using LLM generation.
   * Cleans up speech patterns and extracts tangents as Vines.
   *
   * @param rawTranscript - The raw transcription text
   * @param tenant - Tenant ID for quota tracking
   * @param tier - Tenant tier
   * @returns Structured text with optional gutter content
   */
  private async structureDraftTranscript(
    rawTranscript: string,
    tenant?: string,
    tier?: TierKey,
  ): Promise<{ text: string; gutterContent: GutterItem[] }> {
    try {
      // Use the generation task to structure the transcript
      const response = await this.run(
        {
          task: "generation",
          input: [
            { role: "system", content: SCRIBE_DRAFT_SYSTEM_PROMPT },
            { role: "user", content: buildScribeDraftPrompt(rawTranscript) },
          ],
          tenant,
          options: {
            maxTokens: 2048,
            temperature: 0.3, // Lower temperature for more consistent structuring
            skipQuota: true, // Already checked quota above
            skipPiiScrub: true, // Already scrubbed in transcribe()
          },
        },
        tier,
      );

      // Parse the LLM response
      const parsed = parseScribeDraftResponse(response.content);

      if (parsed) {
        return parsed;
      }

      // Parsing failed, fallback to raw text
      console.warn(
        "[Lumen/Scribe] Failed to parse draft response, using raw text",
      );
      return { text: rawTranscript, gutterContent: [] };
    } catch (err) {
      // LLM structuring failed, fallback to raw text silently
      console.error("[Lumen/Scribe] Draft structuring failed:", err);
      return { text: rawTranscript, gutterContent: [] };
    }
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
