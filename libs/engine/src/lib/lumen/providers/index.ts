/**
 * Lumen Providers - Factory & Registry
 *
 * Creates and manages provider instances based on available credentials.
 */

import type { LumenClientConfig, LumenProviderName } from "../types.js";
import type { LumenProvider } from "./types.js";
import { createOpenRouterProvider, OpenRouterProvider } from "./openrouter.js";
import {
  createCloudflareAIProvider,
  CloudflareAIProvider,
} from "./cloudflare-ai.js";

// Re-export types and implementations
export type {
  LumenProvider,
  LumenInferenceOptions,
  LumenProviderResponse,
} from "./types.js";
export { OpenRouterProvider, createOpenRouterProvider } from "./openrouter.js";
export {
  CloudflareAIProvider,
  createCloudflareAIProvider,
} from "./cloudflare-ai.js";

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

export interface ProviderRegistry {
  openrouter?: OpenRouterProvider;
  "cloudflare-ai"?: CloudflareAIProvider;
}

/**
 * Create all available providers based on config
 */
export function createProviders(config: LumenClientConfig): ProviderRegistry {
  const providers: ProviderRegistry = {};

  // OpenRouter (requires API key)
  if (config.openrouterApiKey) {
    providers.openrouter = createOpenRouterProvider(config.openrouterApiKey, {
      siteUrl: "https://grove.place",
      siteName: "Grove",
    });
  }

  // Cloudflare AI (requires binding)
  if (config.ai) {
    providers["cloudflare-ai"] = createCloudflareAIProvider(config.ai);
  }

  return providers;
}

/**
 * Get a specific provider from the registry
 */
export function getProvider(
  registry: ProviderRegistry,
  name: LumenProviderName,
): LumenProvider | undefined {
  return registry[name];
}

/**
 * Check which providers are available
 */
export function getAvailableProviders(
  registry: ProviderRegistry,
): LumenProviderName[] {
  const available: LumenProviderName[] = [];

  if (registry.openrouter) {
    available.push("openrouter");
  }

  if (registry["cloudflare-ai"]) {
    available.push("cloudflare-ai");
  }

  return available;
}
