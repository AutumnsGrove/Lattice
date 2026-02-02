/**
 * Send Handler Tests
 *
 * Integration tests for the main email send handler.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendHandler } from "../src/handlers/send";
import type { ZephyrRequest } from "../src/types";

// Mock dependencies
vi.mock("../src/middleware/validation", () => ({
  validateRequest: vi.fn(),
}));

vi.mock("../src/middleware/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("../src/middleware/unsubscribe", () => ({
  checkUnsubscribed: vi.fn(),
}));

vi.mock("../src/templates", () => ({
  renderTemplate: vi.fn(),
}));

vi.mock("../src/providers/resend", () => ({
  sendWithRetry: vi.fn(),
}));

vi.mock("../src/logging/d1", () => ({
  logToD1: vi.fn(),
}));

import { validateRequest } from "../src/middleware/validation";
import { checkRateLimit } from "../src/middleware/rate-limit";
import { checkUnsubscribed } from "../src/middleware/unsubscribe";
import { renderTemplate } from "../src/templates";
import { sendWithRetry } from "../src/providers/resend";
import { logToD1 } from "../src/logging/d1";

// Helper to create mock Hono context
function createMockContext(
  body: ZephyrRequest,
  env: Record<string, string> = {},
) {
  const waitUntilPromises: Promise<unknown>[] = [];
  return {
    req: {
      json: vi.fn().mockResolvedValue(body),
    },
    env: {
      DB: {} as D1Database,
      RESEND_API_KEY: "test-api-key",
      EMAIL_RENDER_URL: "https://test.render",
      DEFAULT_FROM_EMAIL: "test@grove.place",
      DEFAULT_FROM_NAME: "Test",
      ...env,
    },
    json: vi.fn((data: unknown, status?: number) => ({ data, status })),
    executionCtx: {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        waitUntilPromises.push(promise);
      }),
    },
    // Expose for tests to await background work
    waitUntilPromises,
  };
}

describe("sendHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully send email through full pipeline", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
      data: { name: "Test User" },
      tenant: "grove",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome to Grove",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });

    // Verify all steps were called
    expect(validateRequest).toHaveBeenCalledWith(request);
    expect(checkRateLimit).toHaveBeenCalled();
    expect(checkUnsubscribed).toHaveBeenCalled();
    expect(renderTemplate).toHaveBeenCalled();
    expect(sendWithRetry).toHaveBeenCalled();
    // Logging should be called via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 400 on validation failure", async () => {
    const request = { type: "", template: "", to: "" };

    vi.mocked(validateRequest).mockReturnValue({
      valid: false,
      errorCode: "INVALID_REQUEST",
      errorMessage: "Missing required field: type",
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request as ZephyrRequest);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(400);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "INVALID_REQUEST",
      errorMessage: "Missing required field: type",
    });

    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 429 when rate limited", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      message: "Rate limit exceeded: 60 transactional emails per minute",
      remaining: 0,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(429);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "RATE_LIMITED",
    });
    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 403 when recipient is unsubscribed", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "unsubscribed@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: true,
      unsubscribedAt: "2024-01-15T10:30:00Z",
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(403);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "UNSUBSCRIBED",
      unsubscribed: true,
    });
    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 400 on template rendering error", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "nonexistent",
      to: "user@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockRejectedValue(
      new Error("Template not found: nonexistent"),
    );

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(400);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "TEMPLATE_ERROR",
    });
    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should return 502 on provider error", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome to Grove",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: false,
      error: "Provider API error",
      attempts: 3,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(502);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "PROVIDER_ERROR",
      attempts: 3,
    });
    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should handle circuit breaker open", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome to Grove",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: false,
      error: "Circuit breaker is open - too many recent failures",
      attempts: 0,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(502);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "PROVIDER_ERROR",
    });
    expect(result.data.errorMessage).toContain("Circuit breaker");
    // Should log the failure via waitUntil
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should handle raw template pass-through", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "raw",
      to: "user@example.com",
      subject: "Custom Subject",
      html: "<p>Custom HTML</p>",
      text: "Custom text",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Custom HTML</p>",
      text: "Custom text",
      subject: "Custom Subject",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: true,
      messageId: "msg_raw",
      attempts: 1,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(200);
    expect(renderTemplate).toHaveBeenCalledWith(
      "raw",
      {},
      expect.any(String),
      "<p>Custom HTML</p>",
      "Custom text",
      "Custom Subject",
    );
    // Should log via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should include latency in response", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    const result = await sendHandler(mockContext as any);

    expect(result.data.latencyMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.data.latencyMs).toBe("number");
    // Should log via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should handle unexpected errors gracefully", async () => {
    const mockContext = {
      req: {
        json: vi.fn().mockRejectedValue(new Error("JSON parse error")),
      },
      env: {
        DB: {} as D1Database,
      },
      json: vi.fn((data: unknown, status?: number) => ({ data, status })),
      executionCtx: {
        waitUntil: vi.fn(),
      },
    };

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const result = await sendHandler(mockContext as any);

    expect(result.status).toBe(500);
    expect(result.data).toMatchObject({
      success: false,
      errorCode: "INTERNAL_ERROR",
    });
    // Should log via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should pass idempotency key to provider", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
      idempotencyKey: "unique-key-123",
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome to Grove",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    await sendHandler(mockContext as any);

    expect(sendWithRetry).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      "unique-key-123",
    );
    // Should log via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });

  it("should use default tenant when not provided", async () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "welcome",
      to: "user@example.com",
      // No tenant specified
    };

    vi.mocked(validateRequest).mockReturnValue({
      valid: true,
      request,
    });

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
    });

    vi.mocked(checkUnsubscribed).mockResolvedValue({
      unsubscribed: false,
    });

    vi.mocked(renderTemplate).mockResolvedValue({
      html: "<p>Welcome!</p>",
      text: "Welcome!",
      subject: "Welcome to Grove",
    });

    vi.mocked(sendWithRetry).mockResolvedValue({
      success: true,
      messageId: "msg_123",
      attempts: 1,
    });

    vi.mocked(logToD1).mockResolvedValue(undefined);

    const mockContext = createMockContext(request);
    await sendHandler(mockContext as any);

    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Object),
      "default", // Default tenant
      "transactional",
      "user@example.com",
    );
    // Should log via waitUntil (fire-and-forget)
    expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
  });
});
