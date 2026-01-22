/**
 * Lumen - Grove's Unified AI Gateway
 *
 * Consolidates all AI inference across the platform into a single,
 * well-architected routing layer.
 *
 * Features:
 * - Task-based routing (generation, summary, chat, image, code, moderation, embedding)
 * - Multi-provider support (OpenRouter, Cloudflare Workers AI)
 * - Automatic fallback when providers fail
 * - Tier-based quota management
 * - PII scrubbing for privacy
 * - Usage tracking and analytics
 *
 * @example
 * ```typescript
 * import { createLumenClient } from '@autumnsgrove/groveengine/lumen';
 *
 * const lumen = createLumenClient({
 *   openrouterApiKey: env.OPENROUTER_API_KEY,
 *   ai: env.AI, // Cloudflare AI binding
 *   db: env.DB, // D1 database for quota tracking
 * });
 *
 * // Text generation
 * const response = await lumen.run({
 *   task: 'generation',
 *   input: 'Write a haiku about coding',
 *   tenant: 'tenant_123',
 * }, 'seedling');
 *
 * // Streaming
 * for await (const chunk of lumen.stream({
 *   task: 'chat',
 *   input: messages,
 *   tenant: 'tenant_123',
 * }, 'seedling')) {
 *   process.stdout.write(chunk.content);
 * }
 *
 * // Embeddings
 * const embeddings = await lumen.embed({
 *   input: 'Hello, world!',
 *   tenant: 'tenant_123',
 * }, 'seedling');
 *
 * // Moderation
 * const moderation = await lumen.moderate({
 *   content: 'User submitted content',
 *   tenant: 'tenant_123',
 * }, 'seedling');
 * ```
 *
 * @see docs/specs/lumen-spec.md
 */

// =============================================================================
// CLIENT
// =============================================================================

export {
  LumenClient,
  createLumenClient,
  createLumenClientWithDecryption,
} from "./client.js";

// =============================================================================
// TYPES
// =============================================================================

export type {
  LumenTask,
  LumenMessage,
  LumenMessageRole,
  LumenContentPart,
  LumenRequest,
  LumenRequestOptions,
  LumenResponse,
  LumenUsage,
  LumenStreamChunk,
  LumenProviderName,
  LumenProviderConfig,
  LumenEmbeddingRequest,
  LumenEmbeddingResponse,
  LumenModerationRequest,
  LumenModerationResponse,
  LumenModerationCategory,
  LumenClientConfig,
  SongbirdOptions,
  KestrelContext,
  SongbirdResult,
  ShutterOptions,
  ShutterModelTier,
  ShutterInjectMode,
  ShutterResult,
  ShutterExtraction,
  ShutterInjectionResult,
  LumenMcpOptions,
  LumenMcpToolRef,
  McpInjectMode,
  LumenMcpServerConfig,
  McpTransportType,
  LumenMcpToolDefinition,
  LumenMcpResult,
  LumenMcpToolResult,
} from "./types.js";

// =============================================================================
// SONGBIRD
// =============================================================================

export { runSongbird } from "./songbird.js";

// =============================================================================
// SHUTTER (STUB)
// =============================================================================

export { runShutter, injectShutterContext } from "./shutter.js";

// =============================================================================
// MCP (STUB)
// =============================================================================

export { McpServerRegistry, runMcpTools, injectMcpContext } from "./mcp.js";

// =============================================================================
// ERRORS
// =============================================================================

export {
  LumenError,
  QuotaExceededError,
  ProviderError,
  ProviderTimeoutError,
  AllProvidersFailedError,
  type LumenErrorCode,
} from "./errors.js";

// =============================================================================
// CONFIG
// =============================================================================

export {
  MODELS,
  MODEL_COSTS,
  TASK_REGISTRY,
  PROVIDERS,
  getTaskConfig,
  getModelCost,
  calculateCost,
  getModelsForProvider,
  type TaskConfig,
} from "./config.js";

// =============================================================================
// QUOTA
// =============================================================================

export {
  LUMEN_QUOTAS,
  getTierQuota,
  getTierQuotas,
  isTaskAvailable,
  formatQuota,
  calculateUsagePercent,
  wouldExceedQuota,
} from "./quota/limits.js";

export {
  QuotaTracker,
  createQuotaTracker,
  type QuotaCheckResult,
  type UsageRecord,
} from "./quota/tracker.js";

// =============================================================================
// PROVIDERS (for advanced usage)
// =============================================================================

export {
  createProviders,
  getAvailableProviders,
  OpenRouterProvider,
  createOpenRouterProvider,
  CloudflareAIProvider,
  createCloudflareAIProvider,
  type LumenProvider,
  type LumenInferenceOptions,
  type LumenProviderResponse,
  type ProviderRegistry,
} from "./providers/index.js";

// =============================================================================
// PIPELINE (for advanced usage)
// =============================================================================

export {
  scrubPii,
  scrubMessages,
  validateRequest,
  secureUserContent,
  preprocess,
  type ScrubResult,
  type PreprocessResult,
} from "./pipeline/preprocessor.js";

export {
  normalizeResponse,
  createUsageLog,
  calculateStats,
  type PostprocessInput,
  type UsageLogEntry,
  type TenantUsageStats,
} from "./pipeline/postprocessor.js";

// =============================================================================
// ROUTER (for advanced usage)
// =============================================================================

export {
  routeTask,
  executeWithFallback,
  executeEmbedding,
  executeModeration,
  type RouteResult,
  type ExecuteResult,
} from "./router.js";
