/**
 * Lumen Client Integration Tests
 *
 * Tests the full client workflow: preprocessing → routing → execution → postprocessing.
 * Uses mocked providers to verify the complete flow without external API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LumenClient, createLumenClient } from "./client.js";
import { LumenError } from "./errors.js";
import type { LumenProvider, ProviderRegistry } from "./providers/index.js";
import type { LumenProviderResponse } from "./providers/types.js";

// =============================================================================
// MOCK PROVIDER FACTORY
// =============================================================================

function createMockProvider(
  name: string,
  options: {
    shouldFail?: boolean;
    failMessage?: string;
    response?: Partial<LumenProviderResponse>;
    embedResponse?: { embeddings: number[][]; tokens: number };
    moderateResponse?: {
      safe: boolean;
      categories: string[];
      confidence: number;
    };
  } = {},
): LumenProvider {
  return {
    name: name as any,
    inference: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new Error(options.failMessage ?? "Mock failure");
      }
      return {
        content: options.response?.content ?? `Response from ${name}`,
        usage: options.response?.usage ?? {
          input: 100,
          output: 50,
          cost: 0.001,
        },
        model: options.response?.model ?? "test-model",
        raw: options.response?.raw ?? {},
      };
    }),
    stream: vi.fn().mockImplementation(async function* () {
      if (options.shouldFail) {
        throw new Error(options.failMessage ?? "Mock failure");
      }
      yield { content: "Hello ", done: false };
      yield { content: "world!", done: false };
      yield {
        content: "",
        done: true,
        usage: { input: 10, output: 5, cost: 0.0001 },
      };
    }),
    embed: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new Error(options.failMessage ?? "Mock failure");
      }
      return (
        options.embedResponse ?? { embeddings: [[0.1, 0.2, 0.3]], tokens: 10 }
      );
    }),
    moderate: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new Error(options.failMessage ?? "Mock failure");
      }
      return (
        options.moderateResponse ?? {
          safe: true,
          categories: [],
          confidence: 1.0,
        }
      );
    }),
    healthCheck: vi.fn().mockResolvedValue(!options.shouldFail),
  };
}

// =============================================================================
// CLIENT CREATION & CONFIGURATION
// =============================================================================

describe("LumenClient - Creation", () => {
  it("should create client with OpenRouter API key", () => {
    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    expect(client).toBeInstanceOf(LumenClient);
    expect(client.isEnabled()).toBe(true);
  });

  it("should respect enabled flag", () => {
    const client = createLumenClient({
      openrouterApiKey: "test-key",
      enabled: false,
    });

    expect(client.isEnabled()).toBe(false);
  });

  it("should throw when disabled and trying to run", async () => {
    const client = createLumenClient({
      openrouterApiKey: "test-key",
      enabled: false,
    });

    await expect(
      client.run({ task: "generation", input: "Hello" }),
    ).rejects.toThrow(LumenError);
  });
});

// =============================================================================
// FULL REQUEST WORKFLOW
// =============================================================================

describe("LumenClient - Full Workflow Integration", () => {
  it("should process a complete generation request", async () => {
    // Create client with mocked provider
    const mockProvider = createMockProvider("openrouter", {
      response: {
        content: "This is a generated response",
        usage: { input: 50, output: 100, cost: 0.00015 },
        model: "deepseek/deepseek-v3.2",
      },
    });

    // Inject mock provider (using internal access for testing)
    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    const response = await client.run({
      task: "generation",
      input: "Write a haiku about coding",
    });

    // Verify response structure
    expect(response.content).toBe("This is a generated response");
    expect(response.provider).toBe("openrouter");
    expect(response.model).toBeDefined();
    expect(response.usage).toBeDefined();
    expect(response.latency).toBeGreaterThanOrEqual(0);
    expect(response.cached).toBe(false);

    // Verify provider was called with preprocessed input
    expect(mockProvider.inference).toHaveBeenCalled();
  });

  it("should apply PII scrubbing during preprocessing", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    // Input with PII
    await client.run({
      task: "generation",
      input: "Contact me at test@example.com or call 555-123-4567",
    });

    // Verify the provider received scrubbed content
    const callArgs = mockProvider.inference.mock.calls[0];
    const messages = callArgs[1];
    const content = messages[0].content;

    expect(content).toContain("[EMAIL]");
    expect(content).toContain("[PHONE]");
    expect(content).not.toContain("test@example.com");
    expect(content).not.toContain("555-123-4567");
  });

  it("should skip PII scrubbing when requested", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    await client.run({
      task: "generation",
      input: "Contact me at test@example.com",
      options: { skipPiiScrub: true },
    });

    const callArgs = mockProvider.inference.mock.calls[0];
    const messages = callArgs[1];
    const content = messages[0].content;

    expect(content).toContain("test@example.com");
    expect(content).not.toContain("[EMAIL]");
  });

  it("should apply custom temperature and maxTokens", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    await client.run({
      task: "generation",
      input: "Hello",
      options: { temperature: 0.9, maxTokens: 1000 },
    });

    const callArgs = mockProvider.inference.mock.calls[0];
    const options = callArgs[2];

    expect(options.temperature).toBe(0.9);
    expect(options.maxTokens).toBe(1000);
  });

  it("should use task defaults when no options provided", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    await client.run({
      task: "code",
      input: "Write a function",
    });

    const callArgs = mockProvider.inference.mock.calls[0];
    const options = callArgs[2];

    // Code task has temperature 0.1 and maxTokens 4096
    expect(options.temperature).toBe(0.1);
    expect(options.maxTokens).toBe(4096);
  });
});

// =============================================================================
// STREAMING WORKFLOW
// =============================================================================

describe("LumenClient - Streaming", () => {
  it("should stream responses correctly", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    const chunks: string[] = [];
    let finalUsage;

    for await (const chunk of client.stream({
      task: "generation",
      input: "Hello",
    })) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
      if (chunk.done && chunk.usage) {
        finalUsage = chunk.usage;
      }
    }

    expect(chunks).toEqual(["Hello ", "world!"]);
    expect(finalUsage).toBeDefined();
  });

  it("should throw when streaming is not available", async () => {
    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = {}; // No providers

    await expect(async () => {
      for await (const _ of client.stream({
        task: "generation",
        input: "Hello",
      })) {
        // Should throw before yielding
      }
    }).rejects.toThrow(LumenError);
  });
});

// =============================================================================
// EMBEDDING & MODERATION
// =============================================================================

describe("LumenClient - Specialized Methods", () => {
  describe("embed", () => {
    it("should generate embeddings", async () => {
      const mockProvider = createMockProvider("openrouter", {
        embedResponse: { embeddings: [[0.5, 0.6, 0.7]], tokens: 5 },
      });

      const client = createLumenClient({
        openrouterApiKey: "test-key",
      });

      // @ts-expect-error - Accessing private for testing
      client.providers = { openrouter: mockProvider };

      const response = await client.embed({
        input: "Test text for embedding",
      });

      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toEqual([0.5, 0.6, 0.7]);
      expect(response.tokens).toBe(5);
    });
  });

  describe("moderate", () => {
    it("should detect safe content", async () => {
      const mockProvider = createMockProvider("openrouter", {
        moderateResponse: { safe: true, categories: [], confidence: 0.99 },
      });

      const client = createLumenClient({
        openrouterApiKey: "test-key",
      });

      // @ts-expect-error - Accessing private for testing
      client.providers = { openrouter: mockProvider };

      const response = await client.moderate({
        content: "Hello, this is a friendly message!",
      });

      expect(response.safe).toBe(true);
      expect(response.categories).toEqual([]);
      expect(response.confidence).toBe(0.99);
    });

    it("should detect unsafe content", async () => {
      const mockProvider = createMockProvider("openrouter", {
        moderateResponse: {
          safe: false,
          categories: ["violence", "hate"],
          confidence: 0.95,
        },
      });

      const client = createLumenClient({
        openrouterApiKey: "test-key",
      });

      // @ts-expect-error - Accessing private for testing
      client.providers = { openrouter: mockProvider };

      const response = await client.moderate({
        content: "Some potentially problematic content",
      });

      expect(response.safe).toBe(false);
      expect(response.categories).toContain("violence");
      expect(response.categories).toContain("hate");
    });
  });
});

// =============================================================================
// HEALTH CHECKS
// =============================================================================

describe("LumenClient - Health & Info", () => {
  it("should report available providers", () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    const providers = client.getAvailableProviders();

    expect(providers).toContain("openrouter");
  });

  it("should run health checks on providers", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    const health = await client.healthCheck();

    expect(health.openrouter).toBe(true);
    expect(mockProvider.healthCheck).toHaveBeenCalled();
  });
});

// =============================================================================
// INPUT VALIDATION
// =============================================================================

describe("LumenClient - Input Validation", () => {
  it("should reject invalid task", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    await expect(
      client.run({
        task: "invalid-task" as any,
        input: "Hello",
      }),
    ).rejects.toThrow(LumenError);
  });

  it("should reject empty input", async () => {
    const mockProvider = createMockProvider("openrouter");

    const client = createLumenClient({
      openrouterApiKey: "test-key",
    });

    // @ts-expect-error - Accessing private for testing
    client.providers = { openrouter: mockProvider };

    await expect(
      client.run({
        task: "generation",
        input: "",
      }),
    ).rejects.toThrow(LumenError);
  });
});
