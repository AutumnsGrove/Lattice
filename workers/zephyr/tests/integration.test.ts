/**
 * Integration Tests
 *
 * End-to-end tests for the complete email pipeline.
 */

import { describe, it, expect, vi } from "vitest";
import { validateRequest } from "../src/middleware/validation";
import { checkRateLimit } from "../src/middleware/rate-limit";
import { checkUnsubscribed } from "../src/middleware/unsubscribe";
import { renderTemplate } from "../src/templates";
import { logToD1 } from "../src/logging/d1";
import type { ZephyrRequest, EmailType } from "../src/types";

// Integration test that chains all middleware together
describe("Zephyr Email Pipeline", () => {
  describe("Full Flow Integration", () => {
    it("should process valid transactional email end-to-end", async () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user@example.com",
        data: { name: "Test User" },
        tenant: "grove",
        source: "onboarding",
        correlationId: "corr-123",
        idempotencyKey: "idem-456",
      };

      // Step 1: Validation
      const validation = validateRequest(request);
      expect(validation.valid).toBe(true);
      expect(validation.request).toEqual(request);

      // Step 2: Rate Limit (mocked)
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({ count: 5 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const rateLimit = await checkRateLimit(
        mockDb,
        request.tenant || "default",
        request.type,
        request.to,
      );
      expect(rateLimit.allowed).toBe(true);
      expect(rateLimit.remaining).toBeGreaterThan(0);

      // Step 3: Unsubscribe Check (mocked - not unsubscribed)
      const dbNoUnsub = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const unsubscribe = await checkUnsubscribed(dbNoUnsub, request.to);
      expect(unsubscribe.unsubscribed).toBe(false);

      // Step 4: Template Render (raw template for test)
      const rawRequest: ZephyrRequest = {
        ...request,
        template: "raw",
        html: "<p>Welcome Test User!</p>",
        text: "Welcome Test User!",
        subject: "Welcome to Grove",
      };

      const rendered = await renderTemplate(
        "raw",
        {},
        "https://test.render",
        rawRequest.html,
        rawRequest.text,
        rawRequest.subject,
      );

      expect(rendered.html).toBe("<p>Welcome Test User!</p>");
      expect(rendered.text).toBe("Welcome Test User!");
      expect(rendered.subject).toBe("Welcome to Grove");

      // All steps passed!
      expect(true).toBe(true);
    });

    it("should handle unsubscribed user early in pipeline", async () => {
      const request: ZephyrRequest = {
        type: "notification",
        template: "porch-reply",
        to: "unsubscribed@example.com",
      };

      // Validation passes
      const validation = validateRequest(request);
      expect(validation.valid).toBe(true);

      // Rate limit passes
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const rateLimit = await checkRateLimit(
        mockDb,
        "default",
        request.type,
        request.to,
      );
      expect(rateLimit.allowed).toBe(true);

      // But unsubscribed check fails
      const dbWithUnsub = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({
              unsubscribed_at: "2024-01-15T10:30:00Z",
              onboarding_emails_unsubscribed: 0,
            }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const unsubscribe = await checkUnsubscribed(dbWithUnsub, request.to);
      expect(unsubscribe.unsubscribed).toBe(true);

      // Pipeline would stop here - no email sent
      expect(unsubscribe.unsubscribedAt).toBe("2024-01-15T10:30:00Z");
    });

    it("should handle rate limit exhaustion", async () => {
      const request: ZephyrRequest = {
        type: "verification",
        template: "verify-email",
        to: "user@example.com",
      };

      // Validation passes
      const validation = validateRequest(request);
      expect(validation.valid).toBe(true);

      // But rate limit is exhausted (10 per minute for verification)
      const dbAtLimit = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({ count: 10 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const rateLimit = await checkRateLimit(
        dbAtLimit,
        "default",
        request.type,
        request.to,
      );
      expect(rateLimit.allowed).toBe(false);
      expect(rateLimit.message).toContain("verification");
      expect(rateLimit.remaining).toBe(0);

      // Pipeline would stop here - no email sent
    });

    it("should handle raw template validation", async () => {
      // Missing HTML/text
      const invalidRawRequest: ZephyrRequest = {
        type: "transactional",
        template: "raw",
        to: "user@example.com",
        subject: "Test",
      };

      const validation1 = validateRequest(invalidRawRequest);
      expect(validation1.valid).toBe(false);
      expect(validation1.errorCode).toBe("INVALID_TEMPLATE");

      // Missing subject
      const invalidRawRequest2: ZephyrRequest = {
        type: "transactional",
        template: "raw",
        to: "user@example.com",
        html: "<p>Test</p>",
      };

      const validation2 = validateRequest(invalidRawRequest2);
      expect(validation2.valid).toBe(false);
      expect(validation2.errorCode).toBe("INVALID_TEMPLATE");

      // Valid raw request
      const validRawRequest: ZephyrRequest = {
        type: "transactional",
        template: "raw",
        to: "user@example.com",
        html: "<p>Test</p>",
        subject: "Test Subject",
      };

      const validation3 = validateRequest(validRawRequest);
      expect(validation3.valid).toBe(true);
    });
  });

  describe("Error Propagation", () => {
    it("should propagate validation errors correctly", async () => {
      const invalidRequests = [
        { template: "welcome", to: "user@example.com" }, // Missing type
        { type: "transactional", to: "user@example.com" }, // Missing template
        { type: "transactional", template: "welcome" }, // Missing to
        { type: "invalid", template: "welcome", to: "user@example.com" }, // Invalid type
        { type: "transactional", template: "welcome", to: "not-an-email" }, // Invalid email
      ];

      for (const req of invalidRequests) {
        const result = validateRequest(req);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBeDefined();
        expect(result.errorMessage).toBeDefined();
      }
    });

    it("should handle concurrent rate limit checks", async () => {
      const mockDb = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      // Simulate concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() =>
          checkRateLimit(
            mockDb,
            "tenant-1",
            "transactional",
            "user@example.com",
          ),
        );

      const results = await Promise.all(promises);

      // All should pass with rate limit available
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe("Template Rendering Flow", () => {
    it("should handle raw template rendering", async () => {
      const rendered = await renderTemplate(
        "raw",
        {},
        "https://test.render",
        "<h1>Hello</h1>",
        "Hello",
        "Greeting",
      );

      expect(rendered.html).toBe("<h1>Hello</h1>");
      expect(rendered.text).toBe("Hello");
      expect(rendered.subject).toBe("Greeting");
    });

    it("should fallback text to html when text not provided", async () => {
      const rendered = await renderTemplate(
        "raw",
        {},
        "https://test.render",
        "<h1>Hello</h1>",
        undefined,
        "Greeting",
      );

      expect(rendered.html).toBe("<h1>Hello</h1>");
      expect(rendered.text).toBe("<h1>Hello</h1>");
    });

    it("should fallback html to text when html not provided", async () => {
      const rendered = await renderTemplate(
        "raw",
        {},
        "https://test.render",
        undefined,
        "Hello",
        "Greeting",
      );

      expect(rendered.html).toBe("Hello");
      expect(rendered.text).toBe("Hello");
    });
  });

  describe("D1 Logging Flow", () => {
    it("should log successful send with all metadata", async () => {
      const mockDb = {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...params: unknown[]) => ({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const logEntry = {
        id: "log-123",
        message_id: "msg-456",
        type: "transactional" as EmailType,
        template: "welcome",
        recipient: "user@example.com",
        subject: "Welcome to Grove",
        success: true,
        provider: "resend",
        attempts: 1,
        latency_ms: 150,
        tenant: "grove",
        source: "onboarding",
        correlation_id: "corr-789",
        idempotency_key: "idem-abc",
        created_at: Date.now(),
        sent_at: Date.now(),
      };

      await logToD1(mockDb, logEntry);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should log failed send with error details", async () => {
      const mockDb = {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...params: unknown[]) => ({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          })),
        })),
      } as unknown as D1Database;

      const logEntry = {
        id: "log-fail-123",
        type: "notification" as EmailType,
        template: "porch-reply",
        recipient: "user@example.com",
        success: false,
        error_code: "PROVIDER_ERROR" as const,
        error_message: "Network timeout",
        provider: "resend",
        attempts: 3,
        latency_ms: 5000,
        tenant: "grove",
        created_at: Date.now(),
      };

      await logToD1(mockDb, logEntry);

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
});
