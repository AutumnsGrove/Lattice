/**
 * Cloudflare AI Provider - Transcription Tests
 *
 * Tests the transcribe() method of CloudflareAIProvider.
 * Focus: Does the Whisper API get called correctly? Are responses parsed properly?
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudflareAIProvider } from "./cloudflare-ai.js";

// =============================================================================
// MOCK AI BINDING
// =============================================================================

function createMockAiBinding(
  options: {
    response?: {
      text: string;
      word_count?: number;
      words?: Array<{ word: string; start: number; end: number }>;
      vtt?: string;
    };
    shouldFail?: boolean;
    failMessage?: string;
  } = {},
) {
  return {
    run: vi.fn().mockImplementation(async (model: string, input: any) => {
      if (options.shouldFail) {
        throw new Error(options.failMessage ?? "Whisper API error");
      }

      return (
        options.response ?? {
          text: "Default transcription response.",
          word_count: 3,
        }
      );
    }),
  } as unknown as Ai;
}

// =============================================================================
// TESTS
// =============================================================================

describe("CloudflareAIProvider.transcribe()", () => {
  const SAMPLE_AUDIO = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";

  it("should return transcription text and word count", async () => {
    // Arrange
    const mockAi = createMockAiBinding({
      response: {
        text: "Hello world, testing transcription.",
        word_count: 4,
      },
    });
    const provider = new CloudflareAIProvider(mockAi);

    // Act
    const result = await provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO);

    // Assert
    expect(result.text).toBe("Hello world, testing transcription.");
    expect(result.wordCount).toBe(4);
    expect(result.duration).toBeGreaterThan(0);
  });

  it("should calculate word count when not provided by API", async () => {
    // Arrange
    const mockAi = createMockAiBinding({
      response: {
        text: "One two three four five",
        // word_count intentionally omitted
      },
    });
    const provider = new CloudflareAIProvider(mockAi);

    // Act
    const result = await provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO);

    // Assert
    expect(result.wordCount).toBe(5);
  });

  it("should calculate duration from word timestamps when available", async () => {
    // Arrange
    const mockAi = createMockAiBinding({
      response: {
        text: "Hello world",
        word_count: 2,
        words: [
          { word: "Hello", start: 0.0, end: 0.5 },
          { word: "world", start: 0.6, end: 1.2 },
        ],
      },
    });
    const provider = new CloudflareAIProvider(mockAi);

    // Act
    const result = await provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO);

    // Assert
    expect(result.duration).toBe(1.2); // End time of last word
  });

  it("should call Whisper API with audio as number array", async () => {
    // Arrange
    const mockAi = createMockAiBinding();
    const provider = new CloudflareAIProvider(mockAi);

    // Act
    await provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO);

    // Assert
    expect(mockAi.run).toHaveBeenCalledWith(
      WHISPER_MODEL,
      expect.objectContaining({
        audio: expect.any(Array),
      }),
    );

    // Verify audio was converted from Uint8Array to number[]
    const callArgs = (mockAi.run as any).mock.calls[0][1];
    expect(callArgs.audio).toEqual([0, 1, 2, 3]);
  });

  it("should throw ProviderError when Whisper API fails", async () => {
    // Arrange
    const mockAi = createMockAiBinding({
      shouldFail: true,
      failMessage: "Model overloaded",
    });
    const provider = new CloudflareAIProvider(mockAi);

    // Act & Assert
    await expect(
      provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO),
    ).rejects.toThrow(/Model overloaded/);
  });

  it("should handle empty transcription response", async () => {
    // Arrange
    const mockAi = createMockAiBinding({
      response: {
        text: "",
        word_count: 0,
      },
    });
    const provider = new CloudflareAIProvider(mockAi);

    // Act
    const result = await provider.transcribe(WHISPER_MODEL, SAMPLE_AUDIO);

    // Assert
    expect(result.text).toBe("");
    expect(result.wordCount).toBe(0);
  });

  it("should work with different Whisper model variants", async () => {
    // Arrange
    const mockAi = createMockAiBinding();
    const provider = new CloudflareAIProvider(mockAi);
    const models = [
      "@cf/openai/whisper-large-v3-turbo",
      "@cf/openai/whisper",
      "@cf/openai/whisper-tiny-en",
    ];

    // Act & Assert
    for (const model of models) {
      await provider.transcribe(model, SAMPLE_AUDIO);
      expect(mockAi.run).toHaveBeenLastCalledWith(model, expect.any(Object));
    }
  });
});
