/**
 * Bluesky Provider
 *
 * AT Protocol adapter for posting to Bluesky.
 * Uses @atproto/api for session management and post creation.
 * Follows the same circuit breaker + retry pattern as resend.ts.
 */

import { BskyAgent, RichText } from "@atproto/api";
import type { SocialProvider, SocialContent, SocialDelivery } from "../types";
import { ZEPHYR_ERRORS, logZephyrError } from "../errors";

// =============================================================================
// Circuit Breaker (same pattern as resend.ts)
// =============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuitState: CircuitState = {
  failures: 0,
  lastFailure: 0,
  open: false,
};

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_TIMEOUT = 30_000; // 30 seconds

function isCircuitOpen(): boolean {
  if (circuitState.open) {
    if (Date.now() - circuitState.lastFailure > CIRCUIT_TIMEOUT) {
      circuitState.open = false;
      circuitState.failures = 0;
      return false;
    }
    return true;
  }
  return false;
}

function recordFailure(): void {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();
  if (circuitState.failures >= CIRCUIT_THRESHOLD) {
    circuitState.open = true;
    logZephyrError(ZEPHYR_ERRORS.CIRCUIT_OPEN, {
      detail: "Circuit breaker threshold reached",
    });
  }
}

function recordSuccess(): void {
  if (circuitState.failures > 0) {
    circuitState.failures = 0;
    circuitState.open = false;
  }
}

// =============================================================================
// Session Management
// =============================================================================

/** Cached agent with active session */
let cachedAgent: BskyAgent | null = null;
let sessionExpiresAt = 0;

/** Session validity window — refresh 5 minutes before expiry */
const SESSION_BUFFER_MS = 5 * 60 * 1000;

/**
 * Get or create an authenticated Bluesky agent.
 * Sessions are cached in memory and refreshed when stale.
 */
async function ensureSession(
  handle: string,
  appPassword: string,
): Promise<BskyAgent> {
  const now = Date.now();

  // Reuse cached session if still valid
  if (cachedAgent && now < sessionExpiresAt - SESSION_BUFFER_MS) {
    return cachedAgent;
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });

  await agent.login({
    identifier: handle,
    password: appPassword,
  });

  cachedAgent = agent;
  // AT Protocol sessions last ~2 hours; refresh well before
  sessionExpiresAt = now + 90 * 60 * 1000; // 90 minutes

  return agent;
}

// =============================================================================
// Retry Helper
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(message: string): boolean {
  return /timeout|network|econnreset|5\d{2}|rate limit|too many/i.test(message);
}

/**
 * Sanitize error messages before returning to callers.
 * AT Protocol errors might reference credentials or internal state.
 */
function sanitizeError(message: string): string {
  // Strip anything that looks like a credential or token
  let sanitized = message.replace(
    /password[=:]\s*\S+/gi,
    "password=[REDACTED]",
  );
  sanitized = sanitized.replace(/token[=:]\s*\S+/gi, "token=[REDACTED]");
  sanitized = sanitized.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  // Cap length to prevent massive error payloads
  if (sanitized.length > 500) {
    sanitized = sanitized.slice(0, 500) + "...";
  }
  return sanitized;
}

// =============================================================================
// Provider Implementation
// =============================================================================

export class BlueskyProvider implements SocialProvider {
  readonly platform = "bluesky" as const;

  constructor(
    private handle: string,
    private appPassword: string,
  ) {}

  /**
   * Post content to Bluesky.
   *
   * Uses RichText from @atproto/api for proper facet handling,
   * with our pre-computed facets as a fallback for URL links.
   *
   * Retry: 2 attempts, 1s backoff (social is less critical than email).
   */
  async post(content: SocialContent): Promise<SocialDelivery> {
    // Circuit breaker check
    if (isCircuitOpen()) {
      return {
        success: false,
        platform: "bluesky",
        error: {
          code: ZEPHYR_ERRORS.CIRCUIT_OPEN.code,
          message: ZEPHYR_ERRORS.CIRCUIT_OPEN.userMessage,
          retryable: true,
        },
      };
    }

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const agent = await ensureSession(this.handle, this.appPassword);

        // Use the AT Protocol's RichText for proper facet detection
        const rt = new RichText({ text: content.text });
        // Explicitly bind to avoid "illegal invocation" error in Cloudflare Workers
        await rt.detectFacets.call(rt, agent);

        const result = await agent.post({
          text: rt.text,
          facets: rt.facets,
          createdAt: new Date().toISOString(),
        });

        recordSuccess();

        // Extract post ID and URL from AT URI
        // AT URI format: at://did:plc:xxx/app.bsky.feed.post/yyy
        const atUri = result.uri;
        const postId = atUri.split("/").pop() || "";
        const postUrl = `https://bsky.app/profile/${this.handle}/post/${postId}`;

        return {
          success: true,
          platform: "bluesky",
          postId,
          postUrl,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // On auth failure, clear cached session so next attempt re-authenticates
        if (/auth|invalid token|expired/i.test(message)) {
          cachedAgent = null;
          sessionExpiresAt = 0;
        }

        if (!isRetryableError(message) || attempt === maxAttempts) {
          recordFailure();
          return {
            success: false,
            platform: "bluesky",
            error: {
              code: ZEPHYR_ERRORS.PROVIDER_ERROR.code,
              message: sanitizeError(message),
              retryable: isRetryableError(message),
            },
          };
        }

        // 1s backoff before retry
        await sleep(1000);
      }
    }

    // Should not reach here
    return {
      success: false,
      platform: "bluesky",
      error: {
        code: ZEPHYR_ERRORS.INTERNAL_ERROR.code,
        message: ZEPHYR_ERRORS.INTERNAL_ERROR.userMessage,
        retryable: false,
      },
    };
  }

  /**
   * Verify that Bluesky credentials are valid.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await ensureSession(this.handle, this.appPassword);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get circuit breaker status for monitoring
 */
export function getBlueskyCircuitStatus(): {
  open: boolean;
  failures: number;
} {
  return {
    open: circuitState.open,
    failures: circuitState.failures,
  };
}
