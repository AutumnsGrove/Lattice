/**
 * Lumen AI Gateway - Error Types
 *
 * Custom errors for the Lumen system with proper error codes
 * for debugging and user-facing messages.
 */

import type { LumenProviderName, LumenTask } from "./types.js";

// =============================================================================
// ERROR CODES
// =============================================================================

export type LumenErrorCode =
  | "QUOTA_EXCEEDED" // Daily quota limit reached
  | "PROVIDER_ERROR" // Provider returned an error
  | "PROVIDER_TIMEOUT" // Provider request timed out
  | "ALL_PROVIDERS_FAILED" // All providers in fallback chain failed
  | "INVALID_TASK" // Unknown task type
  | "INVALID_INPUT" // Malformed input
  | "RATE_LIMITED" // Rate limit hit
  | "UNAUTHORIZED" // Missing/invalid API key
  | "DISABLED" // Lumen is disabled for this tenant
  | "SONGBIRD_REJECTED"; // Content failed Songbird security validation

// =============================================================================
// BASE ERROR
// =============================================================================

export class LumenError extends Error {
  readonly code: LumenErrorCode;
  readonly provider?: LumenProviderName;
  readonly task?: LumenTask;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(
    message: string,
    code: LumenErrorCode,
    options?: {
      provider?: LumenProviderName;
      task?: LumenTask;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "LumenError";
    this.code = code;
    this.provider = options?.provider;
    this.task = options?.task;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.code) {
      case "QUOTA_EXCEEDED":
        return "You've reached your daily AI usage limit. It resets at midnight UTC.";
      case "PROVIDER_TIMEOUT":
        return "The AI service is taking too long. Please try again.";
      case "ALL_PROVIDERS_FAILED":
        return "AI services are temporarily unavailable. Please try again later.";
      case "RATE_LIMITED":
        return "Too many requests. Please wait a moment and try again.";
      case "UNAUTHORIZED":
        return "AI service authentication failed. Please contact support.";
      case "DISABLED":
        return "AI features are not available for your account.";
      case "SONGBIRD_REJECTED":
        return "Your request could not be processed due to security validation.";
      default:
        return "Something went wrong with the AI service. Please try again.";
    }
  }
}

// =============================================================================
// SPECIFIC ERRORS
// =============================================================================

export class QuotaExceededError extends LumenError {
  readonly limit: number;
  readonly used: number;

  constructor(task: LumenTask, limit: number, used: number) {
    super(
      `Quota exceeded for task "${task}": ${used}/${limit} requests used`,
      "QUOTA_EXCEEDED",
      { task, retryable: false },
    );
    this.name = "QuotaExceededError";
    this.limit = limit;
    this.used = used;
  }
}

export class ProviderError extends LumenError {
  readonly statusCode?: number;

  constructor(
    provider: LumenProviderName,
    message: string,
    statusCode?: number,
    cause?: unknown,
  ) {
    super(`Provider ${provider} error: ${message}`, "PROVIDER_ERROR", {
      provider,
      retryable: statusCode ? statusCode >= 500 : true,
      cause,
    });
    this.name = "ProviderError";
    this.statusCode = statusCode;
  }
}

export class ProviderTimeoutError extends LumenError {
  readonly timeoutMs: number;

  constructor(provider: LumenProviderName, timeoutMs: number) {
    super(
      `Provider ${provider} timed out after ${timeoutMs}ms`,
      "PROVIDER_TIMEOUT",
      { provider, retryable: true },
    );
    this.name = "ProviderTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class AllProvidersFailedError extends LumenError {
  readonly attempts: Array<{
    provider: LumenProviderName;
    model: string;
    error: string;
  }>;

  constructor(
    task: LumenTask,
    attempts: Array<{
      provider: LumenProviderName;
      model: string;
      error: string;
    }>,
  ) {
    const summary = attempts
      .map((a) => `${a.provider}/${a.model}: ${a.error}`)
      .join("; ");
    super(
      `All providers failed for task "${task}". Attempts: ${summary}`,
      "ALL_PROVIDERS_FAILED",
      { task, retryable: true, cause: attempts },
    );
    this.name = "AllProvidersFailedError";
    this.attempts = attempts;
  }
}
