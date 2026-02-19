/**
 * Tool definitions for AI model function calling
 */

import type { ToolDefinition } from "./types";

export const DRIVER_TOOL: ToolDefinition = {
	name: "generate_domain_candidates",
	description:
		"Generate domain name candidates for a business. Call this tool with your list of suggested domains.",
	parameters: {
		type: "object",
		properties: {
			domains: {
				type: "array",
				items: { type: "string" },
				description:
					"List of domain candidates (e.g., ['example.com', 'mysite.io']). Each must be a valid domain with TLD.",
			},
		},
		required: ["domains"],
	},
};

export const SWARM_TOOL: ToolDefinition = {
	name: "evaluate_domains",
	description:
		"Evaluate domain candidates for quality, memorability, and brand fit. Call this tool with your evaluations.",
	parameters: {
		type: "object",
		properties: {
			evaluations: {
				type: "array",
				items: {
					type: "object",
					properties: {
						domain: {
							type: "string",
							description: "The domain being evaluated",
						},
						score: {
							type: "number",
							minimum: 0,
							maximum: 1,
							description: "Overall quality score from 0 to 1",
						},
						worth_checking: {
							type: "boolean",
							description: "Whether this domain is worth checking availability",
						},
						pronounceable: {
							type: "boolean",
							description: "Easy to pronounce aloud",
						},
						memorable: {
							type: "boolean",
							description: "Easy to remember",
						},
						brand_fit: {
							type: "boolean",
							description: "Fits the brand vibe",
						},
						email_friendly: {
							type: "boolean",
							description: "Works well as an email address",
						},
						flags: {
							type: "array",
							items: { type: "string" },
							description: "List of concerns (e.g., 'contains hyphen', 'hard to spell')",
						},
						notes: {
							type: "string",
							description: "Brief explanation of the evaluation",
						},
					},
					required: ["domain", "score", "worth_checking"],
				},
				description: "Array of domain evaluations",
			},
		},
		required: ["evaluations"],
	},
};

/**
 * Convert tool to Anthropic format
 */
export function toAnthropicTool(tool: ToolDefinition): Record<string, unknown> {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters,
	};
}

/**
 * Convert tool to OpenAI format (also used by Kimi, DeepSeek)
 */
export function toOpenAITool(tool: ToolDefinition): Record<string, unknown> {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	};
}

/**
 * Convert tool to Cloudflare Workers AI format
 */
export function toCloudflareTools(tool: ToolDefinition): Record<string, unknown> {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	};
}
