/**
 * Validation Middleware Tests
 *
 * Tests the request validation gate that prevents bad data from entering Zephyr.
 */

import { describe, it, expect } from "vitest";
import { validateRequest, isKnownTemplate } from "./validation";
import type { ZephyrRequest } from "../types";

// =============================================================================
// Test Helpers
// =============================================================================

function validRequest(overrides: Partial<ZephyrRequest> = {}): ZephyrRequest {
  return {
    type: "transactional",
    template: "raw",
    to: "test@example.com",
    html: "<p>Hello</p>",
    ...overrides,
  };
}

// =============================================================================
// Required Fields
// =============================================================================

describe("validateRequest: required fields", () => {
  it("should reject request missing type", () => {
    const request = validRequest({ type: undefined as any });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("type");
  });

  it("should reject request missing template", () => {
    const request = validRequest({ template: undefined as any });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("template");
  });

  it("should reject request missing to", () => {
    const request = validRequest({ to: undefined as any });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("to");
  });

  it("should accept valid request with all required fields", () => {
    const request = validRequest();

    const error = validateRequest(request);

    expect(error).toBeNull();
  });
});

// =============================================================================
// Email Type Validation
// =============================================================================

describe("validateRequest: email types", () => {
  it.each([
    "transactional",
    "notification",
    "verification",
    "sequence",
    "lifecycle",
    "broadcast",
  ])("should accept valid email type: %s", (type) => {
    const request = validRequest({ type: type as any });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should reject invalid email type", () => {
    const request = validRequest({ type: "marketing" as any });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("Invalid email type");
  });
});

// =============================================================================
// Template Validation
// =============================================================================

describe("validateRequest: templates", () => {
  it.each([
    "welcome",
    "day-1",
    "day-7",
    "day-14",
    "day-30",
    "porch-reply",
    "verification-code",
    "payment-received",
    "payment-failed",
    "trial-ending",
    "raw",
  ])("should accept known template: %s", (template) => {
    const request = validRequest({
      template,
      html: template === "raw" ? "<p>test</p>" : undefined,
    });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should reject unknown template", () => {
    const request = validRequest({ template: "unknown-template" });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TEMPLATE");
  });

  it("should reject raw template without html", () => {
    const request = validRequest({ template: "raw", html: undefined });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("html");
  });
});

// =============================================================================
// Email Address Validation
// =============================================================================

describe("validateRequest: email format", () => {
  it.each([
    "user@example.com",
    "user.name@example.com",
    "user+tag@example.com",
    "user@sub.example.com",
  ])("should accept valid email: %s", (email) => {
    const request = validRequest({ to: email });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it.each([
    "not-an-email",
    "missing@domain",
    "@no-local.com",
    "spaces in@email.com",
    // Note: "" is not here because it fails required field check first (INVALID_REQUEST)
  ])("should reject invalid email: %s", (email) => {
    const request = validRequest({ to: email });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_RECIPIENT");
  });

  it("should accept from address in Name <email> format", () => {
    const request = validRequest({
      from: "Autumn <autumn@grove.place>",
    });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should accept from address as plain email", () => {
    const request = validRequest({
      from: "hello@grove.place",
    });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should reject invalid from address format", () => {
    const request = validRequest({
      from: "Not A Valid <address",
    });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("from");
  });
});

// =============================================================================
// Scheduled At Validation
// =============================================================================

describe("validateRequest: scheduledAt", () => {
  it("should accept valid future ISO date", () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    const request = validRequest({ scheduledAt: futureDate });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should reject invalid date format", () => {
    const request = validRequest({ scheduledAt: "not-a-date" });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_REQUEST");
    expect(error?.message).toContain("scheduledAt");
  });

  it("should reject date in the past", () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const request = validRequest({ scheduledAt: pastDate });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("past");
  });

  it("should accept date far in the future (let Resend enforce limits)", () => {
    // We don't enforce the 72h limit - Resend will reject and we surface the error
    // This allows callers to handle long-term scheduling appropriately
    const farFuture = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 7 days
    const request = validRequest({ scheduledAt: farFuture });

    const error = validateRequest(request);

    expect(error).toBeNull(); // Let it through, Resend will reject if needed
  });
});

// =============================================================================
// Idempotency Key Validation
// =============================================================================

describe("validateRequest: idempotencyKey", () => {
  it("should accept valid idempotency key", () => {
    const request = validRequest({ idempotencyKey: "unique-key-123" });

    const error = validateRequest(request);

    expect(error).toBeNull();
  });

  it("should reject idempotency key over 256 characters", () => {
    const longKey = "a".repeat(257);
    const request = validRequest({ idempotencyKey: longKey });

    const error = validateRequest(request);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("256");
  });
});

// =============================================================================
// isKnownTemplate Helper
// =============================================================================

describe("isKnownTemplate", () => {
  it("should return true for known templates", () => {
    expect(isKnownTemplate("porch-reply")).toBe(true);
    expect(isKnownTemplate("welcome")).toBe(true);
    expect(isKnownTemplate("raw")).toBe(true);
  });

  it("should return false for unknown templates", () => {
    expect(isKnownTemplate("unknown")).toBe(false);
    expect(isKnownTemplate("")).toBe(false);
  });
});
