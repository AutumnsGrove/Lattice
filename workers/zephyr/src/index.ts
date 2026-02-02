/**
 * Zephyr — Grove's Email Gateway
 *
 * A Cloudflare Worker that handles all email sending for Grove services.
 *
 * Features:
 * - Unified API for all email types
 * - Retry logic with exponential backoff
 * - Circuit breaker for provider resilience
 * - Template rendering with React Email
 * - D1 logging for audit and debugging
 * - Error surfacing (never swallows failures)
 *
 * @example
 * // From any Grove service:
 * const result = await fetch(ZEPHYR_URL, {
 *   method: "POST",
 *   body: JSON.stringify({
 *     type: "notification",
 *     template: "porch-reply",
 *     to: "visitor@example.com",
 *     data: { content: "Thanks for reaching out!" },
 *   }),
 * });
 */

import type {
  Env,
  ZephyrRequest,
  ZephyrResponse,
  ZephyrResponseMetadata,
  ProviderRequest,
} from "./types";
import { EMAIL_TYPE_CONFIG } from "./types";
import { validateRequest } from "./middleware/validation";
import {
  checkCircuit,
  recordSuccess,
  recordFailure,
  getAllCircuitStates,
} from "./middleware/circuit-breaker";
import { getPrimaryProvider } from "./providers";
import { logEmailSend, checkIdempotency, getEmailStats } from "./logging/d1";
import { renderTemplate, getTemplateSubject } from "./templates";
import {
  invalidRequest,
  providerError,
  idempotencyConflict,
  templateError,
} from "./errors";
import type { ZephyrErrorCode } from "./types";

/**
 * Map error codes to appropriate HTTP status codes.
 *
 * 4xx = Client errors (bad request, won't succeed on retry)
 * 5xx = Server errors (transient, may succeed on retry)
 */
function getHttpStatus(response: ZephyrResponse): number {
  if (response.success) {
    return 200;
  }

  const code = response.error?.code as ZephyrErrorCode | undefined;

  switch (code) {
    // Client errors (4xx)
    case "INVALID_REQUEST":
    case "INVALID_TEMPLATE":
    case "INVALID_RECIPIENT":
      return 400;
    case "UNSUBSCRIBED":
      return 403; // Forbidden - recipient opted out
    case "RATE_LIMITED":
      return 429;
    case "IDEMPOTENCY_CONFLICT":
      return 409; // Conflict

    // Server/infrastructure errors (5xx)
    case "PROVIDER_ERROR":
    case "TEMPLATE_ERROR":
    case "NETWORK_ERROR":
      return 502; // Bad Gateway - upstream provider failed
    case "CIRCUIT_OPEN":
      return 503; // Service Unavailable - circuit breaker open

    default:
      return 500; // Unknown error
  }
}

/**
 * Generate a unique request ID for tracing.
 */
function generateRequestId(): string {
  return `zeph_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a response with standard metadata.
 */
function createResponse(
  success: boolean,
  data: Partial<ZephyrResponse>,
  metadata: Partial<ZephyrResponseMetadata>,
): ZephyrResponse {
  return {
    success,
    ...data,
    metadata: {
      provider: metadata.provider || "none",
      attempts: metadata.attempts || 0,
      latencyMs: metadata.latencyMs || 0,
      requestId: metadata.requestId || generateRequestId(),
    },
  };
}

/**
 * Main email send handler.
 */
async function handleSend(
  request: ZephyrRequest,
  env: Env,
  requestId: string,
): Promise<ZephyrResponse> {
  const startTime = Date.now();

  // Validate request
  const validationError = validateRequest(request);
  if (validationError) {
    return createResponse(
      false,
      { error: validationError },
      {
        requestId,
        latencyMs: Date.now() - startTime,
      },
    );
  }

  // Check idempotency
  if (request.idempotencyKey) {
    const existing = await checkIdempotency(env, request.idempotencyKey);
    if (existing) {
      // Return the previous result (including original error if it failed)
      // This allows callers to see what actually happened, not just "conflict"
      return createResponse(
        existing.success === 1,
        {
          messageId: existing.message_id || undefined,
          error:
            existing.success === 0
              ? {
                  // Reconstruct original error from stored fields
                  code: existing.error_code || "PROVIDER_ERROR",
                  message:
                    existing.error_message ||
                    "Previous send attempt failed (idempotent replay)",
                  retryable: false, // Don't retry idempotent requests
                  details: { idempotencyKey: request.idempotencyKey },
                }
              : undefined,
        },
        {
          requestId,
          latencyMs: Date.now() - startTime,
          provider: existing.provider || "cached",
          attempts: 0,
        },
      );
    }
  }

  // Get email type configuration
  const typeConfig = EMAIL_TYPE_CONFIG[request.type];

  // Check circuit breaker
  const provider = getPrimaryProvider(env);
  const circuitError = checkCircuit(provider.name);
  if (circuitError) {
    const response = createResponse(
      false,
      { error: circuitError },
      {
        requestId,
        provider: provider.name,
        latencyMs: Date.now() - startTime,
        attempts: 0,
      },
    );

    await logEmailSend(env, request, response);
    return response;
  }

  // Render template (or use raw HTML)
  let html: string;
  let text: string | undefined;
  let subject: string;

  if (request.template === "raw") {
    // Pass-through mode
    html = request.html!;
    text = request.text;
    subject = request.subject || "(No subject)";
  } else {
    try {
      const rendered = await renderTemplate(
        request.template,
        request.data || {},
      );
      html = rendered.html;
      text = rendered.text;
      subject =
        request.subject || getTemplateSubject(request.template, request.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const response = createResponse(
        false,
        {
          error: {
            code: "TEMPLATE_ERROR",
            message: `Template render failed: ${message}`,
            retryable: false,
          },
        },
        {
          requestId,
          provider: provider.name,
          latencyMs: Date.now() - startTime,
          attempts: 0,
        },
      );

      await logEmailSend(env, request, response, subject);
      return response;
    }
  }

  // Build provider request
  const providerRequest: ProviderRequest = {
    from: request.from || typeConfig.from,
    to: request.to,
    subject,
    html,
    text,
    replyTo: typeConfig.replyTo,
    scheduledAt: request.scheduledAt,
    tags: [request.type, request.template],
  };

  // Send via provider
  const providerResponse = await provider.send(providerRequest);

  // Update circuit breaker
  if (providerResponse.success) {
    recordSuccess(provider.name);
  } else {
    // Only record failure for server errors (5xx)
    if (providerResponse.statusCode && providerResponse.statusCode >= 500) {
      recordFailure(provider.name);
    }
  }

  // Build response
  const response = createResponse(
    providerResponse.success,
    {
      messageId: providerResponse.messageId,
      error: providerResponse.success
        ? undefined
        : providerError(
            provider.name,
            providerResponse.error || "Unknown error",
            providerResponse.statusCode,
          ),
    },
    {
      requestId,
      provider: provider.name,
      latencyMs: Date.now() - startTime,
      attempts: 1, // Retries happen inside provider
    },
  );

  // Log to D1
  await logEmailSend(env, request, response, subject);

  return response;
}

/**
 * Health check endpoint.
 */
function handleHealth(): Response {
  return Response.json({
    status: "ok",
    service: "zephyr",
    version: "1.0.0",
    circuits: getAllCircuitStates(),
  });
}

/**
 * Stats endpoint for monitoring.
 */
async function handleStats(env: Env): Promise<Response> {
  // Stats for the last 24 hours
  const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const stats = await getEmailStats(env, since);

  return Response.json({
    period: "24h",
    ...stats,
    circuits: getAllCircuitStates(),
  });
}

/**
 * Worker fetch handler.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = generateRequestId();

    // CORS headers for service-to-service calls
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/health" || url.pathname === "/") {
      return handleHealth();
    }

    // Stats endpoint
    if (url.pathname === "/stats" && request.method === "GET") {
      return handleStats(env);
    }

    // Send endpoint
    if (url.pathname === "/send" && request.method === "POST") {
      try {
        const body = (await request.json()) as ZephyrRequest;
        const response = await handleSend(body, env, requestId);

        return Response.json(response, {
          status: getHttpStatus(response),
          headers: {
            ...corsHeaders,
            "X-Zephyr-Request-Id": requestId,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid request body";

        return Response.json(
          createResponse(
            false,
            { error: invalidRequest(message) },
            { requestId },
          ),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "X-Zephyr-Request-Id": requestId,
            },
          },
        );
      }
    }

    // 404 for unknown routes
    return Response.json(
      { error: "Not found", path: url.pathname },
      { status: 404, headers: corsHeaders },
    );
  },
};
