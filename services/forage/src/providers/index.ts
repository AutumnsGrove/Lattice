/**
 * Provider exports and factory function
 */

import type { Env } from "../types";
import type { AIProvider, ProviderName } from "./types";
import { DeepSeekProvider } from "./deepseek";
import { OpenRouterProvider } from "./openrouter";

// Re-export types
export type {
	AIProvider,
	ProviderName,
	ProviderResponse,
	ToolDefinition,
	ToolCallResult,
	GenerateOptions,
	GenerateWithToolsOptions,
} from "./types";

// Re-export tools
export { DRIVER_TOOL, SWARM_TOOL } from "./tools";

// Re-export providers
export { DeepSeekProvider } from "./deepseek";
export { OpenRouterProvider } from "./openrouter";

/**
 * Create a provider instance by name
 */
export function getProvider(name: ProviderName, env: Env, model?: string): AIProvider {
	switch (name) {
		case "deepseek":
			return new DeepSeekProvider(env, model);
		case "openrouter":
			return new OpenRouterProvider(env, model);
		default:
			throw new Error(`Unknown provider: ${name}`);
	}
}

/**
 * Default models per provider
 * OpenRouter is primary (ZDR compliant), DeepSeek is fallback
 */
export const PROVIDER_DEFAULTS: Record<ProviderName, string> = {
	deepseek: "deepseek-chat", // Fallback only
	openrouter: "deepseek/deepseek-v3.2", // Primary - ZDR compliant
};

/**
 * Cost per 1M tokens (input, output) in USD
 */
export const PROVIDER_COSTS: Record<ProviderName, { input: number; output: number }> = {
	deepseek: { input: 0.28, output: 0.42 },
	openrouter: { input: 0.28, output: 0.42 }, // Same as DeepSeek via OpenRouter
};
