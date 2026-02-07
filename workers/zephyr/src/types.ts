/**
 * Zephyr Types
 *
 * Shared types for the email gateway system.
 */

// =============================================================================
// Email Types
// =============================================================================

/**
 * Types of emails Zephyr handles
 */
export type EmailType =
  | "transactional"
  | "notification"
  | "verification"
  | "sequence"
  | "lifecycle"
  | "broadcast";

/**
 * Error codes returned by Zephyr
 */
export type ZephyrErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_TEMPLATE"
  | "INVALID_RECIPIENT"
  | "RATE_LIMITED"
  | "UNSUBSCRIBED"
  | "PROVIDER_ERROR"
  | "TEMPLATE_ERROR"
  | "CIRCUIT_OPEN"
  | "INTERNAL_ERROR";

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * Email send request
 */
export interface ZephyrRequest {
  /** Email type for rate limiting and categorization */
  type: EmailType;

  /** Template name or "raw" for pre-rendered HTML */
  template: string;

  /** Recipient email address */
  to: string;

  /** Optional recipient name */
  toName?: string;

  /** Email subject (required for raw templates) */
  subject?: string;

  /** Template data variables */
  data?: Record<string, unknown>;

  /** Pre-rendered HTML (for raw template) */
  html?: string;

  /** Pre-rendered text (for raw template) */
  text?: string;

  /** Sender email (defaults to configured default) */
  from?: string;

  /** Sender name */
  fromName?: string;

  /** Reply-to address */
  replyTo?: string;

  /** Custom email headers (e.g., List-Unsubscribe) */
  headers?: Record<string, string>;

  /** Tenant identifier for multi-tenant rate limiting */
  tenant?: string;

  /** Source service identifier */
  source?: string;

  /** Correlation ID for tracing */
  correlationId?: string;

  /** Idempotency key to prevent duplicate sends */
  idempotencyKey?: string;

  /** Schedule for later delivery (ISO timestamp) */
  scheduledAt?: string;
}

/**
 * Email send response
 */
export interface ZephyrResponse {
  /** Whether the send was successful */
  success: boolean;

  /** Message ID from provider */
  messageId?: string;

  /** Error code if failed */
  errorCode?: ZephyrErrorCode;

  /** Human-readable error message */
  errorMessage?: string;

  /** Number of retry attempts made */
  attempts?: number;

  /** Response latency in milliseconds */
  latencyMs?: number;

  /** Whether recipient was unsubscribed */
  unsubscribed?: boolean;
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Rate limit configuration per email type
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  perMinute: number;

  /** Maximum requests per day */
  perDay: number;
}

/**
 * Rate limit configs by email type
 */
export const RATE_LIMITS: Record<EmailType, RateLimitConfig> = {
  transactional: { perMinute: 60, perDay: 1000 },
  notification: { perMinute: 60, perDay: 1000 },
  verification: { perMinute: 10, perDay: 100 },
  sequence: { perMinute: 100, perDay: 5000 },
  lifecycle: { perMinute: 60, perDay: 500 },
  broadcast: { perMinute: 1000, perDay: 10000 },
};

// =============================================================================
// Logging
// =============================================================================

/**
 * D1 log entry for zephyr_logs table
 */
export interface ZephyrLogEntry {
  id: string;
  message_id?: string;
  type: EmailType;
  template: string;
  recipient: string;
  subject?: string;
  success: boolean;
  error_code?: ZephyrErrorCode;
  error_message?: string;
  provider?: string;
  attempts: number;
  latency_ms?: number;
  tenant?: string;
  source?: string;
  correlation_id?: string;
  idempotency_key?: string;
  created_at: number;
  scheduled_at?: number;
  sent_at?: number;
}

// =============================================================================
// Environment
// =============================================================================

/**
 * Worker environment bindings
 */
export interface Env {
  /** D1 Database for logs and rate limiting */
  DB: D1Database;

  /** Resend API key */
  RESEND_API_KEY: string;

  /** Zephyr service API key for authentication */
  ZEPHYR_API_KEY: string;

  /** Email render worker URL (fallback for local dev) */
  EMAIL_RENDER_URL: string;

  /** Service binding to email-render worker (preferred over URL) */
  EMAIL_RENDER?: Fetcher;

  /** Environment name */
  ENVIRONMENT?: string;

  /** Default sender email */
  DEFAULT_FROM_EMAIL?: string;

  /** Default sender name */
  DEFAULT_FROM_NAME?: string;
}

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Email provider interface
 */
export interface EmailProvider {
  name: string;
  send(
    request: ZephyrRequest,
    html: string,
    text: string,
  ): Promise<ProviderResult>;
}

/**
 * Result from email provider
 */
export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// Template Types
// =============================================================================

/**
 * Template render function
 */
export type TemplateRenderFn = (
  data: Record<string, unknown>,
) => Promise<{ html: string; text: string; subject: string }>;

/**
 * Template registry entry
 */
export interface TemplateEntry {
  render: TemplateRenderFn;
  subject: string;
}
