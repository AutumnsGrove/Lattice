/**
 * OpenRouter Provider
 *
 * Universal AI gateway supporting 100+ models through a single API.
 * Primary provider for generation, chat, summary, image, and code tasks.
 *
 * @see https://openrouter.ai/docs
 */

import { PROVIDERS, calculateCost } from "../config.js";
import { ProviderError, ProviderTimeoutError } from "../errors.js";
import type {
  LumenMessage,
  LumenProviderName,
  LumenStreamChunk,
} from "../types.js";
import type {
  LumenInferenceOptions,
  LumenProvider,
  LumenProviderResponse,
} from "./types.js";

// =============================================================================
// TYPES
// =============================================================================

interface OpenRouterAPIResponse {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
    finish_reason?: string;
    index?: number;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  error?: {
    message?: string;
    code?: string;
  };
}

interface OpenRouterStreamChunk {
  id?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      role?: string;
    };
    finish_reason?: string | null;
    index?: number;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

// =============================================================================
// PROVIDER IMPLEMENTATION
// =============================================================================

export class OpenRouterProvider implements LumenProvider {
  readonly name: LumenProviderName = "openrouter";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(
    apiKey: string,
    options?: {
      siteUrl?: string;
      siteName?: string;
    },
  ) {
    this.apiKey = apiKey;
    this.baseUrl = PROVIDERS.openrouter.baseUrl;
    this.siteUrl = options?.siteUrl ?? "https://grove.place";
    this.siteName = options?.siteName ?? "Grove";
  }

  // ===========================================================================
  // INFERENCE
  // ===========================================================================

  async inference(
    model: string,
    messages: LumenMessage[],
    options: LumenInferenceOptions,
  ): Promise<LumenProviderResponse> {
    const timeoutMs = options.timeoutMs ?? PROVIDERS.openrouter.timeoutMs;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(messages),
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText) as {
            error?: { message?: string };
          };
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          errorMessage = errorText.slice(0, 200);
        }

        throw new ProviderError(this.name, errorMessage, response.status);
      }

      const data = (await response.json()) as OpenRouterAPIResponse;

      // Check for API-level errors
      if (data.error) {
        throw new ProviderError(
          this.name,
          data.error.message ?? "Unknown API error",
          400,
        );
      }

      const content = data.choices?.[0]?.message?.content ?? "";
      const inputTokens =
        data.usage?.prompt_tokens ?? this.estimateTokens(messages);
      const outputTokens =
        data.usage?.completion_tokens ??
        this.estimateTokens([{ role: "assistant", content }]);

      return {
        content,
        usage: {
          input: inputTokens,
          output: outputTokens,
          cost: calculateCost(model, inputTokens, outputTokens),
        },
        model: data.model ?? model,
        raw: data,
      };
    } catch (err) {
      // Handle timeout
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError(this.name, timeoutMs);
      }

      // Re-throw Lumen errors
      if (err instanceof ProviderError || err instanceof ProviderTimeoutError) {
        throw err;
      }

      // Wrap unknown errors
      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Unknown error",
        undefined,
        err,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ===========================================================================
  // STREAMING
  // ===========================================================================

  async *stream(
    model: string,
    messages: LumenMessage[],
    options: LumenInferenceOptions,
  ): AsyncGenerator<LumenStreamChunk> {
    const timeoutMs = options.timeoutMs ?? PROVIDERS.openrouter.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        body: JSON.stringify({
          model,
          messages: this.formatMessages(messages),
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new ProviderError(
          this.name,
          errorText.slice(0, 200),
          response.status,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new ProviderError(this.name, "No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let totalContent = "";
      let inputTokens = 0;
      let outputTokens = 0;

      // Safety limit to prevent infinite loops from malformed streams
      // At ~100 tokens/chunk, 10000 iterations = ~1M tokens (well beyond any model limit)
      const MAX_ITERATIONS = 10000;
      let iterations = 0;

      while (iterations++ < MAX_ITERATIONS) {
        const { done, value } = await reader.read();

        if (done) {
          // Final chunk with usage
          yield {
            content: "",
            done: true,
            usage: {
              input: inputTokens || this.estimateTokens(messages),
              output:
                outputTokens ||
                this.estimateTokens([
                  { role: "assistant", content: totalContent },
                ]),
              cost: calculateCost(model, inputTokens, outputTokens),
            },
          };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data) as OpenRouterStreamChunk;
            const content = chunk.choices?.[0]?.delta?.content ?? "";

            if (content) {
              totalContent += content;
              yield { content, done: false };
            }

            // Capture usage if provided
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
              outputTokens = chunk.usage.completion_tokens ?? outputTokens;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // If we exited the loop without breaking (hit max iterations), throw error
      if (iterations >= MAX_ITERATIONS) {
        throw new ProviderError(
          this.name,
          "Stream exceeded maximum iterations - possible malformed response",
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError(this.name, timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ===========================================================================
  // EMBEDDINGS
  // ===========================================================================

  /**
   * Generate embeddings via OpenRouter
   * Uses the /api/v1/embeddings endpoint
   */
  async embed(
    model: string,
    input: string | string[],
  ): Promise<{ embeddings: number[][]; tokens: number }> {
    const timeoutMs = PROVIDERS.openrouter.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        body: JSON.stringify({
          model,
          input: Array.isArray(input) ? input : [input],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new ProviderError(
          this.name,
          errorText.slice(0, 200),
          response.status,
        );
      }

      const data = (await response.json()) as {
        data?: Array<{ embedding: number[]; index: number }>;
        usage?: { prompt_tokens?: number; total_tokens?: number };
      };

      const embeddings = (data.data ?? [])
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      return {
        embeddings,
        tokens: data.usage?.total_tokens ?? data.usage?.prompt_tokens ?? 0,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderTimeoutError(this.name, timeoutMs);
      }
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(
        this.name,
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ===========================================================================
  // MODERATION
  // ===========================================================================

  /**
   * Run content moderation via OpenRouter using LlamaGuard
   * Uses the chat completion API with LlamaGuard model
   */
  async moderate(
    model: string,
    content: string,
  ): Promise<{ safe: boolean; categories: string[]; confidence: number }> {
    // LlamaGuard uses a specific prompt format
    const moderationPrompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

Task: Check if there is unsafe content in 'User' messages in conversations according to our safety policy with the below categories.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violent Crimes
S2: Non-Violent Crimes
S3: Sex-Related Crimes
S4: Child Sexual Exploitation
S5: Defamation
S6: Specialized Advice
S7: Privacy
S8: Intellectual Property
S9: Indiscriminate Weapons
S10: Hate
S11: Suicide & Self-Harm
S12: Sexual Content
S13: Elections
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>

User: ${content}

<END CONVERSATION>

Provide your safety assessment for User in the above conversation:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    const response = await this.inference(
      model,
      [{ role: "user", content: moderationPrompt }],
      { maxTokens: 100, temperature: 0 },
    );

    // Parse LlamaGuard response
    const responseText = response.content.trim().toLowerCase();
    const lines = responseText.split("\n").map((l) => l.trim());
    const isSafe = lines[0] === "safe";

    const categories: string[] = [];
    if (!isSafe && lines.length > 1) {
      // Parse categories like "S1, S10" or "S1,S10"
      const categoryLine = lines[1];
      const matches = categoryLine.match(/s\d+/gi);
      if (matches) {
        categories.push(...matches.map((m) => m.toUpperCase()));
      }
    }

    return {
      safe: isSafe,
      categories,
      confidence: 1.0, // LlamaGuard doesn't provide confidence scores
    };
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Format messages for OpenRouter API
   */
  private formatMessages(messages: LumenMessage[]): Array<{
    role: string;
    content:
      | string
      | Array<{
          type: string;
          text?: string;
          image_url?: { url: string; detail?: string };
        }>;
  }> {
    return messages.map((msg) => {
      // Simple string content
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }

      // Multimodal content (images)
      return {
        role: msg.role,
        content: msg.content.map((part) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          return {
            type: "image_url",
            image_url: {
              url: part.image_url?.url ?? "",
              detail: part.image_url?.detail ?? "auto",
            },
          };
        }),
      };
    });
  }

  /**
   * Rough token estimation (4 chars ≈ 1 token)
   */
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
 * Create an OpenRouter provider instance
 */
export function createOpenRouterProvider(
  apiKey: string,
  options?: {
    siteUrl?: string;
    siteName?: string;
  },
): OpenRouterProvider {
  return new OpenRouterProvider(apiKey, options);
}
