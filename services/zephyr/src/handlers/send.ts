/**
 * Send Handler
 *
 * Main email send handler that orchestrates:
 * 1. Request validation
 * 2. Rate limiting check
 * 3. Unsubscribe check
 * 4. Template rendering
 * 5. Provider sending with retry
 * 6. D1 logging
 * 7. Response return
 */

import type { Context } from "hono";
import type { Env, ZephyrRequest, ZephyrResponse } from "../types";
import { validateRequest } from "../middleware/validation";
import { checkRateLimit } from "../middleware/rate-limit";
import { checkUnsubscribed } from "../middleware/unsubscribe";
import { renderTemplate } from "../templates";
import { sendWithRetry } from "../providers/resend";
import { logToD1 } from "../logging/d1";
import { ZEPHYR_ERRORS, logZephyrError } from "../errors";

export async function sendHandler(c: Context<{ Bindings: Env }>) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const body = await c.req.json<ZephyrRequest>();

    // Step 1: Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      const response: ZephyrResponse = {
        success: false,
        errorCode: validation.errorCode!,
        errorMessage: validation.errorMessage!,
        latencyMs: Date.now() - startTime,
      };

      // Fire-and-forget logging - don't block response
      c.executionCtx.waitUntil(
        logToD1(c.env.DB, {
          id: requestId,
          type: body.type || "transactional",
          template: body.template || "unknown",
          recipient: body.to || "unknown",
          success: false,
          error_code: validation.errorCode!,
          error_message: validation.errorMessage!,
          attempts: 0,
          latency_ms: response.latencyMs,
          tenant: body.tenant,
          source: body.source,
          correlation_id: body.correlationId,
          idempotency_key: body.idempotencyKey,
          created_at: Date.now(),
        }),
      );

      return c.json(response, 400);
    }

    const request = validation.request!;

    // Step 2: Check rate limits and unsubscribe status in parallel
    const [rateLimitResult, unsubscribeResult] = await Promise.all([
      checkRateLimit(
        c.env.DB,
        request.tenant || "default",
        request.type,
        request.to,
      ),
      checkUnsubscribed(c.env.DB, request.to),
    ]);

    // Check rate limit first
    if (!rateLimitResult.allowed) {
      const response: ZephyrResponse = {
        success: false,
        errorCode: ZEPHYR_ERRORS.RATE_LIMITED.code,
        errorMessage: rateLimitResult.message,
        latencyMs: Date.now() - startTime,
      };

      // Fire-and-forget logging - don't block response
      c.executionCtx.waitUntil(
        logToD1(c.env.DB, {
          id: requestId,
          type: request.type,
          template: request.template,
          recipient: request.to,
          success: false,
          error_code: ZEPHYR_ERRORS.RATE_LIMITED.code,
          error_message: rateLimitResult.message,
          attempts: 0,
          latency_ms: response.latencyMs,
          tenant: request.tenant,
          source: request.source,
          correlation_id: request.correlationId,
          idempotency_key: request.idempotencyKey,
          created_at: Date.now(),
        }),
      );

      return c.json(response, 429);
    }

    // Check unsubscribe status
    if (unsubscribeResult.unsubscribed) {
      const response: ZephyrResponse = {
        success: false,
        errorCode: ZEPHYR_ERRORS.UNSUBSCRIBED.code,
        errorMessage: "Recipient has unsubscribed from emails",
        unsubscribed: true,
        latencyMs: Date.now() - startTime,
      };

      // Fire-and-forget logging - don't block response
      c.executionCtx.waitUntil(
        logToD1(c.env.DB, {
          id: requestId,
          type: request.type,
          template: request.template,
          recipient: request.to,
          success: false,
          error_code: ZEPHYR_ERRORS.UNSUBSCRIBED.code,
          error_message: response.errorMessage,
          attempts: 0,
          latency_ms: response.latencyMs,
          tenant: request.tenant,
          source: request.source,
          correlation_id: request.correlationId,
          idempotency_key: request.idempotencyKey,
          created_at: Date.now(),
        }),
      );

      return c.json(response, 403);
    }

    // Step 4: Render template
    let html: string;
    let text: string;
    let subject: string;

    try {
      const rendered = await renderTemplate(
        request.template,
        request.data || {},
        c.env.EMAIL_RENDER_URL,
        request.html,
        request.text,
        request.subject,
        c.env.EMAIL_RENDER,
      );
      html = rendered.html;
      text = rendered.text;
      subject = rendered.subject;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const response: ZephyrResponse = {
        success: false,
        errorCode: ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED.code,
        errorMessage: message,
        latencyMs: Date.now() - startTime,
      };

      // Fire-and-forget logging - don't block response
      c.executionCtx.waitUntil(
        logToD1(c.env.DB, {
          id: requestId,
          type: request.type,
          template: request.template,
          recipient: request.to,
          subject: request.subject,
          success: false,
          error_code: ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED.code,
          error_message: message,
          attempts: 0,
          latency_ms: response.latencyMs,
          tenant: request.tenant,
          source: request.source,
          correlation_id: request.correlationId,
          idempotency_key: request.idempotencyKey,
          created_at: Date.now(),
        }),
      );

      return c.json(response, 400);
    }

    // Step 5: Send via provider with retry
    const providerResult = await sendWithRetry(
      c.env.RESEND_API_KEY,
      {
        from: request.from || c.env.DEFAULT_FROM_EMAIL || "autumn@grove.place",
        fromName: request.fromName || c.env.DEFAULT_FROM_NAME || "Autumn",
        to: request.to,
        toName: request.toName,
        subject,
        html,
        text,
        replyTo: request.replyTo,
        headers: request.headers,
        scheduledAt: request.scheduledAt,
      },
      request.idempotencyKey,
    );

    const latencyMs = Date.now() - startTime;

    // Step 6: Log to D1 (fire-and-forget, don't block response)
    c.executionCtx.waitUntil(
      logToD1(c.env.DB, {
        id: requestId,
        message_id: providerResult.messageId,
        type: request.type,
        template: request.template,
        recipient: request.to,
        subject,
        success: providerResult.success,
        error_code: providerResult.error
          ? ZEPHYR_ERRORS.PROVIDER_ERROR.code
          : undefined,
        error_message: providerResult.error,
        provider: "resend",
        attempts: providerResult.attempts || 1,
        latency_ms: latencyMs,
        tenant: request.tenant,
        source: request.source,
        correlation_id: request.correlationId,
        idempotency_key: request.idempotencyKey,
        created_at: Date.now(),
        sent_at: providerResult.success ? Date.now() : undefined,
      }),
    );

    // Step 7: Return response immediately (don't wait for logging)
    const response: ZephyrResponse = {
      success: providerResult.success,
      messageId: providerResult.messageId,
      errorCode: providerResult.error
        ? ZEPHYR_ERRORS.PROVIDER_ERROR.code
        : undefined,
      errorMessage: providerResult.error,
      attempts: providerResult.attempts,
      latencyMs,
    };

    const statusCode = providerResult.success ? 200 : 502;
    return c.json(response, statusCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latencyMs = Date.now() - startTime;

    logZephyrError(ZEPHYR_ERRORS.INTERNAL_ERROR, { cause: error });

    // Fire-and-forget logging - don't block response
    c.executionCtx.waitUntil(
      logToD1(c.env.DB, {
        id: requestId,
        type: "transactional",
        template: "unknown",
        recipient: "unknown",
        success: false,
        error_code: ZEPHYR_ERRORS.INTERNAL_ERROR.code,
        error_message: message,
        attempts: 0,
        latency_ms: latencyMs,
        created_at: Date.now(),
      }),
    );

    const response: ZephyrResponse = {
      success: false,
      errorCode: ZEPHYR_ERRORS.INTERNAL_ERROR.code,
      errorMessage: message,
      latencyMs,
    };

    return c.json(response, 500);
  }
}
