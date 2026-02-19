/**
 * Resend Provider
 *
 * Resend email provider implementation with retry logic and circuit breaker.
 */

import { Resend } from "resend";

export interface SendOptions {
  from: string;
  fromName: string;
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  scheduledAt?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

// Circuit breaker state
interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

// In-memory circuit breaker state (resets on worker restart)
const circuitStates = new Map<string, CircuitState>();

const CIRCUIT_THRESHOLD = 5; // failures
const CIRCUIT_TIMEOUT = 30000; // 30 seconds

/**
 * Get or create circuit state for an API key
 */
function getCircuitState(apiKey: string): CircuitState {
  if (!circuitStates.has(apiKey)) {
    circuitStates.set(apiKey, {
      failures: 0,
      lastFailure: 0,
      open: false,
    });
  }
  return circuitStates.get(apiKey)!;
}

/**
 * Check if circuit is open
 */
function isCircuitOpen(apiKey: string): boolean {
  const state = getCircuitState(apiKey);

  if (state.open) {
    // Check if we should close the circuit
    if (Date.now() - state.lastFailure > CIRCUIT_TIMEOUT) {
      state.open = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record a failure
 */
function recordFailure(apiKey: string): void {
  const state = getCircuitState(apiKey);
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.open = true;
    console.error(`[Zephyr] Circuit breaker opened for provider`);
  }
}

/**
 * Record a success
 */
function recordSuccess(apiKey: string): void {
  const state = getCircuitState(apiKey);
  if (state.failures > 0) {
    state.failures = 0;
    state.open = false;
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitize email header values
 *
 * Removes characters that are invalid in email headers:
 * - Newlines (\n, \r)
 * - Control characters
 * - Leading/trailing whitespace
 *
 * This prevents "Invalid header value" errors from Resend.
 */
function sanitizeHeader(value: string): string {
  return value
    .replace(/[\r\n\t]/g, " ") // Replace newlines and tabs with spaces
    .replace(/[^\x20-\x7E]/g, "") // Remove non-printable ASCII characters
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Send email with retry logic
 *
 * Retry config:
 * - 3 attempts max
 * - Exponential backoff: 1s, 2s
 * - Circuit breaker: 5 failures/min → pause 30s
 */
export async function sendWithRetry(
  apiKey: string,
  options: SendOptions,
  idempotencyKey?: string,
): Promise<SendResult> {
  // Check circuit breaker
  if (isCircuitOpen(apiKey)) {
    return {
      success: false,
      error: "Circuit breaker is open - too many recent failures",
      attempts: 0,
    };
  }

  const resend = new Resend(apiKey);
  const maxAttempts = 3;
  const backoffDelays = [1000, 2000]; // 1s, 2s

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Sanitize email headers to prevent "Invalid header value" errors
      const fromName = sanitizeHeader(options.fromName);
      const from = sanitizeHeader(options.from);
      const toName = options.toName ? sanitizeHeader(options.toName) : undefined;
      const subject = sanitizeHeader(options.subject);
      const replyTo = options.replyTo ? sanitizeHeader(options.replyTo) : undefined;

      const result = await resend.emails.send({
        from: `${fromName} <${from}>`,
        to: toName ? `${toName} <${options.to}>` : options.to,
        subject,
        html: options.html,
        text: options.text,
        replyTo,
        scheduledAt: options.scheduledAt,
        headers: {
          ...(options.headers || {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
      });

      if (result.error) {
        // Check if this is a retryable error
        const isRetryable = isRetryableError(result.error.message);

        if (!isRetryable || attempt === maxAttempts) {
          recordFailure(apiKey);
          return {
            success: false,
            error: result.error.message,
            attempts: attempt,
          };
        }

        // Wait before retry
        const delay = backoffDelays[attempt - 1] || 2000;
        await sleep(delay);
        continue;
      }

      // Success!
      recordSuccess(apiKey);
      return {
        success: true,
        messageId: result.data?.id,
        attempts: attempt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Check if this is a retryable error
      const isRetryable = isRetryableError(message);

      if (!isRetryable || attempt === maxAttempts) {
        recordFailure(apiKey);
        return {
          success: false,
          error: message,
          attempts: attempt,
        };
      }

      // Wait before retry
      const delay = backoffDelays[attempt - 1] || 2000;
      await sleep(delay);
    }
  }

  // Shouldn't reach here, but just in case
  return {
    success: false,
    error: "Max retry attempts exceeded",
    attempts: maxAttempts,
  };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /econnreset/i,
    /econnrefused/i,
    /5\d{2}/, // 5xx errors
    /rate limit/i,
    /too many requests/i,
  ];

  return retryablePatterns.some((pattern) => pattern.test(errorMessage));
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitStatus(apiKey: string): {
  open: boolean;
  failures: number;
  lastFailure: number;
} {
  const state = getCircuitState(apiKey);
  return {
    open: state.open,
    failures: state.failures,
    lastFailure: state.lastFailure,
  };
}
