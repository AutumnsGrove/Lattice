/**
 * OpenRouter API Integration
 *
 * Direct API calls to OpenRouter for AI-powered summary generation.
 * Uses tenant's own API key for billing isolation.
 */

import type { ParsedAIResponse, GutterComment } from "./config";

// =============================================================================
// Types
// =============================================================================

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AIUsageInfo {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Call OpenRouter API to generate a timeline summary.
 *
 * @param systemPrompt - Voice-specific system instructions
 * @param userPrompt - The prompt with commit data and context
 * @param model - OpenRouter model ID (e.g., "anthropic/claude-3.5-haiku")
 * @param apiKey - Tenant's OpenRouter API key
 */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiKey: string,
): Promise<{ content: string; usage: AIUsageInfo }> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://grove.place",
        "X-Title": "Grove Timeline Sync",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.5,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("OpenRouter returned no choices");
  }

  const content = data.choices[0].message.content;

  // Estimate cost based on model (rough approximations)
  const costPer1kInput = getModelCost(model, "input");
  const costPer1kOutput = getModelCost(model, "output");
  const estimatedCost =
    (data.usage.prompt_tokens / 1000) * costPer1kInput +
    (data.usage.completion_tokens / 1000) * costPer1kOutput;

  return {
    content,
    usage: {
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      cost: estimatedCost,
    },
  };
}

/**
 * Parse AI response into structured summary data.
 */
export function parseAIResponse(response: string): ParsedAIResponse {
  try {
    let jsonStr = response.trim();

    // Remove markdown code block if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate gutter items
    const validGutter: GutterComment[] = (parsed.gutter || [])
      .filter(
        (item: { anchor?: string; content?: unknown }) =>
          item.anchor && item.content && typeof item.content === "string",
      )
      .map((item: { anchor: string; type?: string; content: string }) => ({
        anchor: item.anchor,
        type: "comment" as const,
        content: item.content.trim(),
      }));

    return {
      success: true,
      brief: parsed.brief || "Worked on a few things today.",
      detailed: parsed.detailed || "## Projects\n\nSome progress was made.",
      gutter: validGutter,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);

    return {
      success: false,
      brief:
        "Some work happened today. The summary got a bit tangled, but the commits tell the story.",
      detailed: "## Projects\n\nWork continued across various projects.",
      gutter: [],
    };
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Get approximate cost per 1k tokens for a model.
 * These are rough estimates; actual billing is done by OpenRouter.
 */
function getModelCost(model: string, type: "input" | "output"): number {
  // Common model pricing (per 1k tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    "anthropic/claude-3.5-haiku": { input: 0.0008, output: 0.004 },
    "anthropic/claude-3-haiku": { input: 0.00025, output: 0.00125 },
    "anthropic/claude-3.5-sonnet": { input: 0.003, output: 0.015 },
    "anthropic/claude-3-sonnet": { input: 0.003, output: 0.015 },
    "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "openai/gpt-4o": { input: 0.005, output: 0.015 },
    "google/gemini-pro-1.5": { input: 0.00125, output: 0.005 },
  };

  // Try exact match first
  if (pricing[model]) {
    return pricing[model][type];
  }

  // Try prefix match (e.g., "anthropic/claude-3.5-haiku-20241022" -> "anthropic/claude-3.5-haiku")
  for (const [key, value] of Object.entries(pricing)) {
    if (model.startsWith(key)) {
      return value[type];
    }
  }

  // Default fallback (Claude Haiku-ish pricing)
  return type === "input" ? 0.0008 : 0.004;
}
