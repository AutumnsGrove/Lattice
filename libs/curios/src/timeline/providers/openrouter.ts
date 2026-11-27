/**
 * OpenRouter Provider
 *
 * Universal AI gateway supporting 100+ models through a single API.
 * Users bring their own API key and pick their preferred model.
 *
 * @see https://openrouter.ai/docs
 */

import { DEFAULT_OPENROUTER_MODEL, listPickableModels } from "@autumnsgrove/lumen-registry";

export { DEFAULT_OPENROUTER_MODEL };

// =============================================================================
// Types
// =============================================================================

export interface OpenRouterModel {
	name: string;
	quality: "highest" | "high" | "medium";
	speed: "fast" | "medium" | "slow";
	inputCostPer1M: number;
	outputCostPer1M: number;
}

export interface OpenRouterResponse {
	content: string;
	inputTokens: number;
	outputTokens: number;
	model: string;
	provider: "openrouter";
}

export interface OpenRouterOptions {
	maxTokens?: number;
	temperature?: number;
	siteUrl?: string;
	siteName?: string;
}

export interface OpenRouterKeyValidation {
	valid: boolean;
	error?: string;
	credits?: number;
	usage?: number;
}

// API Response types
interface OpenRouterAPIResponse {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
	};
	model?: string;
}

interface OpenRouterKeyResponse {
	data?: {
		limit_remaining?: number;
		usage?: number;
	};
}

// =============================================================================
// Model Definitions — curated subset for Timeline
// =============================================================================

/**
 * What a picker may offer, derived from the model registry (#1602).
 *
 * This used to be a second, hand-kept table with its own prices — and by the
 * time it was compared against the registry it listed two models OpenRouter no
 * longer serves and disagreed on several prices.
 */
export const OPENROUTER_MODELS: Record<string, OpenRouterModel> = Object.fromEntries(
	listPickableModels().map((model) => [
		model.id,
		{
			name: model.name,
			quality: model.quality as OpenRouterModel["quality"],
			speed: model.speed as OpenRouterModel["speed"],
			inputCostPer1M: model.inputCostPer1M,
			outputCostPer1M: model.outputCostPer1M,
		},
	]),
);

// =============================================================================
// UI Utilities (kept for model picker and key validation)
// =============================================================================

/**
 * Get list of recommended OpenRouter models for the UI, cheapest first.
 */
export function getOpenRouterModels() {
	return listPickableModels();
}

/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(apiKey: string): Promise<OpenRouterKeyValidation> {
	try {
		const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				return { valid: false, error: "Invalid API key" };
			}
			return { valid: false, error: `API error: ${response.status}` };
		}

		const data = (await response.json()) as OpenRouterKeyResponse;

		return {
			valid: true,
			credits: data.data?.limit_remaining,
			usage: data.data?.usage,
		};
	} catch (error) {
		return { valid: false, error: (error as Error).message };
	}
}
