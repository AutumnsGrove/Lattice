/**
 * Cloudflare Workers AI Provider
 *
 * Local AI inference using Cloudflare's Workers AI binding.
 * Used for moderation (LlamaGuard) and embeddings (BGE).
 *
 * Benefits:
 * - Zero network latency (runs in the same edge location)
 * - No API keys needed (uses binding)
 * - Included in Workers pricing
 * - Data never leaves Cloudflare's network (ZDR by design)
 *
 * @see https://developers.cloudflare.com/workers-ai/
 */

import { PROVIDERS, MODELS } from "../config.js";
import { ProviderError, ProviderTimeoutError } from "../errors.js";
import type {
  LumenMessage,
  LumenProviderName,
  LumenModerationCategory,
} from "../types.js";
import type {
  LumenInferenceOptions,
  LumenProvider,
  LumenProviderResponse,
} from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cloudflare AI binding types (simplified interfaces)
 *
 * These are minimal type definitions for the Cloudflare Workers AI binding.
 * The full types are available from @cloudflare/workers-types, but we define
 * simplified versions here to:
 *
 * 1. Avoid version coupling with @cloudflare/workers-types
 * 2. Document exactly what we use from the API
 * 3. Provide clearer error messages during development
 *
 * The `Ai` binding type itself comes from the Workers runtime and is globally
 * available when deployed to Cloudflare. For local development, use wrangler
 * which provides the binding automatically.
 *
 * @see https://developers.cloudflare.com/workers-ai/configuration/bindings/
 */
type AiTextGenerationInput = {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
};

type AiTextGenerationOutput = {
  response?: string;
  // Streaming returns a ReadableStream
};

type AiTextEmbeddingsInput = {
  text: string | string[];
};

type AiTextEmbeddingsOutput = {
  shape: number[];
  data: number[][];
};

// LlamaGuard response categories
const LLAMAGUARD_CATEGORIES: Record<string, LumenModerationCategory> = {
  S1: "violence",
  S2: "hate",
  S3: "sexual",
  S4: "dangerous",
  S5: "self_harm",
  S6: "illegal",
  S7: "harassment",
};

// =============================================================================
// PROVIDER IMPLEMENTATION
// =============================================================================

export class CloudflareAIProvider implements LumenProvider {
  readonly name: LumenProviderName = "cloudflare-ai";

  private readonly ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  // ===========================================================================
  // INFERENCE (for moderation models that use chat format)
  // ===========================================================================

  async inference(
    model: string,
    messages: LumenMessage[],
    options: LumenInferenceOptions,
  ): Promise<LumenProviderResponse> {
    const timeoutMs = options.timeoutMs ?? PROVIDERS["cloudflare-ai"].timeoutMs;

    try {
      // For LlamaGuard/moderation, format as conversation
      const formattedMessages = messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map((p) => p.text ?? "").join("\n"),
      }));

      const startTime = Date.now();

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), timeoutMs);
      });

      // Run inference with timeout
      const result = await Promise.race([
        this.ai.run(
          model as Parameters<Ai["run"]>[0],
          {
            messages: formattedMessages,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          } as AiTextGenerationInput,
        ) as Promise<AiTextGenerationOutput>,
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;
      const content = result.response ?? "";

      // Estimate tokens (CF AI doesn't return usage)
      const inputTokens = this.estimateTokens(messages);
      const outputTokens = Math.ceil(content.length / 4);

      return {
        content,
        usage: {
          input: inputTokens,
          output: outputTokens,
          cost: 0, // CF AI is included in Workers pricing
        },
        model,
      };
    } catch (err) {
      if (err instanceof Error && err.message === "Timeout") {
        throw new ProviderTimeoutError(this.name, timeoutMs);
      }

      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Unknown error",
        undefined,
        err,
      );
    }
  }

  // ===========================================================================
  // EMBEDDINGS
  // ===========================================================================

  async embed(
    model: string,
    input: string | string[],
  ): Promise<{ embeddings: number[][]; tokens: number }> {
    try {
      const texts = Array.isArray(input) ? input : [input];

      const result = (await this.ai.run(
        model as Parameters<Ai["run"]>[0],
        {
          text: texts,
        } as AiTextEmbeddingsInput,
      )) as AiTextEmbeddingsOutput;

      // Estimate tokens
      const tokens = texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);

      return {
        embeddings: result.data,
        tokens,
      };
    } catch (err) {
      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Embedding failed",
        undefined,
        err,
      );
    }
  }

  // ===========================================================================
  // MODERATION
  // ===========================================================================

  async moderate(
    model: string,
    content: string,
  ): Promise<{ safe: boolean; categories: string[]; confidence: number }> {
    try {
      // LlamaGuard expects a conversation format
      const result = (await this.ai.run(
        model as Parameters<Ai["run"]>[0],
        {
          messages: [{ role: "user", content }],
        } as AiTextGenerationInput,
      )) as AiTextGenerationOutput;

      const response = (result.response ?? "").toLowerCase();

      // LlamaGuard returns "safe" or "unsafe" followed by category codes
      const isSafe = response.startsWith("safe");

      const categories: LumenModerationCategory[] = [];
      if (!isSafe) {
        // Parse categories (e.g., "unsafe\nS1,S3" or "unsafe S1")
        for (const [code, category] of Object.entries(LLAMAGUARD_CATEGORIES)) {
          if (response.includes(code.toLowerCase())) {
            categories.push(category);
          }
        }
      }

      return {
        safe: isSafe,
        categories,
        confidence: isSafe ? 1.0 : 0.9, // LlamaGuard doesn't return confidence, estimate
      };
    } catch (err) {
      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Moderation failed",
        undefined,
        err,
      );
    }
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  async healthCheck(): Promise<boolean> {
    try {
      // Simple embedding test
      await this.ai.run(
        MODELS.BGE_BASE as Parameters<Ai["run"]>[0],
        {
          text: ["health check"],
        } as AiTextEmbeddingsInput,
      );
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private estimateTokens(messages: LumenMessage[]): number {
    let chars = 0;
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        chars += msg.content.length;
      } else {
        for (const part of msg.content) {
          if (part.type === "text" && part.text) {
            chars += part.text.length;
          }
        }
      }
    }
    return Math.ceil(chars / 4);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a Cloudflare AI provider instance
 *
 * @param ai - The Ai binding from platform.env.AI
 */
export function createCloudflareAIProvider(ai: Ai): CloudflareAIProvider {
  return new CloudflareAIProvider(ai);
}
