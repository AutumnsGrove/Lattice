/**
 * OpenRouter provider for Cloudflare Workers
 * Uses OpenAI-compatible API with zero data retention
 */

import type { Env } from "../types";
import type {
	AIProvider,
	GenerateOptions,
	GenerateWithToolsOptions,
	ProviderResponse,
	ToolCallResult,
} from "./types";
import { toOpenAITool } from "./tools";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider implements AIProvider {
	readonly name = "openrouter";
	readonly defaultModel = "deepseek/deepseek-v3.2";
	readonly supportsTools = true;

	private apiKey: string;
	private model: string;

	constructor(env: Env, model?: string) {
		const apiKey = env.OPENROUTER_API_KEY;
		if (!apiKey) {
			throw new Error("OPENROUTER_API_KEY not configured");
		}
		this.apiKey = apiKey;
		this.model = model || this.defaultModel;
	}

	async generate(options: GenerateOptions): Promise<ProviderResponse> {
		const { prompt, system, maxTokens = 4096, temperature = 0.7 } = options;
		const model = options.model || this.model;

		const messages: Array<{ role: string; content: string }> = [];
		if (system) {
			messages.push({ role: "system", content: system });
		}
		messages.push({ role: "user", content: prompt });

		const response = await fetch(OPENROUTER_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
				"HTTP-Referer": "https://forage.grove.place",
				"X-Title": "Forage Domain Search",
			},
			body: JSON.stringify({
				model,
				messages,
				max_tokens: maxTokens,
				temperature,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as OpenAIResponse;

		const content = data.choices?.[0]?.message?.content || "";

		return {
			content,
			model: data.model,
			provider: this.name,
			usage: {
				inputTokens: data.usage?.prompt_tokens || 0,
				outputTokens: data.usage?.completion_tokens || 0,
			},
			toolCalls: [],
			rawResponse: data,
		};
	}

	async generateWithTools(options: GenerateWithToolsOptions): Promise<ProviderResponse> {
		const { prompt, tools, system, maxTokens = 4096, temperature = 0.7, toolChoice } = options;
		const model = options.model || this.model;

		const messages: Array<{ role: string; content: string }> = [];
		if (system) {
			messages.push({ role: "system", content: system });
		}
		messages.push({ role: "user", content: prompt });

		const body: Record<string, unknown> = {
			model,
			messages,
			max_tokens: maxTokens,
			temperature,
			tools: tools.map(toOpenAITool),
		};

		// Handle tool_choice
		if (toolChoice) {
			if (toolChoice === "auto") {
				body.tool_choice = "auto";
			} else if (toolChoice === "any") {
				body.tool_choice = "required";
			} else {
				body.tool_choice = { type: "function", function: { name: toolChoice } };
			}
		}

		const response = await fetch(OPENROUTER_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
				"HTTP-Referer": "https://forage.grove.place",
				"X-Title": "Forage Domain Search",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as OpenAIResponse;

		// Parse content and tool calls
		const content = data.choices?.[0]?.message?.content || "";
		const toolCalls: ToolCallResult[] = [];

		const rawToolCalls = data.choices?.[0]?.message?.tool_calls;
		if (rawToolCalls) {
			for (const tc of rawToolCalls) {
				try {
					const args = JSON.parse(tc.function.arguments);
					toolCalls.push({
						toolName: tc.function.name,
						arguments: args,
						rawResponse: tc,
					});
				} catch {
					toolCalls.push({
						toolName: tc.function.name,
						arguments: { raw: tc.function.arguments },
						rawResponse: tc,
					});
				}
			}
		}

		return {
			content,
			model: data.model,
			provider: this.name,
			usage: {
				inputTokens: data.usage?.prompt_tokens || 0,
				outputTokens: data.usage?.completion_tokens || 0,
			},
			toolCalls,
			rawResponse: data,
		};
	}
}

interface OpenAIResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string | null;
			tool_calls?: Array<{
				id: string;
				type: string;
				function: {
					name: string;
					arguments: string;
				};
			}>;
		};
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}
