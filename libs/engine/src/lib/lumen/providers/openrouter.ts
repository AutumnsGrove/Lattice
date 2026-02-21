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
// MODERATION CONSTANTS
// =============================================================================

/**
 * Grove's moderation policy for policy-based safety models.
 *
 * Structured following GPT-oss-safeguard best practices:
 * Instructions → Definitions → Criteria → Output Format
 * Kept within 400-600 tokens for optimal reasoning performance.
 *
 * This policy is used by GPT-oss-safeguard-20b (primary) and DeepSeek V3.2
 * (third-layer fallback). It maps directly to Grove's category taxonomy so
 * Thorn's threshold engine can operate on real confidence scores.
 */
const GROVE_MODERATION_POLICY = `You are a content safety classifier for Grove, a personal blogging platform for queer creators and indie writers.

## Instructions
Classify the provided content against the categories below. Return a JSON object with your assessment. Use chain-of-thought reasoning internally but only output the final JSON.

## Category Definitions
- violence: Threats, graphic violence, incitement to violence, or glorification of violent acts
- illegal: Content facilitating illegal activities (fraud, trafficking, controlled substances)
- self_harm: Content promoting, instructing, or glorifying self-harm or suicide
- sexual: Explicit sexual content without appropriate content warnings
- hate: Hate speech targeting protected characteristics (race, ethnicity, religion, gender, sexuality, disability)
- harassment: Targeted harassment, bullying, doxxing, or intimidation of specific individuals
- dangerous: Instructions for weapons, explosives, or activities posing serious physical danger

## Important Context
- Personal expression about marginalized identities (LGBTQ+, disability, racial justice) is ALLOWED — these are NOT hate speech or political violations
- Artistic nudity and mature themes are allowed WITH content warnings
- Political opinions and lived experiences are allowed; political campaigning and election misinformation are not
- Consider context and intent, not just keywords — a blog post discussing violence in history is not a violation

## Output Format
Respond with ONLY valid JSON:
{"safe": true} if content is clearly safe, or:
{"safe": false, "categories": ["category_name"], "confidence": 0.95, "reason": "Brief explanation"}

The confidence score (0.0-1.0) reflects how certain you are that a violation exists. Use values above 0.9 only when the violation is unambiguous.`;

/**
 * Build the user-role prompt with content to classify.
 * Static policy is in the system prompt; dynamic content goes here.
 */
function buildModerationPrompt(content: string): string {
  return `Classify the following content:\n\n${content}`;
}

/**
 * Parse a policy-based moderation response (JSON format).
 * Handles both safe ({"safe": true}) and unsafe responses with categories.
 */
function parsePolicyModerationResponse(response: string): {
  safe: boolean;
  categories: string[];
  confidence: number;
} {
  try {
    // Extract JSON from response (model may include reasoning before/after)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // No JSON found — treat as safe with low confidence (will trigger review)
      return { safe: true, categories: [], confidence: 0.5 };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      safe?: boolean;
      categories?: string[];
      confidence?: number;
      reason?: string;
    };

    if (parsed.safe === true || parsed.safe === undefined) {
      return { safe: true, categories: [], confidence: 1.0 };
    }

    // Validate and normalize categories against Grove's taxonomy
    const validCategories = new Set([
      "violence",
      "illegal",
      "self_harm",
      "sexual",
      "hate",
      "harassment",
      "dangerous",
    ]);

    const categories = (parsed.categories ?? []).filter((cat) =>
      validCategories.has(cat),
    );

    // Clamp confidence to [0, 1]
    const confidence = Math.max(
      0,
      Math.min(1, parsed.confidence ?? 0.8),
    );

    return {
      safe: false,
      categories,
      confidence,
    };
  } catch {
    // JSON parse failed — treat as safe with low confidence
    return { safe: true, categories: [], confidence: 0.5 };
  }
}

/**
 * Map LlamaGuard S-codes to Grove's category taxonomy.
 * Multiple S-codes can map to the same Grove category.
 */
const LLAMAGUARD_TO_GROVE_CATEGORIES: Record<string, string> = {
  S1: "violence",
  S2: "illegal",
  S3: "sexual",
  S4: "illegal", // Child exploitation → illegal (highest severity)
  S5: "harassment", // Defamation → harassment
  S6: "dangerous", // Specialized advice → dangerous
  S7: "harassment", // Privacy → harassment
  S8: "illegal", // IP violations → illegal
  S9: "dangerous", // Indiscriminate weapons → dangerous
  S10: "hate",
  S11: "self_harm",
  S12: "sexual",
  S13: "dangerous", // Elections → dangerous
};

/**
 * Check if a model ID is a LlamaGuard variant.
 * LlamaGuard uses a unique prompt/response format (safe/unsafe + S-codes).
 */
function isLlamaGuardModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes("llama-guard") || lower.includes("llamaguard");
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
    const apiKey = options.apiKeyOverride ?? this.apiKey;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
    const apiKey = options.apiKeyOverride ?? this.apiKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
   * Run content moderation via OpenRouter.
   *
   * Supports two model families:
   * - **Policy-based** (GPT-oss-safeguard, DeepSeek, etc.): Receives Grove's
   *   moderation policy and returns structured JSON with categories, confidence,
   *   and reasoning. This is the preferred approach — it returns real confidence
   *   scores and maps directly to Grove's category taxonomy.
   * - **LlamaGuard**: Uses Meta's specialized prompt format, returns binary
   *   safe/unsafe with S-codes. Confidence is estimated (not model-provided).
   */
  async moderate(
    model: string,
    content: string,
  ): Promise<{ safe: boolean; categories: string[]; confidence: number }> {
    // LlamaGuard models use their own prompt format
    if (isLlamaGuardModel(model)) {
      return this.moderateWithLlamaGuard(model, content);
    }

    // All other models use the policy-based approach
    return this.moderateWithPolicy(model, content);
  }

  /**
   * Policy-based moderation for GPT-oss-safeguard, DeepSeek, and other
   * general-purpose or safety-tuned models.
   *
   * Provides Grove's moderation policy directly and asks for structured JSON.
   * Returns real confidence scores and Grove-native category names.
   */
  private async moderateWithPolicy(
    model: string,
    content: string,
  ): Promise<{ safe: boolean; categories: string[]; confidence: number }> {
    const response = await this.inference(
      model,
      [
        { role: "system", content: GROVE_MODERATION_POLICY },
        { role: "user", content: buildModerationPrompt(content) },
      ],
      { maxTokens: 512, temperature: 0 },
    );

    return parsePolicyModerationResponse(response.content);
  }

  /**
   * LlamaGuard-specific moderation using Meta's prompt format.
   * Returns binary safe/unsafe with S-code categories.
   * Confidence is estimated since LlamaGuard doesn't provide scores.
   */
  private async moderateWithLlamaGuard(
    model: string,
    content: string,
  ): Promise<{ safe: boolean; categories: string[]; confidence: number }> {
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

    // Map LlamaGuard S-codes to Grove categories
    const categories: string[] = [];
    if (!isSafe && lines.length > 1) {
      const categoryLine = lines[1];
      const matches = categoryLine.match(/s\d+/gi);
      if (matches) {
        for (const code of matches) {
          const mapped =
            LLAMAGUARD_TO_GROVE_CATEGORIES[code.toUpperCase()] ?? code;
          categories.push(mapped);
        }
      }
    }

    return {
      safe: isSafe,
      categories,
      // LlamaGuard doesn't provide confidence — estimate conservatively
      confidence: isSafe ? 1.0 : 0.85,
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
