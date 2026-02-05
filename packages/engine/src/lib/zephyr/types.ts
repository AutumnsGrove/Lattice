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
}
