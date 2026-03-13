/**
 * OpenRouter Provider Tests
 *
 * Comprehensive test suite for the OpenRouterProvider class.
 * Tests inference, streaming, embeddings, moderation, and health checks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterProvider, createOpenRouterProvider } from "./openrouter.js";
import { ProviderError, ProviderTimeoutError } from "../errors.js";
import type { LumenMessage } from "../types.js";

// =============================================================================
// SETUP & MOCKS
// =============================================================================

const originalFetch = globalThis.fetch;

// Mock config module
vi.mock("../config.js", () => ({
	PROVIDERS: {
		openrouter: {
			name: "OpenRouter",
			baseUrl: "https://openrouter.ai/api/v1",
			timeoutMs: 60000,
		},
	},
	calculateCost: vi.fn((model: string, inputTokens: number, outputTokens: number) => {
		return (inputTokens + outputTokens) * 0.001;
	}),
}));

// Mock safeParseJson - use the real implementation
vi.mock("../../utils/json.js", async () => {
	const actual = await vi.importActual("../../utils/json.js");
	return actual;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a mock Response object
 */
function createMockResponse(
	body: unknown,
	options: { ok?: boolean; status?: number; statusText?: string } = {},
) {
	const { ok = true, status = 200, statusText = "OK" } = options;
	return {
		ok,
		status,
		statusText,
		json: vi.fn().mockResolvedValue(body),
		text: vi.fn().mockResolvedValue(JSON.stringify(body)),
	} as unknown as Response;
}

/**
 * Create a mock ReadableStream for streaming tests
 */
function createSSEStream(chunks: string[]): ReadableStream {
	return new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

// =============================================================================
// CONSTRUCTOR & FACTORY TESTS
// =============================================================================

describe("OpenRouterProvider constructor and factory", () => {
	it("creates an instance with default siteUrl and siteName", () => {
		const provider = new OpenRouterProvider("test-api-key");
		expect(provider.name).toBe("openrouter");
		// Private fields can't be accessed directly, but we can test behavior
	});

	it("accepts custom siteUrl and siteName", () => {
		const provider = new OpenRouterProvider("test-api-key", {
			siteUrl: "https://example.com",
			siteName: "Example",
		});
		expect(provider.name).toBe("openrouter");
	});

	it("createOpenRouterProvider factory returns an instance", () => {
		const provider = createOpenRouterProvider("test-api-key");
		expect(provider).toBeInstanceOf(OpenRouterProvider);
		expect(provider.name).toBe("openrouter");
	});

	it("factory accepts custom options", () => {
		const provider = createOpenRouterProvider("test-api-key", {
			siteUrl: "https://custom.site",
			siteName: "Custom",
		});
		expect(provider).toBeInstanceOf(OpenRouterProvider);
	});
});

// =============================================================================
// INFERENCE TESTS
// =============================================================================

describe("inference()", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("returns successful response with content and usage", async () => {
		const provider = new OpenRouterProvider("test-key");
		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [
					{
						message: { content: "Hello, world!" },
						finish_reason: "stop",
						index: 0,
					},
				],
				usage: {
					prompt_tokens: 10,
					completion_tokens: 5,
					total_tokens: 15,
				},
				model: "deepseek/deepseek-chat",
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.inference(
			"deepseek/deepseek-chat",
			[{ role: "user", content: "Hello" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		expect(result.content).toBe("Hello, world!");
		expect(result.usage.input).toBe(10);
		expect(result.usage.output).toBe(5);
		expect(result.model).toBe("deepseek/deepseek-chat");
	});

	it("sends correct headers including Authorization, HTTP-Referer, and X-Title", async () => {
		const provider = new OpenRouterProvider("test-key", {
			siteUrl: "https://example.com",
			siteName: "TestApp",
		});

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
			maxTokens: 100,
			temperature: 0.7,
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const headers = callArgs[1].headers;

		expect(headers.Authorization).toBe("Bearer test-key");
		expect(headers["HTTP-Referer"]).toBe("https://example.com");
		expect(headers["X-Title"]).toBe("TestApp");
	});

	it("passes tools and toolChoice from providerOptions", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const tools = [{ type: "function", function: { name: "test_func" } }];
		const toolChoice = "auto";

		await provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
			maxTokens: 100,
			temperature: 0.7,
			providerOptions: { tools, toolChoice },
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);

		expect(body.tools).toEqual(tools);
		expect(body.tool_choice).toBe(toolChoice);
	});

	it("maps tool_calls from response", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [
					{
						message: {
							content: "",
							tool_calls: [
								{
									id: "call_123",
									type: "function",
									function: {
										name: "weather",
										arguments: '{"city":"NYC"}',
									},
								},
							],
						},
					},
				],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.inference(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls![0]).toEqual({
			id: "call_123",
			type: "function",
			function: {
				name: "weather",
				arguments: '{"city":"NYC"}',
			},
		});
	});

	it("uses apiKeyOverride when provided", async () => {
		const provider = new OpenRouterProvider("original-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
			maxTokens: 100,
			temperature: 0.7,
			apiKeyOverride: "override-key",
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const headers = callArgs[1].headers;

		expect(headers.Authorization).toBe("Bearer override-key");
	});

	it("falls back to token estimation when usage missing", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response text" } }],
				// No usage field
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.inference(
			"test/model",
			[{ role: "user", content: "Test message here" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		// Estimation: "Test message here" = 16 chars / 4 = 4 tokens
		// "Response text" = 13 chars / 4 = 4 tokens (rounded up)
		expect(result.usage.input).toBeGreaterThan(0);
		expect(result.usage.output).toBeGreaterThan(0);
	});

	it("throws ProviderError on HTTP error status", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: false,
			status: 500,
			text: vi.fn().mockResolvedValue("Internal server error"),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await expect(
			provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
				maxTokens: 100,
				temperature: 0.7,
			}),
		).rejects.toThrow(ProviderError);
	});

	it("extracts error message from JSON error body", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: false,
			status: 400,
			text: vi.fn().mockResolvedValue(
				JSON.stringify({
					error: { message: "Invalid request format" },
				}),
			),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		try {
			await provider.inference(
				"test/model",
				[{ role: "user", content: "Test" }] as LumenMessage[],
				{
					maxTokens: 100,
					temperature: 0.7,
				},
			);
		} catch (err) {
			expect(err).toBeInstanceOf(ProviderError);
			expect((err as ProviderError).message).toContain("Invalid request format");
		}
	});

	it("truncates non-JSON error body to 200 chars", async () => {
		const provider = new OpenRouterProvider("test-key");
		const longError = "x".repeat(300);

		const mockResponse = {
			ok: false,
			status: 502,
			text: vi.fn().mockResolvedValue(longError),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		try {
			await provider.inference(
				"test/model",
				[{ role: "user", content: "Test" }] as LumenMessage[],
				{
					maxTokens: 100,
					temperature: 0.7,
				},
			);
		} catch (err) {
			expect(err).toBeInstanceOf(ProviderError);
			const message = (err as ProviderError).message;
			expect(message.length).toBeLessThanOrEqual(250); // Including prefix
		}
	});

	it("throws ProviderError on API-level error field", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				error: { message: "API error occurred", code: "invalid_model" },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await expect(
			provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
				maxTokens: 100,
				temperature: 0.7,
			}),
		).rejects.toThrow(ProviderError);
	});

	it("throws ProviderTimeoutError on abort timeout", async () => {
		const provider = new OpenRouterProvider("test-key");

		(globalThis.fetch as any).mockImplementation(() => {
			return new Promise((_, reject) => {
				const err = new Error("aborted");
				err.name = "AbortError";
				setTimeout(() => reject(err), 10);
			});
		});

		await expect(
			provider.inference("test/model", [{ role: "user", content: "Test" }] as LumenMessage[], {
				maxTokens: 100,
				temperature: 0.7,
				timeoutMs: 100,
			}),
		).rejects.toThrow(ProviderTimeoutError);
	});

	it("wraps unknown errors in ProviderError with cause", async () => {
		const provider = new OpenRouterProvider("test-key");
		const originalError = new Error("Network error");

		(globalThis.fetch as any).mockRejectedValue(originalError);

		try {
			await provider.inference(
				"test/model",
				[{ role: "user", content: "Test" }] as LumenMessage[],
				{
					maxTokens: 100,
					temperature: 0.7,
				},
			);
		} catch (err) {
			expect(err).toBeInstanceOf(ProviderError);
			expect((err as ProviderError).cause).toBe(originalError);
		}
	});
});

// =============================================================================
// STREAMING TESTS
// =============================================================================

describe("stream()", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("yields content chunks from SSE stream", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
				'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const contentChunks = chunks.filter((c) => !c.done);
		const finalChunk = chunks.find((c) => c.done);

		expect(contentChunks.map((c) => c.content).join("")).toBe("Hello world");
		expect(finalChunk).toBeDefined();
		expect(finalChunk!.usage).toBeDefined();
	});

	it("handles [DONE] sentinel correctly", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{"content":"Test"}}]}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		expect(chunks).toHaveLength(2); // One content chunk, one done chunk
		expect(chunks[chunks.length - 1].done).toBe(true);
	});

	it("skips non-data lines", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				"random line\n\n",
				'data: {"choices":[{"delta":{"content":"Valid"}}]}\n\n',
				":comment line\n\n",
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const content = chunks
			.filter((c) => !c.done)
			.map((c) => c.content)
			.join("");
		expect(content).toBe("Valid");
	});

	it("final chunk has done:true with usage", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{"content":"Test"}}], "usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const finalChunk = chunks[chunks.length - 1];
		expect(finalChunk.done).toBe(true);
		expect(finalChunk.usage).toBeDefined();
		expect(finalChunk.usage!.input).toBe(10);
		expect(finalChunk.usage!.output).toBe(5);
	});

	it("falls back to token estimation when stream has no usage", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{"content":"Response"}}]}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test input" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const finalChunk = chunks[chunks.length - 1];
		expect(finalChunk.usage!.input).toBeGreaterThan(0);
		expect(finalChunk.usage!.output).toBeGreaterThan(0);
	});

	it("handles buffer splitting across reads (partial lines)", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{',
				'"content":"Split"}}]}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const content = chunks
			.filter((c) => !c.done)
			.map((c) => c.content)
			.join("");
		expect(content).toBe("Split");
	});

	it("skips malformed JSON chunks and continues processing", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: createSSEStream([
				'data: {"choices":[{"delta":{"content":"First"}}]}\n\n',
				"data: {invalid json}\n\n",
				'data: {"choices":[{"delta":{"content":"Second"}}]}\n\n',
				"data: [DONE]\n\n",
			]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const chunks = [];
		for await (const chunk of provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		)) {
			chunks.push(chunk);
		}

		const content = chunks
			.filter((c) => !c.done)
			.map((c) => c.content)
			.join("");
		expect(content).toBe("FirstSecond");
	});

	it("throws ProviderError on non-200 response", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: false,
			status: 429,
			text: vi.fn().mockResolvedValue("Rate limited"),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const streamGen = provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		await expect(streamGen.next()).rejects.toThrow(ProviderError);
	});

	it("throws ProviderError when no response body", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			body: null,
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const streamGen = provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		await expect(streamGen.next()).rejects.toThrow(ProviderError);
	});

	it("throws ProviderTimeoutError on abort", async () => {
		const provider = new OpenRouterProvider("test-key");

		(globalThis.fetch as any).mockImplementation(() => {
			return new Promise((_, reject) => {
				const err = new Error("aborted");
				err.name = "AbortError";
				setTimeout(() => reject(err), 10);
			});
		});

		const streamGen = provider.stream(
			"test/model",
			[{ role: "user", content: "Test" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
				timeoutMs: 100,
			},
		);

		await expect(streamGen.next()).rejects.toThrow(ProviderTimeoutError);
	});
});

// =============================================================================
// EMBEDDINGS TESTS
// =============================================================================

describe("embed()", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("returns sorted embeddings by index", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [
					{ embedding: [0.1, 0.2], index: 1 },
					{ embedding: [0.3, 0.4], index: 0 },
				],
				usage: { total_tokens: 20 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.embed("test/embed", ["text1", "text2"]);

		expect(result.embeddings).toEqual([
			[0.3, 0.4],
			[0.1, 0.2],
		]);
	});

	it("normalizes string input to array", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ embedding: [0.1, 0.2], index: 0 }],
				usage: { total_tokens: 10 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await provider.embed("test/embed", "single text");

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);
		expect(Array.isArray(body.input)).toBe(true);
		expect(body.input).toEqual(["single text"]);
	});

	it("uses total_tokens from usage", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ embedding: [0.1], index: 0 }],
				usage: { total_tokens: 50 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.embed("test/embed", "text");

		expect(result.tokens).toBe(50);
	});

	it("falls back to prompt_tokens when total_tokens missing", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ embedding: [0.1], index: 0 }],
				usage: { prompt_tokens: 30 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.embed("test/embed", "text");

		expect(result.tokens).toBe(30);
	});

	it("defaults to 0 tokens when no usage provided", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				data: [{ embedding: [0.1], index: 0 }],
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.embed("test/embed", "text");

		expect(result.tokens).toBe(0);
	});

	it("throws ProviderError on HTTP error", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: false,
			status: 400,
			text: vi.fn().mockResolvedValue("Bad request"),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		await expect(provider.embed("test/embed", "text")).rejects.toThrow(ProviderError);
	});

	it("throws ProviderTimeoutError on abort", async () => {
		const provider = new OpenRouterProvider("test-key");

		(globalThis.fetch as any).mockImplementation(() => {
			return new Promise((_, reject) => {
				const err = new Error("aborted");
				err.name = "AbortError";
				setTimeout(() => reject(err), 10);
			});
		});

		await expect(provider.embed("test/embed", "text")).rejects.toThrow(ProviderTimeoutError);
	});
});

// =============================================================================
// MODERATION TESTS
// =============================================================================

describe("moderate()", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	// Policy-based moderation tests
	describe("policy-based moderation", () => {
		it("parses safe JSON response → safe:true", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [{ message: { content: '{"safe": true}' } }],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("openai/gpt-oss-safeguard-20b", "Hello, how are you?");

			expect(result.safe).toBe(true);
			expect(result.categories).toEqual([]);
		});

		it("parses unsafe JSON with categories → safe:false", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: '{"safe": false, "categories": ["violence", "hate"], "confidence": 0.95}',
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate(
				"openai/gpt-oss-safeguard-20b",
				"Violent content here",
			);

			expect(result.safe).toBe(false);
			expect(result.categories).toContain("violence");
			expect(result.categories).toContain("hate");
			expect(result.confidence).toBe(0.95);
		});

		it("treats no JSON in response → safe:true with confidence 0.5", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "This is not JSON",
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("openai/gpt-oss-safeguard-20b", "Content");

			expect(result.safe).toBe(true);
			expect(result.confidence).toBe(0.5);
		});

		it("treats invalid JSON → safe:true with confidence 0.5", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: '{"invalid json',
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("openai/gpt-oss-safeguard-20b", "Content");

			expect(result.safe).toBe(true);
			expect(result.confidence).toBe(0.5);
		});

		it("clamps confidence to [0, 1]", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: '{"safe": false, "categories": ["violence"], "confidence": 2.5}',
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("openai/gpt-oss-safeguard-20b", "Content");

			expect(result.confidence).toBeLessThanOrEqual(1);
			expect(result.confidence).toBeGreaterThanOrEqual(0);
		});

		it("filters invalid categories against Grove taxonomy", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content:
									'{"safe": false, "categories": ["violence", "invalid_category", "hate"], "confidence": 0.9}',
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("openai/gpt-oss-safeguard-20b", "Content");

			expect(result.categories).toEqual(["violence", "hate"]);
			expect(result.categories).not.toContain("invalid_category");
		});
	});

	// LlamaGuard moderation tests
	describe("LlamaGuard moderation", () => {
		it("routes to LlamaGuard for llama-guard model names", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [{ message: { content: "safe" } }],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Content");

			expect(result.safe).toBe(true);
			expect(result.confidence).toBe(1.0);
		});

		it("parses safe response → safe:true, confidence:1.0", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [{ message: { content: "safe" } }],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Hello world");

			expect(result.safe).toBe(true);
			expect(result.confidence).toBe(1.0);
		});

		it("parses unsafe response with S-codes → safe:false, categories mapped", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "unsafe\nS1,S3",
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Violent content");

			expect(result.safe).toBe(false);
			expect(result.categories).toContain("violence"); // S1
			expect(result.categories).toContain("sexual"); // S3
			expect(result.confidence).toBe(0.85);
		});

		it("maps all S-codes to Grove categories correctly", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "unsafe\nS1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12,S13",
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Content");

			expect(result.safe).toBe(false);
			expect(result.categories).toContain("violence"); // S1
			expect(result.categories).toContain("illegal"); // S2, S4, S8
			expect(result.categories).toContain("sexual"); // S3, S12
			expect(result.categories).toContain("harassment"); // S5, S7
			expect(result.categories).toContain("dangerous"); // S6, S9, S13
			expect(result.categories).toContain("hate"); // S10
			expect(result.categories).toContain("self_harm"); // S11
		});

		it("handles response with no category line", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "unsafe",
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Content");

			expect(result.safe).toBe(false);
			expect(result.categories).toEqual([]);
			expect(result.confidence).toBe(0.85);
		});

		it("is case-insensitive for safe/unsafe", async () => {
			const provider = new OpenRouterProvider("test-key");

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "SAFE",
							},
						},
					],
					usage: { prompt_tokens: 10, completion_tokens: 5 },
				}),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await provider.moderate("meta/llama-guard-3-8b", "Content");

			expect(result.safe).toBe(true);
		});
	});
});

// =============================================================================
// HEALTH CHECK TESTS
// =============================================================================

describe("healthCheck()", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("returns true on 200 response", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			status: 200,
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.healthCheck();

		expect(result).toBe(true);
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://openrouter.ai/api/v1/auth/key",
			expect.objectContaining({
				headers: { Authorization: "Bearer test-key" },
			}),
		);
	});

	it("returns false on error response", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: false,
			status: 401,
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.healthCheck();

		expect(result).toBe(false);
	});

	it("returns false on network error", async () => {
		const provider = new OpenRouterProvider("test-key");

		(globalThis.fetch as any).mockRejectedValue(new Error("Network error"));

		const result = await provider.healthCheck();

		expect(result).toBe(false);
	});
});

// =============================================================================
// FORMAT MESSAGES TESTS (via inference)
// =============================================================================

describe("formatMessages (via inference)", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("passes string content through unchanged", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "Hi there" },
		];

		await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);

		expect(body.messages[0]).toEqual({ role: "user", content: "Hello" });
		expect(body.messages[1]).toEqual({ role: "assistant", content: "Hi there" });
	});

	it("handles multimodal content with text and image parts", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Image analyzed" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{
				role: "user",
				content: [
					{ type: "text", text: "What's in this image?" },
					{
						type: "image_url",
						image_url: { url: "data:image/png;base64,..." },
					},
				],
			},
		];

		await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);

		expect(Array.isArray(body.messages[0].content)).toBe(true);
		expect(body.messages[0].content[0]).toEqual({
			type: "text",
			text: "What's in this image?",
		});
		expect(body.messages[0].content[1]).toEqual({
			type: "image_url",
			image_url: {
				url: "data:image/png;base64,...",
				detail: "auto",
			},
		});
	});

	it("applies default detail:auto for image parts without detail", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{
				role: "user",
				content: [
					{
						type: "image_url",
						image_url: { url: "http://example.com/image.jpg" },
					},
				],
			},
		];

		await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);

		expect(body.messages[0].content[0].image_url.detail).toBe("auto");
	});

	it("preserves custom detail level for images", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				usage: { prompt_tokens: 10, completion_tokens: 5 },
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{
				role: "user",
				content: [
					{
						type: "image_url",
						image_url: { url: "http://example.com/image.jpg", detail: "high" },
					},
				],
			},
		];

		await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		const callArgs = (globalThis.fetch as any).mock.calls[0];
		const body = JSON.parse(callArgs[1].body);

		expect(body.messages[0].content[0].image_url.detail).toBe("high");
	});
});

// =============================================================================
// ESTIMATE TOKENS TESTS (via inference fallback)
// =============================================================================

describe("estimateTokens (via inference fallback)", () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	it("estimates tokens from string content (chars/4)", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Response" } }],
				// No usage field to trigger estimation
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{ role: "user", content: "a".repeat(100) }, // 100 chars = 25 tokens
		];

		const result = await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		// Input: 100 chars / 4 = 25 tokens
		// Output: "Response" = 8 chars / 4 = 2 tokens
		expect(result.usage.input).toBe(25);
		expect(result.usage.output).toBe(2);
	});

	it("estimates tokens from multimodal content (text parts only)", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "Analyzed" } }],
				// No usage field
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const messages: LumenMessage[] = [
			{
				role: "user",
				content: [
					{ type: "text", text: "a".repeat(100) }, // 100 chars
					{
						type: "image_url",
						image_url: { url: "http://example.com/image.jpg" },
					},
					{ type: "text", text: "b".repeat(50) }, // 50 chars
				],
			},
		];

		const result = await provider.inference("test/model", messages, {
			maxTokens: 100,
			temperature: 0.7,
		});

		// Input: (100 + 50) / 4 = 37.5 → 38 tokens
		// Output: "Analyzed" = 8 chars / 4 = 2 tokens
		expect(result.usage.input).toBe(38);
		expect(result.usage.output).toBe(2);
	});

	it("handles empty content estimation", async () => {
		const provider = new OpenRouterProvider("test-key");

		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "" } }],
			}),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await provider.inference(
			"test/model",
			[{ role: "user", content: "" }] as LumenMessage[],
			{
				maxTokens: 100,
				temperature: 0.7,
			},
		);

		// Empty content = 0 chars / 4 = 0 tokens
		expect(result.usage.input).toBe(0);
		expect(result.usage.output).toBe(0);
	});
});
