/**
 * TypeScript provider types and interfaces
 */

import type { Env } from "../types";

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface ToolCallResult {
	toolName: string;
	arguments: Record<string, unknown>;
	rawResponse?: unknown;
}

export interface GenerateOptions {
	prompt: string;
	system?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

export interface GenerateWithToolsOptions extends GenerateOptions {
	tools: ToolDefinition[];
	toolChoice?: string;
}

export interface ProviderResponse {
	content: string;
	model: string;
	provider: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
	};
	toolCalls: ToolCallResult[];
	rawResponse?: unknown;
}

export interface AIProvider {
	/** Provider name (e.g., 'claude', 'deepseek') */
	readonly name: string;

	/** Default model for this provider */
	readonly defaultModel: string;

	/** Whether this provider supports tool calling */
	readonly supportsTools: boolean;

	/** Generate a response without tools */
	generate(options: GenerateOptions): Promise<ProviderResponse>;

	/** Generate a response with tool calling */
	generateWithTools(options: GenerateWithToolsOptions): Promise<ProviderResponse>;
}

export type ProviderName = "deepseek" | "openrouter";

export interface ProviderConfig {
	name: ProviderName;
	env: Env;
	model?: string;
}
