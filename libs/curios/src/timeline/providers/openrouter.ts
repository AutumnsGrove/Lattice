/**
 * OpenRouter Provider
 *
 * Universal AI gateway supporting 100+ models through a single API.
 * Users bring their own API key and pick their preferred model.
 *
 * @see https://openrouter.ai/docs
 */

// =============================================================================
// Types
// =============================================================================

export interface OpenRouterModel {
	name: string;
	quality: "highest" | "high" | "good";
	speed: "fastest" | "fast" | "medium";
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

export const OPENROUTER_MODELS: Record<string, OpenRouterModel> = {
	"deepseek/deepseek-v4.1-flash-1017": {
		name: "DeepSeek V4.1 Flash (1017)",
		quality: "high",
		speed: "fast",
		inputCostPer1M: 0.03,
		outputCostPer1M: 0.2,
	},
	"deepseek/deepseek-v4-flash-0731": {
		name: "DeepSeek V4 Flash",
		quality: "high",
		speed: "fast",
		inputCostPer1M: 0.046,
		outputCostPer1M: 0.3,
	},
	"deepseek/deepseek-v4-pro-0813": {
		name: "DeepSeek V4 Pro",
		quality: "highest",
		speed: "medium",
		inputCostPer1M: 0.6026,
		outputCostPer1M: 1.808,
	},
	"xiaomi/mimo-v2.5": {
		name: "MiMo V2.5",
		quality: "high",
		speed: "fast",
		inputCostPer1M: 0.119,
		outputCostPer1M: 0.238,
	},
	"xiaomi/mimo-v2.5-pro": {
		name: "MiMo V2.5 Pro",
		quality: "highest",
		speed: "medium",
		inputCostPer1M: 0.3045,
		outputCostPer1M: 0.609,
	},
	"minimax/minimax-m3": {
		name: "MiniMax M3",
		quality: "highest",
		speed: "fast",
		inputCostPer1M: 0.23,
		outputCostPer1M: 0.96,
	},
	"anthropic/claude-haiku-4.5": {
		name: "Claude Haiku 4.5",
		quality: "highest",
		speed: "fast",
		inputCostPer1M: 1.0,
		outputCostPer1M: 5.0,
	},
	"openai/gpt-oss-120b": {
		name: "GPT-OSS 120B",
		quality: "high",
		speed: "fast",
		inputCostPer1M: 0.04,
		outputCostPer1M: 0.19,
	},
};

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash-0731";

// =============================================================================
// UI Utilities (kept for model picker and key validation)
// =============================================================================

/**
 * Get list of recommended OpenRouter models for the UI
 */
export function getOpenRouterModels() {
	return Object.entries(OPENROUTER_MODELS).map(([id, config]) => ({
		id,
		name: config.name,
		quality: config.quality,
		speed: config.speed,
		inputCostPer1M: config.inputCostPer1M,
		outputCostPer1M: config.outputCostPer1M,
		isDefault: id === DEFAULT_OPENROUTER_MODEL,
	}));
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
