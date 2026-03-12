/**
 * Driver Agent Tests
 *
 * Tests domain validation, candidate parsing, tool call parsing,
 * and the generateCandidates orchestrator.
 */

import { describe, it, expect, vi } from "vitest";
import { generateCandidates, type DriverOptions } from "./driver";
import type { AIProvider, ProviderResponse } from "../providers/types";

// =============================================================================
// Test Helpers
// =============================================================================

function mockProvider(overrides: Partial<AIProvider> = {}): AIProvider {
	return {
		name: "test",
		defaultModel: "test-model",
		supportsTools: false,
		generate: vi.fn(
			async (): Promise<ProviderResponse> => ({
				content: '{"domains": ["example.com"]}',
				model: "test-model",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			}),
		),
		generateWithTools: vi.fn(
			async (): Promise<ProviderResponse> => ({
				content: "",
				model: "test-model",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [
					{
						toolName: "generate_domain_candidates",
						arguments: { domains: ["example.com"] },
					},
				],
			}),
		),
		...overrides,
	};
}

const baseOptions: DriverOptions = {
	businessName: "Sunrise Bakery",
	tldPreferences: ["com", "co", "io"],
	vibe: "warm and inviting",
	batchNum: 1,
	count: 10,
};

// =============================================================================
// isValidDomain (tested indirectly through parseCandidates)
// =============================================================================

describe("domain validation (via generateCandidates)", () => {
	it("should accept valid domains", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com", "bakery.io", "my-site.co"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(3);
		expect(result.candidates.map((c) => c.domain)).toEqual([
			"sunrise.com",
			"bakery.io",
			"my-site.co",
		]);
	});

	it("should reject domains shorter than 4 characters", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["a.b", "ab.c", "sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0].domain).toBe("sunrise.com");
	});

	it("should reject domains without a dot", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["justAWord", "sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
	});

	it("should reject domains with numeric TLDs", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.123", "sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
	});

	it("should reject domains with hyphens at start or end of name", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["-sunrise.com", "sunrise-.com", "sun-rise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0].domain).toBe("sun-rise.com");
	});

	it("should lowercase all domains", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["Sunrise.COM", "BAKERY.io"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates[0].domain).toBe("sunrise.com");
		expect(result.candidates[1].domain).toBe("bakery.io");
	});

	it("should deduplicate domains (case-insensitive)", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com", "Sunrise.com", "SUNRISE.COM"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
	});
});

// =============================================================================
// parseCandidates (JSON and regex fallback)
// =============================================================================

describe("candidate parsing", () => {
	it("should parse JSON response with domains array", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["alpha.com", "beta.io"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(2);
	});

	it("should parse JSON embedded in markdown fences", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: 'Here are my suggestions:\n```json\n{"domains": ["alpha.com", "beta.io"]}\n```\n',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(2);
	});

	it("should fall back to regex extraction when JSON fails", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: "Here are some options:\n- sunrise.com\n- bakery.io\n- getbaked.co",
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates.length).toBeGreaterThanOrEqual(3);
	});

	it("should return empty array for gibberish content", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: "I cannot help with that request.",
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(0);
	});
});

// =============================================================================
// Tool calling path
// =============================================================================

describe("tool calling", () => {
	it("should use tool calling when provider supports it", async () => {
		const provider = mockProvider({
			supportsTools: true,
			generateWithTools: vi.fn(async () => ({
				content: "",
				model: "test",
				provider: "test",
				usage: { inputTokens: 200, outputTokens: 100 },
				toolCalls: [
					{
						toolName: "generate_domain_candidates",
						arguments: { domains: ["tool-result.com", "called.io"] },
					},
				],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);

		expect(provider.generateWithTools).toHaveBeenCalled();
		expect(provider.generate).not.toHaveBeenCalled();
		expect(result.candidates).toHaveLength(2);
		expect(result.candidates[0].domain).toBe("tool-result.com");
	});

	it("should fall back to content parsing when tool call has no results", async () => {
		const provider = mockProvider({
			supportsTools: true,
			generateWithTools: vi.fn(async () => ({
				content: '{"domains": ["fallback.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 200, outputTokens: 100 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0].domain).toBe("fallback.com");
	});

	it("should fall back to JSON prompt when tool calling throws", async () => {
		const provider = mockProvider({
			supportsTools: true,
			generateWithTools: vi.fn(async () => {
				throw new Error("Tool calling not supported");
			}),
			generate: vi.fn(async () => ({
				content: '{"domains": ["fallback.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(provider.generate).toHaveBeenCalled();
		expect(result.candidates).toHaveLength(1);
	});
});

// =============================================================================
// createCandidate
// =============================================================================

describe("candidate structure", () => {
	it("should split domain into name and tld", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.candidates[0]).toEqual({
			domain: "sunrise.com",
			batchNum: 1,
			tld: "com",
			name: "sunrise",
		});
	});

	it("should use correct batch number", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, { ...baseOptions, batchNum: 3 });
		expect(result.candidates[0].batchNum).toBe(3);
	});
});

// =============================================================================
// Token tracking
// =============================================================================

describe("token usage tracking", () => {
	it("should track input and output tokens", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 500, outputTokens: 200 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, baseOptions);
		expect(result.inputTokens).toBe(500);
		expect(result.outputTokens).toBe(200);
	});
});

// =============================================================================
// Previous results filtering
// =============================================================================

describe("deduplication against previous results", () => {
	it("should filter out previously checked domains", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: '{"domains": ["sunrise.com", "bakery.io", "newone.co"]}',
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, {
			...baseOptions,
			previousResults: {
				checked_count: 2,
				available_count: 0,
				target_count: 5,
				tried_summary: "sunrise.com, bakery.io",
				available_summary: "",
				taken_patterns: "",
			},
		});

		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0].domain).toBe("newone.co");
	});

	it("should respect count limit", async () => {
		const domains = Array.from({ length: 20 }, (_, i) => `domain${i}.com`);
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: JSON.stringify({ domains }),
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await generateCandidates(provider, { ...baseOptions, count: 5 });
		expect(result.candidates).toHaveLength(5);
	});
});
