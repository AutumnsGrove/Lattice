/**
 * Zephyr — Grove's Email Gateway Types
 *
 * Shared type definitions for email sending, routing, and error handling.
 * These types define the contract between services and the Zephyr worker.
 */

// =============================================================================
// Email Types & Templates
// =============================================================================

/**
 * Email categories for routing and handling.
 *
 * - transactional: One-to-one triggered emails (feedback confirmations)
 * - notification: System notifications (Porch replies, alerts)
 * - verification: Auth codes, magic links
 * - sequence: Onboarding drip emails (welcome, day-1, etc.)
 * - lifecycle: Payment, renewal, trial notifications
 * - broadcast: Marketing, announcements (lower retry priority)
 */
export type EmailType =
  | "transactional"
  | "notification"
  | "verification"
  | "sequence"
  | "lifecycle"
  | "broadcast";

/**
 * Template names for Zephyr rendering.
 * Use "raw" to pass pre-rendered HTML directly.
 */
export type TemplateName =
  // Sequences
  | "welcome"
  | "day-1"
  | "day-7"
  | "day-14"
  | "day-30"
  // Notifications
  | "porch-reply"
  // Verification
  | "verification-code"
  // Lifecycle
  | "payment-received"
  | "payment-failed"
  | "trial-ending"
  // Transactional
  | "feedback-forward"
  | "trace-notification"
  // Pass-through
  | "raw";

// =============================================================================
// Request / Response
// =============================================================================

/**
 * Email send request to Zephyr.
 *
 * Services call Zephyr with this payload. Zephyr handles validation,
 * template rendering, provider routing, retries, and logging.
 */
export interface ZephyrRequest {
  /** Email category for routing and handling */
  type: EmailType;

  /** Template to render (or "raw" for pre-rendered) */
  template: TemplateName | string;

  /** Recipient email address */
  to: string;

  /** Template data for personalization */
  data?: Record<string, unknown>;

  /** Override the default from address */
  from?: string;

  /** Override the subject line (some templates have defaults) */
  subject?: string;

  /** Pre-rendered HTML (required when template is "raw") */
  html?: string;

  /** Pre-rendered plain text (optional for "raw" template) */
  text?: string;

  /** Schedule for later delivery (ISO timestamp) */
  scheduledAt?: string;

  /** Idempotency key to prevent duplicate sends */
  idempotencyKey?: string;

  /** Metadata for logging and debugging */
  metadata?: ZephyrMetadata;
}

/**
 * Metadata attached to email requests for tracing and debugging.
 */
export interface ZephyrMetadata {
  /** Tenant/user ID for multi-tenant tracking */
  tenant?: string;

  /** Source service (e.g., "porch-admin", "plant-webhook") */
  source?: string;

  /** Correlation ID for tracing across services */
  correlationId?: string;

  /** Audience type for sequence emails */
  audienceType?: string;
}

/**
 * Response from Zephyr after processing an email request.
 *
 * IMPORTANT: Errors are RETURNED, not swallowed. Callers must check
 * success and handle failures appropriately.
 */
export interface ZephyrResponse {
  /** Whether the email was sent/scheduled successfully */
  success: boolean;

  /** Resend message ID (if successful) */
  messageId?: string;

  /** Error details (if unsuccessful) */
  error?: ZephyrError;

  /** Processing metadata */
  metadata: ZephyrResponseMetadata;
}

/**
 * Structured error response.
 */
export interface ZephyrError {
  /** Error code for programmatic handling */
  code: ZephyrErrorCode;

  /** Human-readable error message */
  message: string;

  /** Whether this error is retryable */
  retryable: boolean;

  /** Additional error context */
  details?: Record<string, unknown>;
}

/**
 * Error codes for different failure scenarios.
 */
export type ZephyrErrorCode =
  | "INVALID_REQUEST" // Bad request format or missing fields
  | "INVALID_TEMPLATE" // Unknown template name
  | "INVALID_RECIPIENT" // Malformed email or blocklisted
  | "RATE_LIMITED" // Too many requests
  | "UNSUBSCRIBED" // Recipient has unsubscribed
  | "PROVIDER_ERROR" // Resend/SES returned an error
  | "TEMPLATE_ERROR" // Template rendering failed
  | "CIRCUIT_OPEN" // Circuit breaker is open
  | "IDEMPOTENCY_CONFLICT" // Duplicate idempotency key
  | "NETWORK_ERROR"; // Client-side network/timeout failure

/**
 * Processing metadata included in responses.
 */
export interface ZephyrResponseMetadata {
  /** Which provider sent the email */
  provider: string;

  /** Number of send attempts */
  attempts: number;

  /** Total processing time in milliseconds */
  latencyMs: number;

  /** Zephyr request ID for debugging */
  requestId: string;
}

// =============================================================================
// Email Type Configuration
// =============================================================================

/**
 * Configuration for each email type.
 */
export interface EmailTypeConfig {
  /** Default from address */
  from: string;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Whether to track opens (marketing only) */
  trackOpens: boolean;

  /** Default reply-to address */
  replyTo?: string;
}

/**
 * Email type configuration registry.
 */
export const EMAIL_TYPE_CONFIG: Record<EmailType, EmailTypeConfig> = {
  transactional: {
    from: "Grove <hello@grove.place>",
    maxRetries: 3,
    trackOpens: false,
  },
  notification: {
    from: "Autumn at Grove <porch@grove.place>",
    maxRetries: 3,
    trackOpens: false,
    replyTo: "porch@grove.place",
  },
  verification: {
    from: "Grove <hello@grove.place>",
    maxRetries: 3,
    trackOpens: false,
  },
  sequence: {
    from: "Autumn <autumn@grove.place>",
    maxRetries: 3,
    trackOpens: true,
  },
  lifecycle: {
    from: "Grove <hello@grove.place>",
    maxRetries: 3,
    trackOpens: false,
  },
  broadcast: {
    from: "Autumn <autumn@grove.place>",
    maxRetries: 1, // Lower retry for broadcasts
    trackOpens: true,
  },
};

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry configuration for exponential backoff.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Initial delay in milliseconds */
  baseDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Error codes that should trigger a retry.
 */
export const RETRYABLE_ERRORS: ZephyrErrorCode[] = [
  "PROVIDER_ERROR",
  "CIRCUIT_OPEN",
  "NETWORK_ERROR",
];

/**
 * Error codes that should NOT retry.
 */
export const NON_RETRYABLE_ERRORS: ZephyrErrorCode[] = [
  "INVALID_REQUEST",
  "INVALID_TEMPLATE",
  "INVALID_RECIPIENT",
  "UNSUBSCRIBED",
  "RATE_LIMITED",
  "IDEMPOTENCY_CONFLICT",
];

// =============================================================================
// Circuit Breaker Configuration
// =============================================================================

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time window for counting failures (ms) */
  windowMs: number;

  /** Cooldown time when circuit is open (ms) */
  cooldownMs: number;

  /** Number of test requests in half-open state */
  halfOpenRequests: number;
}

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  windowMs: 60000, // 1 minute
  cooldownMs: 30000, // 30 seconds
  halfOpenRequests: 2,
};

/**
 * Circuit breaker states.
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Email provider interface for abstraction.
 */
export interface EmailProvider {
  /** Provider name */
  name: string;

  /** Send an email */
  send(request: ProviderRequest): Promise<ProviderResponse>;

  /** Check if provider is healthy */
  isHealthy(): Promise<boolean>;
}

/**
 * Provider-level request (post-template-rendering).
 */
export interface ProviderRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  scheduledAt?: string;
  tags?: string[];
}

/**
 * Provider-level response.
 */
export interface ProviderResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

// =============================================================================
// Logging Types
// =============================================================================

/**
 * Email log record for D1 storage.
 */
export interface ZephyrLogRecord {
  id: string;
  message_id: string | null;
  type: EmailType;
  template: string;
  recipient: string;
  subject: string | null;
  success: number; // 0 or 1 for SQLite
  error_code: ZephyrErrorCode | null;
  error_message: string | null;
  provider: string | null;
  attempts: number;
  latency_ms: number;
  tenant: string | null;
  source: string | null;
  correlation_id: string | null;
  idempotency_key: string | null;
  created_at: number;
  scheduled_at: number | null;
  sent_at: number | null;
}

// =============================================================================
// Worker Environment
// =============================================================================

/**
 * Cloudflare Worker environment bindings.
 */
export interface Env {
  /** D1 database for logging */
  DB: D1Database;

  /** Resend API key */
  RESEND_API_KEY: string;

  /** Optional: KV namespace for circuit breaker state */
  CIRCUIT_STATE?: KVNamespace;

  /** Optional: Base URL for email links */
  BASE_URL?: string;
}
