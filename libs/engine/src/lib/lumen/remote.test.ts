/**
 * Remote Lumen Client Tests
 *
 * Tests the RemoteLumenClient which routes requests through the Lumen worker
 * via service binding or HTTPS. Validates Zod response parsing at trust
 * boundaries (Rootwork pattern).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemoteLumenClient } from "./remote.js";

// =============================================================================
// MOCK FETCH FACTORY
// =============================================================================

function createMockFetcher(responseBody: unknown, status = 200) {
	return {
		fetch: vi.fn().mockResolvedValue({
			ok: status >= 200 && status < 300,
			status,
			json: vi.fn().mockResolvedValue(responseBody),
		}),
	};
}

function successEnvelope(data: unknown, meta?: Record<string, unknown>) {
	return {
		success: true,
		data,
		meta: {
			task: "generation",
			model: "test-model",
			provider: "openrouter",
			latencyMs: 42,
			...meta,
		},
	};
}

function errorEnvelope(code: string, message: string) {
	return {
		success: false,
		error: { code, message },
	};
}

// =============================================================================
// CONSTRUCTION
// =============================================================================

describe("RemoteLumenClient", () => {
	describe("Construction", () => {
		it("should create with base URL and API key", () => {
			const client = new RemoteLumenClient({
				baseUrl: "https://lumen.grove.place",
				apiKey: "test-key",
			});

			expect(client.isEnabled()).toBe(true);
		});

		it("should strip trailing slash from base URL", () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: "hi",
					model: "m",
					provider: "p",
					usage: { input: 1, output: 1, cost: 0 },
				}),
			);

			const client = new RemoteLumenClient({
				baseUrl: "https://lumen.grove.place/",
				fetcher,
			});

			// Call run to trigger a fetch and check the URL
			client.run({ task: "generation", input: "test" }).catch(() => {});
			// The URL should not have double slashes
			expect(fetcher.fetch).toHaveBeenCalledWith(
				"https://lumen.grove.place/inference",
				expect.any(Object),
			);
		});

		it("should always report enabled", () => {
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place" });
			expect(client.isEnabled()).toBe(true);
		});
	});

	// =============================================================================
	// HEALTH CHECK
	// =============================================================================

	describe("healthCheck", () => {
		it("should return true when worker responds OK", async () => {
			const fetcher = createMockFetcher({ status: "healthy" });
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			const result = await client.healthCheck();
			expect(result).toBe(true);
		});

		it("should return false when worker is unreachable", async () => {
			const fetcher = {
				fetch: vi.fn().mockRejectedValue(new Error("Network error")),
			};
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			const result = await client.healthCheck();
			expect(result).toBe(false);
		});
	});

	// =============================================================================
	// INFERENCE
	// =============================================================================

	describe("run (inference)", () => {
		it("should send correct request format", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: "Hello!",
					model: "deepseek/v3",
					provider: "openrouter",
					usage: { input: 10, output: 5, cost: 0.001 },
					cached: false,
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			await client.run(
				{
					task: "generation",
					input: "Write a haiku",
					tenant: "tenant_123",
					options: {
						model: "deepseek/v3",
						maxTokens: 100,
						temperature: 0.7,
					},
				},
				"seedling",
			);

			expect(fetcher.fetch).toHaveBeenCalledWith(
				"https://lumen.grove.place/inference",
				expect.objectContaining({
					method: "POST",
					body: expect.any(String),
				}),
			);

			const body = JSON.parse(fetcher.fetch.mock.calls[0][1].body);
			expect(body.task).toBe("generation");
			expect(body.input).toBe("Write a haiku");
			expect(body.tenant_id).toBe("tenant_123");
			expect(body.tier).toBe("seedling");
			expect(body.options.model).toBe("deepseek/v3");
			expect(body.options.max_tokens).toBe(100);
			expect(body.options.temperature).toBe(0.7);
		});

		it("should parse valid inference response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: "Hello world!",
					model: "deepseek/v3",
					provider: "openrouter",
					usage: { input: 10, output: 5, cost: 0.001 },
					cached: false,
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.run({ task: "generation", input: "test" });

			expect(result.content).toBe("Hello world!");
			expect(result.model).toBe("deepseek/v3");
			expect(result.usage.input).toBe(10);
			expect(result.usage.output).toBe(5);
			expect(result.usage.cost).toBe(0.001);
			expect(result.cached).toBe(false);
		});

		it("should default cached to false when not present", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: "hi",
					model: "m",
					provider: "p",
					usage: { input: 1, output: 1, cost: 0 },
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.run({ task: "generation", input: "test" });
			expect(result.cached).toBe(false);
		});

		it("should throw on invalid response envelope", async () => {
			const fetcher = createMockFetcher({ garbage: true });

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow(
				"Invalid response from Lumen worker",
			);
		});

		it("should throw with error code on failure envelope", async () => {
			const fetcher = createMockFetcher(errorEnvelope("QUOTA_EXCEEDED", "Limit reached"));

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow(
				"Limit reached",
			);

			try {
				await client.run({ task: "generation", input: "test" });
			} catch (err) {
				expect((err as { code: string }).code).toBe("QUOTA_EXCEEDED");
			}
		});

		it("should throw on invalid inference data shape", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					// Missing required fields
					content: "hi",
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow(
				"Invalid inference data",
			);
		});

		it("should include API key header when configured", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: "hi",
					model: "m",
					provider: "p",
					usage: { input: 1, output: 1, cost: 0 },
				}),
			);

			const client = new RemoteLumenClient({
				baseUrl: "https://lumen.grove.place",
				apiKey: "my-secret-key",
				fetcher,
			});
			await client.run({ task: "generation", input: "test" });

			const headers = fetcher.fetch.mock.calls[0][1].headers;
			expect(headers["X-API-Key"]).toBe("my-secret-key");
		});
	});

	// =============================================================================
	// EMBED
	// =============================================================================

	describe("embed", () => {
		it("should parse valid embed response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					embeddings: [[0.1, 0.2, 0.3]],
					model: "@cf/bge-small",
					usage: { tokens: 5 },
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.embed({ input: "test text", tenant: "t" });

			expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
			expect(result.model).toBe("@cf/bge-small");
			expect(result.tokens).toBe(5);
		});

		it("should handle missing usage in embed response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					embeddings: [[0.1]],
					model: "@cf/bge-small",
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.embed({ input: "test", tenant: "t" });

			expect(result.tokens).toBe(0);
		});
	});

	// =============================================================================
	// MODERATE
	// =============================================================================

	describe("moderate", () => {
		it("should parse valid moderation response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					safe: true,
					categories: [],
					confidence: 0.99,
					model: "test-mod",
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.moderate({ content: "hello world", tenant: "t" });

			expect(result.safe).toBe(true);
			expect(result.categories).toEqual([]);
			expect(result.confidence).toBe(0.99);
		});

		it("should detect unsafe content from response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					safe: false,
					categories: ["hate", "violence"],
					confidence: 0.95,
					model: "test-mod",
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.moderate({ content: "bad content", tenant: "t" });

			expect(result.safe).toBe(false);
			expect(result.categories).toContain("hate");
			expect(result.categories).toContain("violence");
		});
	});

	// =============================================================================
	// TRANSCRIBE
	// =============================================================================

	describe("transcribe", () => {
		it("should parse valid transcription response", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					text: "Hello world",
					wordCount: 2,
					duration: 1.5,
					model: "whisper-v3",
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.transcribe({
				audio: "base64audio",
				tenant: "t",
			});

			expect(result.text).toBe("Hello world");
			expect(result.wordCount).toBe(2);
			expect(result.duration).toBe(1.5);
			expect(result.model).toBe("whisper-v3");
		});

		it("should handle transcription with gutter content", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					text: "Hello world",
					wordCount: 2,
					duration: 1.5,
					model: "whisper-v3",
					gutterContent: [
						{ type: "vine", content: "Note: clear audio", anchor: "0:00" },
					],
				}),
			);

			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });
			const result = await client.transcribe({
				audio: "base64audio",
				tenant: "t",
			});

			expect(result.gutterContent).toHaveLength(1);
			expect(result.gutterContent?.[0].content).toBe("Note: clear audio");
		});
	});

	// =============================================================================
	// TRUST BOUNDARY VALIDATION
	// =============================================================================

	describe("Trust boundary (Rootwork)", () => {
		it("should reject envelope with missing success field", async () => {
			const fetcher = createMockFetcher({ data: { content: "hi" } });
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow(
				"Invalid response from Lumen worker",
			);
		});

		it("should reject malformed error envelope", async () => {
			const fetcher = createMockFetcher({
				success: false,
				error: { code: 123, message: true }, // wrong types
			});
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow();
		});

		it("should reject inference data with wrong types", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					content: 42, // should be string
					model: "m",
					provider: "p",
					usage: { input: 1, output: 1, cost: 0 },
				}),
			);
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			await expect(client.run({ task: "generation", input: "test" })).rejects.toThrow(
				"Invalid inference data",
			);
		});

		it("should reject embed data with wrong embedding format", async () => {
			const fetcher = createMockFetcher(
				successEnvelope({
					embeddings: "not an array",
					model: "m",
				}),
			);
			const client = new RemoteLumenClient({ baseUrl: "https://lumen.grove.place", fetcher });

			await expect(client.embed({ input: "test", tenant: "t" })).rejects.toThrow(
				"Invalid embed data",
			);
		});
	});
});
