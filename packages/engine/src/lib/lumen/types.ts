/**
 * Lumen AI Gateway - Core Types
 *
 * Grove's unified AI gateway consolidates all AI inference into a single,
 * well-architected routing layer with task-based routing and multi-provider fallback.
 *
 * @see docs/specs/lumen-spec.md
 */

// =============================================================================
// TASK TYPES
// =============================================================================

/**
 * Task types that map to optimal providers.
 * Each task has a primary provider and fallback chain configured in config.ts.
 */
export type LumenTask =
  | "moderation" // Content safety → LlamaGuard (CF Workers AI)
  | "generation" // Text generation → DeepSeek (OpenRouter)
  | "summary" // Summarization → DeepSeek (OpenRouter)
  | "embedding" // Vector embeddings → bge-base (CF Workers AI)
  | "chat" // Conversational → DeepSeek (OpenRouter)
  | "image" // Image analysis → Claude via OpenRouter
  | "code"; // Code tasks → Claude via OpenRouter

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export type LumenMessageRole = "system" | "user" | "assistant";

export interface LumenMessage {
  role: LumenMessageRole;
  content: string | LumenContentPart[];
}

export interface LumenContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string; // Base64 data URL or HTTP URL
    detail?: "auto" | "low" | "high";
  };
}

// =============================================================================
// REQUEST / RESPONSE
// =============================================================================

export interface LumenRequest {
  /** The task type - determines provider routing */
  task: LumenTask;

  /** Input prompt or messages */
  input: string | LumenMessage[];

  /** Tenant ID for quota tracking (optional for anonymous requests) */
  tenant?: string;

  /** Optional configuration overrides */
  options?: LumenRequestOptions;
}

export interface LumenRequestOptions {
  /** Override the default model for this task */
  model?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;

  /** Enable streaming response */
  stream?: boolean;

  /** Skip quota check (for internal/system calls or BYOK users) */
  skipQuota?: boolean;

  /** Skip PII scrubbing (for already-sanitized content) */
  skipPiiScrub?: boolean;

  /**
   * Per-tenant API key override (for BYOK features like Timeline).
   * When provided, this key is used for the actual API call instead of
   * the global key. The request still goes through Lumen's pipeline
   * (routing, logging, normalization) but bills to the tenant's account.
   */
  tenantApiKey?: string;

  /** Additional metadata for logging (no content!) */
  metadata?: Record<string, unknown>;
}

export interface LumenResponse {
  /** Generated content */
  content: string;

  /** Model that was used */
  model: string;

  /** Provider that was used */
  provider: LumenProviderName;

  /** Token usage and cost */
  usage: LumenUsage;

  /** Whether response was served from cache */
  cached: boolean;

  /** Total latency in milliseconds */
  latency: number;
}

export interface LumenUsage {
  /** Input tokens consumed */
  input: number;

  /** Output tokens generated */
  output: number;

  /** Estimated cost in USD */
  cost: number;
}

// =============================================================================
// STREAMING
// =============================================================================

export interface LumenStreamChunk {
  /** Partial content */
  content: string;

  /** Whether this is the final chunk */
  done: boolean;

  /** Final usage stats (only on done=true) */
  usage?: LumenUsage;
}

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Available provider names.
 * Currently: OpenRouter (universal) and Cloudflare AI (local moderation/embeddings)
 */
export type LumenProviderName = "openrouter" | "cloudflare-ai";

export interface LumenProviderConfig {
  /** Human-readable name */
  name: string;

  /** Base URL for API calls */
  baseUrl: string;

  /** Whether this provider supports Zero Data Retention */
  zdr: boolean;

  /** Default timeout in milliseconds */
  timeoutMs: number;
}

// =============================================================================
// EMBEDDINGS
// =============================================================================

export interface LumenEmbeddingRequest {
  /** Text(s) to embed */
  input: string | string[];

  /** Tenant ID for quota tracking */
  tenant?: string;

  /** Override default embedding model */
  model?: string;
}

export interface LumenEmbeddingResponse {
  /** Embedding vectors */
  embeddings: number[][];

  /** Model used */
  model: string;

  /** Provider used */
  provider: LumenProviderName;

  /** Total tokens processed */
  tokens: number;
}

// =============================================================================
// MODERATION
// =============================================================================

export interface LumenModerationRequest {
  /** Content to moderate */
  content: string;

  /** Tenant ID for quota tracking */
  tenant?: string;
}

export interface LumenModerationResponse {
  /** Whether content is safe */
  safe: boolean;

  /** Flagged categories (if unsafe) */
  categories: LumenModerationCategory[];

  /** Model used */
  model: string;

  /** Confidence score (0-1) */
  confidence: number;
}

export type LumenModerationCategory =
  | "hate"
  | "harassment"
  | "violence"
  | "self_harm"
  | "sexual"
  | "dangerous"
  | "illegal";

// =============================================================================
// CLIENT CONFIG
// =============================================================================

export interface LumenClientConfig {
  /** OpenRouter API key (encrypted or plain) */
  openrouterApiKey: string;

  /** Token encryption key for decrypting stored API keys */
  encryptionKey?: string;

  /** D1 database instance for quota tracking */
  db?: D1Database;

  /** Cloudflare AI binding (for moderation/embeddings) */
  ai?: Ai;

  /** Feature flag to enable/disable Lumen */
  enabled?: boolean;
}
