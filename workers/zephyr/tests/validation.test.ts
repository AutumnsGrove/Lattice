/**
 * Validation Middleware Tests
 *
 * Tests for the request validation middleware.
 */

import { describe, it, expect } from "vitest";
import { validateRequest } from "../src/middleware/validation";
import type { ZephyrRequest } from "../src/types";

describe("validateRequest", () => {
  it("should validate a complete request", () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "WelcomeEmail",
      to: "user@example.com",
      tenant: "grove",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(true);
    expect(result.request).toEqual(request);
  });

  it("should reject missing type", () => {
    const request = {
      template: "WelcomeEmail",
      to: "user@example.com",
    } as ZephyrRequest;

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-031");
    expect(result.errorMessage).toContain("type");
  });

  it("should reject missing template", () => {
    const request = {
      type: "transactional",
      to: "user@example.com",
    } as ZephyrRequest;

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-031");
    expect(result.errorMessage).toContain("template");
  });

  it("should reject missing to", () => {
    const request = {
      type: "transactional",
      template: "WelcomeEmail",
    } as ZephyrRequest;

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-031");
    expect(result.errorMessage).toContain("to");
  });

  it("should reject invalid email", () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "WelcomeEmail",
      to: "invalid-email",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-033");
  });

  it("should reject invalid email type", () => {
    const request: ZephyrRequest = {
      type: "invalid" as any,
      template: "WelcomeEmail",
      to: "user@example.com",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-032");
  });

  it("should reject raw template without html/text", () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "raw",
      to: "user@example.com",
      subject: "Test",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-034");
  });

  it("should reject raw template without subject", () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "raw",
      to: "user@example.com",
      html: "<p>Hello</p>",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("ZEPHYR-034");
  });

  it("should accept raw template with html and subject", () => {
    const request: ZephyrRequest = {
      type: "transactional",
      template: "raw",
      to: "user@example.com",
      html: "<p>Hello</p>",
      subject: "Test",
    };

    const result = validateRequest(request);
    expect(result.valid).toBe(true);
  });

  describe("Edge Cases", () => {
    it("should accept raw template with text only", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "raw",
        to: "user@example.com",
        text: "Hello text",
        subject: "Test",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should accept all valid email types", () => {
      const validTypes = [
        "transactional",
        "notification",
        "verification",
        "sequence",
        "lifecycle",
        "broadcast",
      ];

      for (const type of validTypes) {
        const request: ZephyrRequest = {
          type: type as any,
          template: "welcome",
          to: "user@example.com",
        };

        const result = validateRequest(request);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject null body", () => {
      const result = validateRequest(null);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-030");
    });

    it("should reject non-object body", () => {
      const result = validateRequest("string");
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-030");
    });

    it("should reject email with spaces", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user @example.com",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-033");
    });

    it("should reject email without TLD", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user@example",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-033");
    });

    it("should reject email with multiple @ symbols", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user@example@com",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-033");
    });

    it("should accept valid email with plus sign", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user+tag@example.com",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should accept valid email with dots", () => {
      const request: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "first.last@example.com",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it("should reject empty string values", () => {
      const request: ZephyrRequest = {
        type: "" as any,
        template: "welcome",
        to: "user@example.com",
      };

      const result = validateRequest(request);
      expect(result.valid).toBe(false);
    });

    it("should validate scheduledAt format", () => {
      const validRequest: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user@example.com",
        scheduledAt: "2024-01-15T10:30:00Z",
      };

      expect(validateRequest(validRequest).valid).toBe(true);

      const invalidRequest: ZephyrRequest = {
        type: "transactional",
        template: "welcome",
        to: "user@example.com",
        scheduledAt: "not-a-date",
      };

      const result = validateRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("ZEPHYR-035");
    });
  });
});
