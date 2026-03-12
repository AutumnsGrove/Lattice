/**
 * Provider Tool Definition Tests
 *
 * Tests tool definitions and format converters for different AI providers.
 */

import { describe, it, expect } from "vitest";
import { DRIVER_TOOL, SWARM_TOOL, toAnthropicTool, toOpenAITool, toCloudflareTools } from "./tools";

// =============================================================================
// Tool Definitions
// =============================================================================

describe("DRIVER_TOOL", () => {
	it("should have the correct name", () => {
		expect(DRIVER_TOOL.name).toBe("generate_domain_candidates");
	});

	it("should have a description", () => {
		expect(DRIVER_TOOL.description).toBeTruthy();
		expect(typeof DRIVER_TOOL.description).toBe("string");
	});

	it("should have parameters with domains array", () => {
		const params = DRIVER_TOOL.parameters as {
			type: string;
			properties: { domains: { type: string; items: { type: string } } };
			required: string[];
		};
		expect(params.type).toBe("object");
		expect(params.properties.domains.type).toBe("array");
		expect(params.properties.domains.items.type).toBe("string");
		expect(params.required).toContain("domains");
	});
});

describe("SWARM_TOOL", () => {
	it("should have the correct name", () => {
		expect(SWARM_TOOL.name).toBe("evaluate_domains");
	});

	it("should have parameters with evaluations array", () => {
		const params = SWARM_TOOL.parameters as {
			type: string;
			properties: { evaluations: { type: string } };
			required: string[];
		};
		expect(params.type).toBe("object");
		expect(params.properties.evaluations.type).toBe("array");
		expect(params.required).toContain("evaluations");
	});

	it("should define evaluation item schema with required fields", () => {
		const params = SWARM_TOOL.parameters as {
			properties: {
				evaluations: {
					items: { properties: Record<string, unknown>; required: string[] };
				};
			};
		};
		const itemSchema = params.properties.evaluations.items;
		expect(itemSchema.required).toContain("domain");
		expect(itemSchema.required).toContain("score");
		expect(itemSchema.required).toContain("worth_checking");
	});
});

// =============================================================================
// Format Converters
// =============================================================================

describe("toAnthropicTool", () => {
	it("should use input_schema key for parameters", () => {
		const result = toAnthropicTool(DRIVER_TOOL);

		expect(result.name).toBe("generate_domain_candidates");
		expect(result.description).toBe(DRIVER_TOOL.description);
		expect(result.input_schema).toBe(DRIVER_TOOL.parameters);
		expect(result).not.toHaveProperty("parameters");
	});
});

describe("toOpenAITool", () => {
	it("should wrap in function type envelope", () => {
		const result = toOpenAITool(DRIVER_TOOL);

		expect(result.type).toBe("function");
		const fn = result.function as {
			name: string;
			description: string;
			parameters: unknown;
		};
		expect(fn.name).toBe("generate_domain_candidates");
		expect(fn.description).toBe(DRIVER_TOOL.description);
		expect(fn.parameters).toBe(DRIVER_TOOL.parameters);
	});
});

describe("toCloudflareTools", () => {
	it("should match OpenAI format", () => {
		const cfResult = toCloudflareTools(SWARM_TOOL);
		const oaiResult = toOpenAITool(SWARM_TOOL);

		// Cloudflare uses same format as OpenAI
		expect(cfResult).toEqual(oaiResult);
	});
});

// =============================================================================
// Cross-format consistency
// =============================================================================

describe("format consistency", () => {
	it("should preserve tool name across all formats", () => {
		const anthropic = toAnthropicTool(DRIVER_TOOL);
		const openai = toOpenAITool(DRIVER_TOOL);
		const cf = toCloudflareTools(DRIVER_TOOL);

		expect(anthropic.name).toBe("generate_domain_candidates");
		expect((openai.function as { name: string }).name).toBe("generate_domain_candidates");
		expect((cf.function as { name: string }).name).toBe("generate_domain_candidates");
	});

	it("should preserve parameters across all formats", () => {
		const anthropic = toAnthropicTool(SWARM_TOOL);
		const openai = toOpenAITool(SWARM_TOOL);

		expect(anthropic.input_schema).toBe(SWARM_TOOL.parameters);
		expect((openai.function as { parameters: unknown }).parameters).toBe(SWARM_TOOL.parameters);
	});
});
