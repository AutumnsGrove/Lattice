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
  | "code" // Code tasks → Claude via OpenRouter
  | "transcription"; // Voice-to-text → Whisper (CF Workers AI)

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

  /**
   * Skip quota enforcement for this request.
   * Use for system/admin operations or BYOK users who pay via their own key.
   * When true, the request still routes through Lumen's pipeline but won't
   * count toward the tenant's daily limits or reject on quota exhaustion.
   */
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

  /** Enable Songbird prompt injection protection (3-layer pipeline) */
  songbird?: boolean | SongbirdOptions;

  /** Enrich request with distilled web content via Shutter (not yet implemented) */
  shutter?: ShutterOptions;

  /** Augment request with MCP tool results (not yet implemented) */
  mcp?: LumenMcpOptions;

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
// TRANSCRIPTION (SCRIBE)
// =============================================================================

/**
 * Transcription mode determines how voice input is processed.
 *
 * - "raw": Direct 1:1 transcription, what you say is what you get
 * - "draft": AI-structured output with auto-generated Vines for tangents
 */
export type ScribeMode = "raw" | "draft";

export interface LumenTranscriptionRequest {
  /** Audio data as Uint8Array (from MediaRecorder or file upload) */
  audio: Uint8Array;

  /** Tenant ID for quota tracking */
  tenant?: string;

  /** Transcription options */
  options?: LumenTranscriptionOptions;
}

export interface LumenTranscriptionOptions {
  /** Transcription mode: "raw" for 1:1, "draft" for AI-structured */
  mode?: ScribeMode;

  /** Language hint (BCP-47 format, e.g., "en", "en-US") */
  language?: string;

  /** Include word-level timestamps in response */
  timestamps?: boolean;

  /** Skip PII scrubbing (for already-sanitized content) */
  skipPiiScrub?: boolean;

  /** Skip quota enforcement */
  skipQuota?: boolean;
}

export interface LumenTranscriptionResponse {
  /** Transcribed text (cleaned/structured if mode="draft") */
  text: string;

  /** Word count of the transcription */
  wordCount: number;

  /** Duration of the audio in seconds */
  duration: number;

  /** Processing latency in milliseconds */
  latency: number;

  /** Model that was used */
  model: string;

  /** Provider that was used */
  provider: LumenProviderName;

  /**
   * Gutter content for Vine creation (only present in "draft" mode).
   * Each item represents a tangent or aside that should become a Vine.
   */
  gutterContent?: GutterItem[];

  /**
   * Raw transcript before structuring (only present in "draft" mode).
   * Useful for comparison or fallback.
   */
  rawTranscript?: string;
}

/**
 * A gutter item represents content to be added to the document's margin.
 * In Scribe's draft mode, these are auto-generated Vines for tangents.
 */
export interface GutterItem {
  /** The type of gutter content */
  type: "vine";

  /** The text content for the Vine */
  content: string;

  /** Optional anchor text this Vine relates to */
  anchor?: string;
}

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

// =============================================================================
// SONGBIRD TYPES
// =============================================================================

export interface SongbirdOptions {
  /** Custom Kestrel context (overrides task-based defaults) */
  context?: KestrelContext;

  /** Skip canary check (only run Kestrel + Robin) */
  skipCanary?: boolean;

  /** Custom confidence threshold (default: 0.85) */
  confidenceThreshold?: number;
}

export interface KestrelContext {
  /** What kind of system this is */
  contextType: string;

  /** What the user is expected to be doing */
  expectedUseCase: string;

  /** Bullet points of expected input characteristics */
  expectedPatterns: string;

  /** Policy rules for validation */
  relevantPolicies: string;
}

export interface SongbirdResult {
  /** Whether the input passed all checks */
  passed: boolean;

  /** Which layer failed (if any) */
  failedLayer?: "canary" | "kestrel";

  /** Kestrel confidence score (if Kestrel ran) */
  confidence?: number;

  /** Kestrel reason (if Kestrel ran) */
  reason?: string;

  /** Timing metrics */
  metrics: {
    canaryMs?: number;
    kestrelMs?: number;
  };
}

// =============================================================================
// SHUTTER TYPES (STUB — not yet implemented)
// =============================================================================

/**
 * Options for Shutter web content distillation.
 *
 * Shutter fetches a URL and uses a cheap/fast LLM to extract only the
 * content relevant to a query — giving agents 200 focused tokens instead
 * of 20,000 raw HTML tokens. Also provides prompt injection defense by
 * isolating raw page content from the driver model.
 *
 * @see https://github.com/AutumnsGrove/Shutter
 */
export interface ShutterOptions {
  /** URL(s) to fetch and distill */
  urls: string | string[];

  /** What to extract from the page(s) */
  query: string;

  /** Model tier for extraction (default: "fast") */
  model?: ShutterModelTier;

  /** Maximum tokens for extracted content per URL (default: 500) */
  maxTokens?: number;

  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;

  /** How to inject distilled content into the request */
  inject?: ShutterInjectMode;
}

/** Shutter model tiers — speed vs accuracy tradeoff */
export type ShutterModelTier = "fast" | "accurate" | "research" | "code";

/** How distilled content gets injected into the Lumen request */
export type ShutterInjectMode =
  | "prepend" // Add as context before user message (default)
  | "append" // Add after user message
  | "system"; // Add as a system message

export interface ShutterResult {
  /** Distilled content from each URL */
  extractions: ShutterExtraction[];

  /** Total tokens consumed by the distillation step */
  totalTokensUsed: number;

  /** Total time for all fetches + distillation */
  totalMs: number;
}

export interface ShutterExtraction {
  /** Source URL */
  url: string;

  /** Extracted content (null if blocked by injection detection) */
  extracted: string | null;

  /** Token counts for this extraction */
  tokensInput: number;
  tokensOutput: number;

  /** Prompt injection detection result (null if clean) */
  promptInjection: ShutterInjectionResult | null;
}

export interface ShutterInjectionResult {
  /** Whether injection was detected */
  detected: boolean;

  /** Type of injection pattern */
  type: string;

  /** Snippet of the offending content */
  snippet: string;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Contributing detection signals */
  signals: string[];
}

// =============================================================================
// MCP TYPES (STUB — not yet implemented)
// =============================================================================

/**
 * Options for MCP (Model Context Protocol) tool augmentation.
 *
 * MCP allows Lumen to invoke external tools (Tavily search, Context7 docs,
 * custom MCP servers) and inject their results as context before the main
 * inference call. Clients get richer responses without managing tool APIs.
 *
 * @see https://modelcontextprotocol.io
 */
export interface LumenMcpOptions {
  /** Which tools to invoke (or "auto" to let Lumen decide based on task) */
  tools?: LumenMcpToolRef[] | "auto";

  /** Maximum total tokens to inject from tool results (default: 2000) */
  maxContextTokens?: number;

  /** Timeout for all tool calls combined (default: 15000ms) */
  timeoutMs?: number;

  /** How to inject tool results into the request */
  inject?: McpInjectMode;

  /** Per-tool API key overrides (BYOK for tool providers) */
  toolKeys?: Record<string, string>;
}

/** Reference to an MCP tool to invoke */
export interface LumenMcpToolRef {
  /** Tool server identifier (e.g., "tavily", "context7", "custom") */
  server: string;

  /** Tool name within the server (e.g., "search", "query-docs") */
  tool: string;

  /** Arguments to pass to the tool */
  args?: Record<string, unknown>;
}

/** How tool results get injected into the Lumen request */
export type McpInjectMode =
  | "system" // Add as system message context (default)
  | "prepend" // Prepend to user message
  | "append"; // Append after user message

/** Configuration for a registered MCP server */
export interface LumenMcpServerConfig {
  /** Unique server identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Server transport type */
  transport: McpTransportType;

  /** Connection URL (for HTTP/SSE transports) */
  url?: string;

  /** Available tools on this server */
  tools: LumenMcpToolDefinition[];

  /** Whether this server requires authentication */
  requiresAuth: boolean;
}

/** MCP transport types supported */
export type McpTransportType = "stdio" | "sse" | "http";

/** Definition of a tool available on an MCP server */
export interface LumenMcpToolDefinition {
  /** Tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for tool arguments */
  inputSchema: Record<string, unknown>;

  /** Which Lumen tasks this tool is relevant for (for "auto" mode) */
  relevantTasks?: LumenTask[];
}

/** Result from running MCP tools */
export interface LumenMcpResult {
  /** Results from each tool invocation */
  toolResults: LumenMcpToolResult[];

  /** Total tokens used by injected context */
  totalTokens: number;

  /** Total time for all tool calls */
  totalMs: number;
}

/** Result from a single MCP tool call */
export interface LumenMcpToolResult {
  /** Server that provided this result */
  server: string;

  /** Tool that was called */
  tool: string;

  /** Extracted/formatted content to inject */
  content: string;

  /** Token count for this result */
  tokens: number;

  /** Latency for this tool call */
  latencyMs: number;

  /** Whether the call succeeded */
  success: boolean;

  /** Error message (if failed) */
  error?: string;
}
