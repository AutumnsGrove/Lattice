/**
 * Lumen Provider Interface
 *
 * Abstract interface for AI providers, following the pattern from payments/types.ts.
 * Each provider (OpenRouter, Cloudflare AI) implements this interface.
 */

import type {
  LumenMessage,
  LumenProviderName,
  LumenStreamChunk,
  LumenUsage,
} from "../types.js";

// =============================================================================
// INFERENCE OPTIONS
// =============================================================================

export interface LumenInferenceOptions {
  /** Maximum tokens to generate */
  maxTokens: number;

  /** Temperature (0-2) */
  temperature: number;

  /** Enable streaming */
  stream?: boolean;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** API key override for BYOK (uses this instead of the provider's default key) */
  apiKeyOverride?: string;

  /** Additional provider-specific options */
  providerOptions?: Record<string, unknown>;
}

// =============================================================================
// PROVIDER RESPONSE
// =============================================================================

export interface LumenProviderResponse {
  /** Generated content */
  content: string;

  /** Token usage */
  usage: LumenUsage;

  /** Actual model used (may differ from requested if aliased) */
  model: string;

  /** Raw provider response for debugging (optional) */
  raw?: unknown;
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

/**
 * Abstract Lumen Provider Interface
 *
 * Implement this interface for each AI provider.
 * Follows the same pattern as PaymentProvider in payments/types.ts.
 */
export interface LumenProvider {
  /** Provider identifier */
  readonly name: LumenProviderName;

  // ===========================================================================
  // INFERENCE
  // ===========================================================================

  /**
   * Run inference (chat completion)
   *
   * @param model - Model identifier (e.g., "deepseek/deepseek-chat")
   * @param messages - Chat messages
   * @param options - Inference options
   * @returns Generated content and usage stats
   */
  inference(
    model: string,
    messages: LumenMessage[],
    options: LumenInferenceOptions,
  ): Promise<LumenProviderResponse>;

  /**
   * Run streaming inference (optional)
   *
   * @param model - Model identifier
   * @param messages - Chat messages
   * @param options - Inference options
   * @returns Async generator yielding chunks
   */
  stream?(
    model: string,
    messages: LumenMessage[],
    options: LumenInferenceOptions,
  ): AsyncGenerator<LumenStreamChunk>;

  // ===========================================================================
  // EMBEDDINGS (Optional - only Cloudflare AI supports this)
  // ===========================================================================

  /**
   * Generate embeddings for text
   *
   * @param model - Embedding model identifier
   * @param input - Text or array of texts to embed
   * @returns Array of embedding vectors
   */
  embed?(
    model: string,
    input: string | string[],
  ): Promise<{
    embeddings: number[][];
    tokens: number;
  }>;

  // ===========================================================================
  // MODERATION (Optional - only Cloudflare AI supports this natively)
  // ===========================================================================

  /**
   * Run content moderation
   *
   * @param model - Moderation model identifier
   * @param content - Content to moderate
   * @returns Moderation result
   */
  moderate?(
    model: string,
    content: string,
  ): Promise<{
    safe: boolean;
    categories: string[];
    confidence: number;
  }>;

  // ===========================================================================
  // TRANSCRIPTION (Optional - only Cloudflare AI supports this)
  // ===========================================================================

  /**
   * Transcribe audio to text using Whisper
   *
   * @param model - Whisper model identifier (e.g., "@cf/openai/whisper-large-v3-turbo")
   * @param audio - Audio data as Uint8Array
   * @returns Transcription result with text, word count, and duration
   */
  transcribe?(
    model: string,
    audio: Uint8Array,
  ): Promise<{
    text: string;
    wordCount: number;
    duration: number;
  }>;

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  /**
   * Check if provider is available
   */
  healthCheck?(): Promise<boolean>;
}

// =============================================================================
// PROVIDER SECRETS
// =============================================================================

export interface LumenProviderSecrets {
  /** OpenRouter API key */
  OPENROUTER_API_KEY?: string;

  /** Cloudflare AI binding (passed separately) */
  // AI binding is passed via LumenClientConfig, not secrets
}
