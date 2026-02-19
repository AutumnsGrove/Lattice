/**
 * Lumen Error Tests
 *
 * Tests error types and user-friendly messages.
 * Critical for user experience when things go wrong.
 */

import { describe, it, expect } from "vitest";
import {
  LumenError,
  QuotaExceededError,
  ProviderError,
  ProviderTimeoutError,
  AllProvidersFailedError,
} from "./errors.js";

// =============================================================================
// BASE ERROR
// =============================================================================

describe("LumenError", () => {
  describe("Construction", () => {
    it("should create error with code and message", () => {
      const error = new LumenError("Test error", "INVALID_INPUT");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("INVALID_INPUT");
      expect(error.name).toBe("LumenError");
    });

    it("should set optional properties", () => {
      const error = new LumenError("Test error", "PROVIDER_ERROR", {
        provider: "openrouter",
        task: "generation",
        retryable: true,
        cause: new Error("Original"),
      });

      expect(error.provider).toBe("openrouter");
      expect(error.task).toBe("generation");
      expect(error.retryable).toBe(true);
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should default retryable to false", () => {
      const error = new LumenError("Test", "INVALID_INPUT");
      expect(error.retryable).toBe(false);
    });
  });

  describe("toUserMessage - User-Friendly Messages", () => {
    it("should return friendly message for QUOTA_EXCEEDED", () => {
      const error = new LumenError("Internal msg", "QUOTA_EXCEEDED");
      expect(error.toUserMessage()).toBe(
        "You've reached your daily AI usage limit. It resets at midnight UTC.",
      );
    });

    it("should return friendly message for PROVIDER_TIMEOUT", () => {
      const error = new LumenError("Internal msg", "PROVIDER_TIMEOUT");
      expect(error.toUserMessage()).toBe(
        "The AI service is taking too long. Please try again.",
      );
    });

    it("should return friendly message for ALL_PROVIDERS_FAILED", () => {
      const error = new LumenError("Internal msg", "ALL_PROVIDERS_FAILED");
      expect(error.toUserMessage()).toBe(
        "AI services are temporarily unavailable. Please try again later.",
      );
    });

    it("should return friendly message for RATE_LIMITED", () => {
      const error = new LumenError("Internal msg", "RATE_LIMITED");
      expect(error.toUserMessage()).toBe(
        "Too many requests. Please wait a moment and try again.",
      );
    });

    it("should return friendly message for UNAUTHORIZED", () => {
      const error = new LumenError("Internal msg", "UNAUTHORIZED");
      expect(error.toUserMessage()).toBe(
        "AI service authentication failed. Please contact support.",
      );
    });

    it("should return friendly message for DISABLED", () => {
      const error = new LumenError("Internal msg", "DISABLED");
      expect(error.toUserMessage()).toBe(
        "AI features are not available for your account.",
      );
    });

    it("should return generic message for unknown codes", () => {
      const error = new LumenError("Internal msg", "PROVIDER_ERROR");
      expect(error.toUserMessage()).toBe(
        "Something went wrong with the AI service. Please try again.",
      );
    });
  });
});

// =============================================================================
// QUOTA EXCEEDED ERROR
// =============================================================================

describe("QuotaExceededError", () => {
  it("should include limit and usage information", () => {
    const error = new QuotaExceededError("generation", 100, 100);

    expect(error.code).toBe("QUOTA_EXCEEDED");
    expect(error.task).toBe("generation");
    expect(error.limit).toBe(100);
    expect(error.used).toBe(100);
    expect(error.retryable).toBe(false);
  });

  it("should include usage in message", () => {
    const error = new QuotaExceededError("generation", 100, 105);

    expect(error.message).toContain("105/100");
    expect(error.message).toContain("generation");
  });

  it("should return user-friendly message", () => {
    const error = new QuotaExceededError("generation", 100, 100);

    expect(error.toUserMessage()).toContain("daily AI usage limit");
  });
});

// =============================================================================
// PROVIDER ERROR
// =============================================================================

describe("ProviderError", () => {
  it("should include provider name", () => {
    const error = new ProviderError("openrouter", "API error");

    expect(error.code).toBe("PROVIDER_ERROR");
    expect(error.provider).toBe("openrouter");
    expect(error.message).toContain("openrouter");
    expect(error.message).toContain("API error");
  });

  it("should include status code when provided", () => {
    const error = new ProviderError("openrouter", "Not found", 404);

    expect(error.statusCode).toBe(404);
  });

  it("should be retryable for 5xx errors", () => {
    const error500 = new ProviderError("openrouter", "Server error", 500);
    const error503 = new ProviderError("openrouter", "Unavailable", 503);

    expect(error500.retryable).toBe(true);
    expect(error503.retryable).toBe(true);
  });

  it("should not be retryable for 4xx errors", () => {
    const error400 = new ProviderError("openrouter", "Bad request", 400);
    const error404 = new ProviderError("openrouter", "Not found", 404);

    expect(error400.retryable).toBe(false);
    expect(error404.retryable).toBe(false);
  });

  it("should preserve original cause", () => {
    const originalError = new Error("Network failure");
    const error = new ProviderError(
      "openrouter",
      "Connection failed",
      undefined,
      originalError,
    );

    expect(error.cause).toBe(originalError);
  });
});

// =============================================================================
// PROVIDER TIMEOUT ERROR
// =============================================================================

describe("ProviderTimeoutError", () => {
  it("should include timeout duration", () => {
    const error = new ProviderTimeoutError("openrouter", 30000);

    expect(error.code).toBe("PROVIDER_TIMEOUT");
    expect(error.provider).toBe("openrouter");
    expect(error.timeoutMs).toBe(30000);
    expect(error.message).toContain("30000ms");
  });

  it("should be retryable", () => {
    const error = new ProviderTimeoutError("openrouter", 30000);
    expect(error.retryable).toBe(true);
  });

  it("should return user-friendly message", () => {
    const error = new ProviderTimeoutError("openrouter", 30000);
    expect(error.toUserMessage()).toContain("taking too long");
  });
});

// =============================================================================
// ALL PROVIDERS FAILED ERROR
// =============================================================================

describe("AllProvidersFailedError", () => {
  it("should include all attempt details", () => {
    const attempts = [
      {
        provider: "openrouter" as const,
        model: "deepseek/v3",
        error: "Rate limit",
      },
      {
        provider: "cloudflare-ai" as const,
        model: "@cf/meta/llama",
        error: "Timeout",
      },
    ];

    const error = new AllProvidersFailedError("generation", attempts);

    expect(error.code).toBe("ALL_PROVIDERS_FAILED");
    expect(error.task).toBe("generation");
    expect(error.attempts).toEqual(attempts);
    expect(error.cause).toBe(attempts);
  });

  it("should format attempt summary in message", () => {
    const attempts = [
      {
        provider: "openrouter" as const,
        model: "deepseek/v3",
        error: "Rate limit",
      },
      {
        provider: "cloudflare-ai" as const,
        model: "@cf/meta/llama",
        error: "Timeout",
      },
    ];

    const error = new AllProvidersFailedError("generation", attempts);

    expect(error.message).toContain("openrouter/deepseek/v3: Rate limit");
    expect(error.message).toContain("cloudflare-ai/@cf/meta/llama: Timeout");
  });

  it("should be retryable", () => {
    const error = new AllProvidersFailedError("generation", []);
    expect(error.retryable).toBe(true);
  });

  it("should return user-friendly message", () => {
    const error = new AllProvidersFailedError("generation", []);
    expect(error.toUserMessage()).toContain("temporarily unavailable");
  });
});

// =============================================================================
// ERROR INHERITANCE
// =============================================================================

describe("Error Inheritance", () => {
  it("all errors should be instances of LumenError", () => {
    const errors = [
      new LumenError("test", "INVALID_INPUT"),
      new QuotaExceededError("generation", 100, 100),
      new ProviderError("openrouter", "test"),
      new ProviderTimeoutError("openrouter", 30000),
      new AllProvidersFailedError("generation", []),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(LumenError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("all errors should have name property", () => {
    expect(new LumenError("test", "INVALID_INPUT").name).toBe("LumenError");
    expect(new QuotaExceededError("generation", 100, 100).name).toBe(
      "QuotaExceededError",
    );
    expect(new ProviderError("openrouter", "test").name).toBe("ProviderError");
    expect(new ProviderTimeoutError("openrouter", 30000).name).toBe(
      "ProviderTimeoutError",
    );
    expect(new AllProvidersFailedError("generation", []).name).toBe(
      "AllProvidersFailedError",
    );
  });
});
