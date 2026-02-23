/**
 * Type-safe OpenRouter methods for the Warden client.
 *
 * Convenience wrappers that provide proper typing for OpenRouter
 * actions routed through Warden's credential-injected proxy.
 */

import type { WardenClient } from "../client";
import type {
	WardenResponse,
	OpenRouterChatCompletion,
	OpenRouterMessage,
	OpenRouterModelsResponse,
	OpenRouterGeneration,
} from "../types";

export class WardenOpenRouter {
	constructor(private client: WardenClient) {}

	async chatCompletion(params: {
		model: string;
		messages: OpenRouterMessage[];
		max_tokens?: number;
		temperature?: number;
		top_p?: number;
		tenant_id?: string;
	}): Promise<WardenResponse<OpenRouterChatCompletion>> {
		const { tenant_id, ...requestParams } = params;
		return this.client.request({
			service: "openrouter",
			action: "chat_completion",
			params: { ...requestParams, stream: false },
			tenant_id,
		});
	}

	async listModels(): Promise<WardenResponse<OpenRouterModelsResponse>> {
		return this.client.request({
			service: "openrouter",
			action: "list_models",
			params: {},
		});
	}

	async getGeneration(params: {
		generation_id: string;
	}): Promise<WardenResponse<OpenRouterGeneration>> {
		return this.client.request({
			service: "openrouter",
			action: "get_generation",
			params,
		});
	}
}
