/**
 * Lumen Transcription (Scribe) Tests
 *
 * Tests the transcribe() method behavior, not implementation details.
 * Focus: Does transcription work for users? Do errors surface correctly?
 *
 * @see /grove-testing for testing philosophy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LumenClient } from "./client.js";
import { LumenError } from "./errors.js";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the providers module
vi.mock("./providers/index.js", () => ({
  createProviders: vi.fn(() => mockProviders),
  getAvailableProviders: vi.fn(() => ["cloudflare-ai"]),
}));

// Mock quota tracker
vi.mock("./quota/tracker.js", () => ({
  createQuotaTracker: vi.fn(() => mockQuotaTracker),
}));

// Test fixtures
const SAMPLE_AUDIO = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // Minimal WAV header bytes
const LARGE_AUDIO = new Uint8Array(30 * 1024 * 1024); // 30MB (over limit)

let mockProviders: any;
let mockQuotaTracker: any;

beforeEach(() => {
  vi.clearAllMocks();

  // Reset mock providers with transcribe support
  mockProviders = {
    "cloudflare-ai": {
      name: "cloudflare-ai",
      transcribe: vi.fn().mockResolvedValue({
        text: "Hello world, this is a test transcription.",
        wordCount: 7,
        duration: 3.5,
      }),
      inference: vi.fn(),
      embed: vi.fn(),
      moderate: vi.fn(),
    },
    openrouter: {
      name: "openrouter",
      inference: vi.fn().mockResolvedValue({
        content: '{"text": "Cleaned transcript.", "gutterContent": []}',
        usage: { input: 100, output: 50, cost: 0.001 },
        model: "deepseek/deepseek-v3.2",
      }),
      stream: vi.fn(),
    },
  };

  // Reset mock quota tracker
  mockQuotaTracker = {
    enforceQuota: vi.fn().mockResolvedValue(undefined),
    recordUsage: vi.fn().mockResolvedValue(undefined),
    getTodayUsageAll: vi.fn().mockResolvedValue({}),
    getUsageHistory: vi.fn().mockResolvedValue([]),
  };
});

// =============================================================================
// RAW MODE TESTS
// =============================================================================

describe("transcribe() - Raw Mode", () => {
  it("should transcribe audio and return text", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
      options: { mode: "raw" },
    });

    // Assert
    expect(result.text).toBe("Hello world, this is a test transcription.");
    expect(result.wordCount).toBe(7);
    expect(result.duration).toBe(3.5);
    expect(result.provider).toBe("cloudflare-ai");
  });

  it("should default to raw mode when not specified", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
    });

    // Assert
    expect(result.text).toBeDefined();
    // Draft mode would have gutterContent, raw mode doesn't
    expect(result.gutterContent).toBeUndefined();
  });

  it("should reject empty audio data", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act & Assert
    await expect(
      client.transcribe({
        audio: new Uint8Array(0),
      }),
    ).rejects.toThrow("Audio data is required");
  });

  it("should reject audio over 25MB", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act & Assert
    await expect(
      client.transcribe({
        audio: LARGE_AUDIO,
      }),
    ).rejects.toThrow(/exceeds maximum size/);
  });
});

// =============================================================================
// DRAFT MODE TESTS
// =============================================================================

describe("transcribe() - Draft Mode", () => {
  it("should structure transcript and extract Vines", async () => {
    // Arrange: Mock the LLM to return structured JSON
    mockProviders.openrouter.inference.mockResolvedValue({
      content: JSON.stringify({
        text: "This is the cleaned transcript.",
        gutterContent: [
          {
            type: "vine",
            content: "A tangent about testing",
            anchor: "cleaned",
          },
        ],
      }),
      usage: { input: 100, output: 80, cost: 0.002 },
      model: "deepseek/deepseek-v3.2",
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
      options: { mode: "draft" },
    });

    // Assert
    expect(result.text).toBe("This is the cleaned transcript.");
    expect(result.gutterContent).toHaveLength(1);
    expect(result.gutterContent![0].type).toBe("vine");
    expect(result.gutterContent![0].content).toBe("A tangent about testing");
    expect(result.rawTranscript).toBe(
      "Hello world, this is a test transcription.",
    );
  });

  it("should fallback to raw text when LLM structuring fails", async () => {
    // Arrange: Mock the LLM to return invalid JSON
    mockProviders.openrouter.inference.mockResolvedValue({
      content: "This is not valid JSON",
      usage: { input: 100, output: 20, cost: 0.001 },
      model: "deepseek/deepseek-v3.2",
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
      options: { mode: "draft" },
    });

    // Assert: Should fallback gracefully to raw transcript
    expect(result.text).toBe("Hello world, this is a test transcription.");
    expect(result.gutterContent).toEqual([]);
  });

  it("should fallback to raw text when LLM throws error", async () => {
    // Arrange
    mockProviders.openrouter.inference.mockRejectedValue(
      new Error("LLM unavailable"),
    );

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
      options: { mode: "draft" },
    });

    // Assert: Should fallback gracefully
    expect(result.text).toBe("Hello world, this is a test transcription.");
    expect(result.gutterContent).toEqual([]);
  });
});

// =============================================================================
// QUOTA ENFORCEMENT TESTS
// =============================================================================

describe("transcribe() - Quota Enforcement", () => {
  it("should enforce transcription quota for raw mode", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      db: {} as any,
      enabled: true,
    });

    // Act
    await client.transcribe(
      {
        audio: SAMPLE_AUDIO,
        tenant: "tenant_123",
        options: { mode: "raw" },
      },
      "seedling",
    );

    // Assert
    expect(mockQuotaTracker.enforceQuota).toHaveBeenCalledWith(
      "tenant_123",
      "seedling",
      "transcription",
    );
    expect(mockQuotaTracker.enforceQuota).toHaveBeenCalledTimes(1);
  });

  it("should enforce both transcription AND generation quota for draft mode", async () => {
    // Arrange
    mockProviders.openrouter.inference.mockResolvedValue({
      content: '{"text": "Cleaned.", "gutterContent": []}',
      usage: { input: 50, output: 30, cost: 0.001 },
      model: "test-model",
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      db: {} as any,
      enabled: true,
    });

    // Act
    await client.transcribe(
      {
        audio: SAMPLE_AUDIO,
        tenant: "tenant_123",
        options: { mode: "draft" },
      },
      "oak",
    );

    // Assert
    expect(mockQuotaTracker.enforceQuota).toHaveBeenCalledWith(
      "tenant_123",
      "oak",
      "transcription",
    );
    expect(mockQuotaTracker.enforceQuota).toHaveBeenCalledWith(
      "tenant_123",
      "oak",
      "generation",
    );
    expect(mockQuotaTracker.enforceQuota).toHaveBeenCalledTimes(2);
  });

  it("should reject when quota exceeded", async () => {
    // Arrange
    mockQuotaTracker.enforceQuota.mockRejectedValue(
      new LumenError("Daily transcription limit reached", "QUOTA_EXCEEDED"),
    );

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      db: {} as any,
      enabled: true,
    });

    // Act & Assert
    await expect(
      client.transcribe(
        {
          audio: SAMPLE_AUDIO,
          tenant: "tenant_123",
        },
        "free",
      ),
    ).rejects.toThrow(/limit reached/i);
  });

  it("should skip quota when skipQuota option is true", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      db: {} as any,
      enabled: true,
    });

    // Act
    await client.transcribe(
      {
        audio: SAMPLE_AUDIO,
        tenant: "tenant_123",
        options: { skipQuota: true },
      },
      "free",
    );

    // Assert
    expect(mockQuotaTracker.enforceQuota).not.toHaveBeenCalled();
  });
});

// =============================================================================
// PII SCRUBBING TESTS
// =============================================================================

describe("transcribe() - PII Scrubbing", () => {
  it("should scrub email addresses from transcription", async () => {
    // Arrange
    mockProviders["cloudflare-ai"].transcribe.mockResolvedValue({
      text: "Contact me at user@example.com for more info.",
      wordCount: 7,
      duration: 2.0,
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
    });

    // Assert
    expect(result.text).toContain("[EMAIL]");
    expect(result.text).not.toContain("user@example.com");
  });

  it("should scrub phone numbers from transcription", async () => {
    // Arrange
    mockProviders["cloudflare-ai"].transcribe.mockResolvedValue({
      text: "Call me at 555-123-4567 anytime.",
      wordCount: 6,
      duration: 1.5,
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
    });

    // Assert
    expect(result.text).toContain("[PHONE]");
    expect(result.text).not.toContain("555-123-4567");
  });

  it("should skip PII scrubbing when option is true", async () => {
    // Arrange
    mockProviders["cloudflare-ai"].transcribe.mockResolvedValue({
      text: "Email user@example.com for help.",
      wordCount: 5,
      duration: 1.0,
    });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
      options: { skipPiiScrub: true },
    });

    // Assert
    expect(result.text).toContain("user@example.com");
  });
});

// =============================================================================
// FALLBACK CHAIN TESTS
// =============================================================================

describe("transcribe() - Fallback Chain", () => {
  it("should try fallback model when primary fails", async () => {
    // Arrange: Primary model fails, fallback succeeds
    mockProviders["cloudflare-ai"].transcribe
      .mockRejectedValueOnce(new Error("Primary model overloaded"))
      .mockResolvedValueOnce({
        text: "Transcription from fallback model.",
        wordCount: 4,
        duration: 2.0,
      });

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act
    const result = await client.transcribe({
      audio: SAMPLE_AUDIO,
    });

    // Assert
    expect(result.text).toBe("Transcription from fallback model.");
    expect(mockProviders["cloudflare-ai"].transcribe).toHaveBeenCalledTimes(2);
  });

  it("should throw when all models fail", async () => {
    // Arrange: All models fail
    mockProviders["cloudflare-ai"].transcribe.mockRejectedValue(
      new Error("All Whisper models unavailable"),
    );

    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: true,
    });

    // Act & Assert
    await expect(
      client.transcribe({
        audio: SAMPLE_AUDIO,
      }),
    ).rejects.toThrow(/unavailable/);
  });
});

// =============================================================================
// DISABLED STATE TESTS
// =============================================================================

describe("transcribe() - Disabled State", () => {
  it("should reject when Lumen is disabled", async () => {
    // Arrange
    const client = new LumenClient({
      openrouterApiKey: "test-key",
      enabled: false,
    });

    // Act & Assert
    await expect(
      client.transcribe({
        audio: SAMPLE_AUDIO,
      }),
    ).rejects.toThrow("Lumen is disabled");
  });
});
