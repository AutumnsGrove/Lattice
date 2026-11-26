/**
 * Provider exports and factory function
 */

import type { Env } from "../types";
import type { AIProvider, ProviderName } from "./types";
import { DeepSeekProvider } from "./deepseek";
import { OpenRouterProvider } from "./openrouter";
import { FORAGE_ERRORS, logForageError } from "../errors";
import { MODELS } from "@autumnsgrove/lumen-registry";

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
			logForageError(FORAGE_ERRORS.UNKNOWN_PROVIDER, { detail: `unrecognized provider: ${name}` });
			throw new Error(FORAGE_ERRORS.UNKNOWN_PROVIDER.userMessage);
	}
}

/**
 * Default models per provider.
 *
 * OpenRouter is primary (ZDR compliant), DeepSeek is the fallback. The
 * OpenRouter ID comes from the model registry; the direct DeepSeek provider
 * names DeepSeek's own model, which the registry does not cover (#1602).
 */
export const PROVIDER_DEFAULTS: Record<ProviderName, string> = {
	deepseek: "deepseek-chat", // Fallback only
	openrouter: MODELS.DEEPSEEK_V3_2, // Primary
};
