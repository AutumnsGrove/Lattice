/**
 * Zephyr Client Types
 *
 * Re-export types from the Zephyr worker for client use.
 */

export type EmailType =
  | "transactional"
  | "notification"
  | "verification"
  | "sequence"
  | "lifecycle"
  | "broadcast";

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

export interface ZephyrRequest {
  type: EmailType;
  template: string;
  to: string;
  toName?: string;
  subject?: string;
  data?: Record<string, unknown>;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  /** Custom email headers (e.g., List-Unsubscribe) */
  headers?: Record<string, string>;
  tenant?: string;
  source?: string;
  correlationId?: string;
  idempotencyKey?: string;
  scheduledAt?: string;
}

export interface ZephyrResponse {
  success: boolean;
  messageId?: string;
  errorCode?: ZephyrErrorCode;
  errorMessage?: string;
  attempts?: number;
  latencyMs?: number;
  unsubscribed?: boolean;
}

export interface ZephyrConfig {
  baseUrl: string;
  apiKey: string;
  /** Service Binding Fetcher for direct Worker-to-Worker communication. */
  fetcher?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
}

// =============================================================================
// Social Broadcasting Types
// =============================================================================

export type SocialPlatform = "bluesky";

export interface BroadcastRequest {
  /** Channel identifier */
  channel: "social";

  /** Text content to post */
  content: string;

  /** Target platforms (specific list or "all") */
  platforms: SocialPlatform[] | "all";

  /** Optional deduplication key */
  idempotencyKey?: string;

  /** Optional metadata for tracing */
  metadata?: {
    tenant?: string;
    source?: string;
    correlationId?: string;
  };
}

export interface BroadcastResponse {
  /** True only when ALL platforms succeed */
  success: boolean;

  /** True when some-but-not-all platforms succeeded */
  partial: boolean;

  /** Per-platform delivery results */
  deliveries: SocialDelivery[];

  /** Aggregate counts */
  summary: {
    attempted: number;
    succeeded: number;
    failed: number;
  };

  /** Response metadata */
  metadata: {
    broadcastId: string;
    latencyMs: number;
  };
}

export interface SocialDelivery {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  postUrl?: string;
  skipped?: boolean;
  skipReason?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
