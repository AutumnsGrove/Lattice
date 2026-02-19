/**
 * Shutter Extraction Layer - OpenRouter LLM extraction
 *
 * Phase 2 of the Shutter pipeline: full content extraction using
 * OpenRouter models after the content has passed canary checks.
 */

import type { OpenRouterRequest, OpenRouterResponse } from "./types";
import { MODEL_TIERS, DEFAULTS } from "./types";

/**
 * Get the OpenRouter model ID for a tier
 *
 * @param tier - Model tier (fast, accurate, research, code)
 * @returns OpenRouter model ID
 */
export function getModelForTier(tier: string): string {
	return MODEL_TIERS[tier] ?? MODEL_TIERS[DEFAULTS.MODEL];
}

/**
 * Build the extraction prompt
 *
 * Follows the same structure as the Python implementation:
 * 1. Web page content section
 * 2. User's query
 * 3. Optional extended guidance
 * 4. Instructions to respond concisely
 *
 * @param content - Page content to extract from
 * @param query - What to extract
 * @param extendedQuery - Optional additional guidance
 * @returns Formatted prompt
 */
export function buildExtractionPrompt(
	content: string,
	query: string,
	extendedQuery?: string,
): string {
	let prompt = `Web page content:
---
${content}
---

${query}
`;

	if (extendedQuery) {
		prompt += `
Additional extraction guidance:
${extendedQuery}
`;
	}

	prompt += `
Respond concisely based only on the content above. If the information is not present, say so briefly.`;

	return prompt;
}

/**
 * Result from content extraction
 */
export interface ExtractionResult {
	extracted: string;
	tokensInput: number;
	tokensOutput: number;
	modelUsed: string;
}

/**
 * Extract content from page using OpenRouter
 *
 * @param content - Page content to extract from
 * @param query - What to extract
 * @param apiKey - OpenRouter API key
 * @param model - Model tier (default: fast)
 * @param maxTokens - Maximum output tokens (default: 500)
 * @param extendedQuery - Optional additional guidance
 * @returns Extraction result with tokens used
 * @throws Error if extraction fails
 */
export async function extractContent(
	content: string,
	query: string,
	apiKey: string,
	model: string = DEFAULTS.MODEL,
	maxTokens: number = DEFAULTS.MAX_TOKENS,
	extendedQuery?: string,
): Promise<ExtractionResult> {
	const modelUsed = getModelForTier(model);
	const prompt = buildExtractionPrompt(content, query, extendedQuery);

	const requestBody: OpenRouterRequest = {
		model: modelUsed,
		messages: [{ role: "user", content: prompt }],
		max_tokens: maxTokens,
		temperature: 0, // Critical for consistency
	};

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"HTTP-Referer": "https://github.com/AutumnsGrove/Shutter",
			"X-Title": "Shutter Content Extraction",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
	}

	const result = (await response.json()) as OpenRouterResponse;

	if (!result.choices?.[0]?.message?.content) {
		throw new Error("OpenRouter returned empty response");
	}

	return {
		extracted: result.choices[0].message.content,
		tokensInput: result.usage?.prompt_tokens ?? Math.floor(prompt.length / 4),
		tokensOutput: result.usage?.completion_tokens ?? 0,
		modelUsed,
	};
}
