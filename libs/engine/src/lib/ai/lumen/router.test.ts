/**
 * Lumen Router Tests
 *
 * Tests task routing and fallback chain behavior.
 * These tests ensure reliability when providers fail.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeTask, executeWithFallback, executeEmbedding, executeModeration } from "./router.js";
import { getTaskConfig, MODELS } from "./config.js";
import { AllProvidersFailedError, ProviderError } from "./errors.js";
import type { ProviderRegistry, LumenProvider } from "./providers/index.js";

// =============================================================================
// MOCK PROVIDER FACTORY
// =============================================================================

function createMockProvider(
	name: string,
	options: {
		shouldFail?: boolean;
		failMessage?: string;
		hasEmbed?: boolean;
		hasModerate?: boolean;
	} = {},
): LumenProvider {
	return {
		name: name as any,
		inference: vi.fn().mockImplementation(async () => {
			if (options.shouldFail) {
				throw new ProviderError(name as any, options.failMessage ?? "Mock failure");
			}
			return {
				content: `Response from ${name}`,
				usage: { input: 100, output: 50, cost: 0.001 },
				model: "test-model",
				raw: {},
			};
		}),
		stream: vi.fn(),
		embed: options.hasEmbed
			? vi.fn().mockImplementation(async () => {
					if (options.shouldFail) {
						throw new ProviderError(name as any, options.failMessage ?? "Mock failure");
					}
					return { embeddings: [[0.1, 0.2, 0.3]], tokens: 10 };
				})
			: undefined,
		moderate: options.hasModerate
			? vi.fn().mockImplementation(async () => {
					if (options.shouldFail) {
						throw new ProviderError(name as any, options.failMessage ?? "Mock failure");
					}
					return { safe: true, categories: [], confidence: 1.0 };
				})
			: undefined,
	};
}

// =============================================================================
// TASK ROUTING
// =============================================================================

describe("Task Routing", () => {
	describe("routeTask - Provider Selection", () => {
		it("should select primary provider when available", () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter"),
				"cloudflare-ai": createMockProvider("cloudflare-ai"),
			};

			const result = routeTask("generation", providers);

			expect(result.provider).toBe("openrouter");
			expect(result.model).toBe(MODELS.DEEPSEEK_V4_1_FLASH);
		});

		it("should use first available fallback when primary unavailable", () => {
			const providers: ProviderRegistry = {
				// No openrouter, only cloudflare-ai
				"cloudflare-ai": createMockProvider("cloudflare-ai"),
			};

			// Transcription is CF-primary, so it resolves without OpenRouter
			const result = routeTask("transcription", providers);

			expect(result.provider).toBe("cloudflare-ai");
		});

		it("should throw when moderation has no OpenRouter provider", () => {
			const providers: ProviderRegistry = {
				// Moderation cascade is all-OpenRouter, so CF-only won't help
				"cloudflare-ai": createMockProvider("cloudflare-ai"),
			};

			expect(() => routeTask("moderation", providers)).toThrow("No providers available");
		});

		it("should throw when no providers are available", () => {
			const providers: ProviderRegistry = {};

			expect(() => routeTask("generation", providers)).toThrow("No providers available");
		});

		it("should respect model override", () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter"),
			};

			const result = routeTask("generation", providers, "custom/model");

			expect(result.model).toBe("custom/model");
			expect(result.provider).toBe("openrouter");
		});
	});

	describe("routeTask - All Task Types", () => {
		it("should route all task types correctly", () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter"),
				"cloudflare-ai": createMockProvider("cloudflare-ai"),
			};

			const tasks = [
				"generation",
				"summary",
				"chat",
				"image",
				"code",
				"moderation",
				"embedding",
			] as const;

			for (const task of tasks) {
				const result = routeTask(task, providers);
				const config = getTaskConfig(task);

				expect(result.provider).toBe(config.primaryProvider);
				expect(result.model).toBe(config.primaryModel);
			}
		});
	});
});

// =============================================================================
// FALLBACK EXECUTION
// =============================================================================

describe("Fallback Execution", () => {
	describe("executeWithFallback - Success Paths", () => {
		it("should succeed with primary provider", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter"),
				"cloudflare-ai": createMockProvider("cloudflare-ai"),
			};

			const result = await executeWithFallback(
				"generation",
				[{ role: "user", content: "Hello" }],
				providers,
			);

			expect(result.provider).toBe("openrouter");
			expect(result.response.content).toContain("openrouter");
		});

		it("should apply custom options", async () => {
			const mockProvider = createMockProvider("openrouter");
			const providers: ProviderRegistry = { openrouter: mockProvider };

			await executeWithFallback("generation", [{ role: "user", content: "Hello" }], providers, {
				maxTokens: 500,
				temperature: 0.5,
			});

			expect(mockProvider.inference).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Array),
				expect.objectContaining({
					maxTokens: 500,
					temperature: 0.5,
				}),
			);
		});
	});

	describe("executeWithFallback - Fallback Behavior", () => {
		it("should try both embedding models when the provider fails", async () => {
			// Embedding cascade is all-OpenRouter (Perplexity → BGE-M3)
			const failingOpenRouter = createMockProvider("openrouter", {
				shouldFail: true,
				failMessage: "OpenRouter down",
			});

			const providers: ProviderRegistry = { openrouter: failingOpenRouter };

			await expect(
				executeWithFallback("embedding", [{ role: "user", content: "Test" }], providers),
			).rejects.toThrow(AllProvidersFailedError);

			// Primary + one fallback
			expect(failingOpenRouter.inference).toHaveBeenCalledTimes(2);
		});

		it("should try all models in all-OpenRouter cascade", async () => {
			// Moderation cascade is all-OpenRouter:
			// GPT-oss Safeguard → LlamaGuard 4 → DeepSeek V3.2
			// When the provider itself fails, all three attempts fail
			const failingOpenRouter = createMockProvider("openrouter", {
				shouldFail: true,
			});

			const providers: ProviderRegistry = {
				openrouter: failingOpenRouter,
			};

			await expect(
				executeWithFallback("moderation", [{ role: "user", content: "Test" }], providers),
			).rejects.toThrow(AllProvidersFailedError);

			// Should have tried all 3 models in the cascade (primary + 2 fallbacks)
			expect(failingOpenRouter.inference).toHaveBeenCalledTimes(3);
		});

		it("should throw AllProvidersFailedError when all fail", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", {
					shouldFail: true,
					failMessage: "OR error",
				}),
			};

			await expect(
				executeWithFallback("moderation", [{ role: "user", content: "Test" }], providers),
			).rejects.toThrow(AllProvidersFailedError);
		});

		it("should include all attempts in AllProvidersFailedError", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", {
					shouldFail: true,
					failMessage: "OR error",
				}),
			};

			try {
				await executeWithFallback("moderation", [{ role: "user", content: "Test" }], providers);
				expect.fail("Should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(AllProvidersFailedError);
				const error = err as AllProvidersFailedError;
				// All 3 models in the cascade attempted through OpenRouter
				expect(error.attempts.length).toBe(3);
				expect(error.attempts.every((a) => a.provider === "openrouter")).toBe(true);
			}
		});
	});
});

// =============================================================================
// SPECIALIZED EXECUTION
// =============================================================================

describe("Specialized Execution", () => {
	describe("executeEmbedding - Fallback Chain", () => {
		it("should use primary embedding provider", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", { hasEmbed: true }),
				"cloudflare-ai": createMockProvider("cloudflare-ai", {
					hasEmbed: true,
				}),
			};

			const result = await executeEmbedding("test text", providers);

			expect(result.provider).toBe("openrouter");
			expect(result.embeddings).toBeDefined();
		});

		it("should fall back from Perplexity to BGE-M3", async () => {
			const embed = vi
				.fn()
				.mockRejectedValueOnce(new ProviderError("openrouter", "PPLX down"))
				.mockResolvedValueOnce({ embeddings: [[0.1, 0.2, 0.3]], tokens: 10 });

			const providers: ProviderRegistry = {
				openrouter: { ...createMockProvider("openrouter"), embed },
			};

			const result = await executeEmbedding("test text", providers);

			expect(result.model).toBe(MODELS.BGE_M3);
			expect(embed).toHaveBeenCalledTimes(2);
		});

		it("should throw when no provider has an embed method", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", { hasEmbed: false }),
			};

			await expect(executeEmbedding("test text", providers)).rejects.toThrow(
				AllProvidersFailedError,
			);
		});

		it("should handle array input", async () => {
			const mockProvider = createMockProvider("openrouter", { hasEmbed: true });
			const providers: ProviderRegistry = { openrouter: mockProvider };

			await executeEmbedding(["text 1", "text 2"], providers);

			expect(mockProvider.embed).toHaveBeenCalledWith(expect.any(String), ["text 1", "text 2"]);
		});
	});

	describe("executeModeration - Fallback Chain", () => {
		it("should use primary moderation provider", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", { hasModerate: true }),
			};

			const result = await executeModeration("test content", providers);

			expect(result.provider).toBe("openrouter");
			expect(result.safe).toBe(true);
		});

		it("should try all cascade models when provider fails", async () => {
			// All moderation models route through OpenRouter
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", {
					hasModerate: true,
					shouldFail: true,
				}),
			};

			await expect(executeModeration("test content", providers)).rejects.toThrow(
				AllProvidersFailedError,
			);
		});

		it("should skip providers without moderate method", async () => {
			const providers: ProviderRegistry = {
				openrouter: createMockProvider("openrouter", { hasModerate: false }),
				"cloudflare-ai": createMockProvider("cloudflare-ai", {
					hasModerate: true,
				}),
			};

			// OpenRouter skipped (no moderate), CF not in moderation cascade
			await expect(executeModeration("test content", providers)).rejects.toThrow(
				AllProvidersFailedError,
			);
		});

		it("should respect model override", async () => {
			const mockProvider = createMockProvider("openrouter", {
				hasModerate: true,
			});
			const providers: ProviderRegistry = { openrouter: mockProvider };

			await executeModeration("test", providers, "custom/guard-model");

			expect(mockProvider.moderate).toHaveBeenCalledWith("custom/guard-model", "test");
		});
	});
});

// =============================================================================
// MAX_TOKENS REJECTION
// =============================================================================

/**
 * Models have very different maximum completion lengths. A caller asking for a
 * generous ceiling (the timeline summary asks for 64k) must not lose the call to
 * a provider that refuses `max_tokens` above its model's limit — and on the
 * timeline path there is no fallback to catch it, because the caller named a
 * model explicitly.
 */
describe("executeWithFallback - models that cannot fit the request (#1707)", () => {
	const messages = [{ role: "user" as const, content: "Hello" }];

	it("skips a candidate whose completion ceiling is too small instead of sending it", async () => {
		// `generation`'s chain is DeepSeek V4.1 Flash → V4 Pro → GPT-OSS 120B, and
		// GPT-OSS 120B tops out at 117,964 completion tokens. A caller asking for
		// more than the primary and first fallback can serve must not cost a 400
		// per link just to find that out.
		const failing = vi
			.fn()
			.mockRejectedValue(new ProviderError("openrouter", "provider is down", 503));
		const providers: ProviderRegistry = {
			openrouter: { inference: failing } as unknown as LumenProvider,
		};

		await expect(
			executeWithFallback("generation", messages, providers, { maxTokens: 900_000 }),
		).rejects.toMatchObject({
			attempts: expect.arrayContaining([
				expect.objectContaining({
					error: expect.stringContaining("completion limit"),
				}),
			]),
		});
	});

	it("still sends a request the chain can serve", async () => {
		const mockProvider = createMockProvider("openrouter");
		const providers: ProviderRegistry = { openrouter: mockProvider };

		await executeWithFallback("generation", messages, providers, { maxTokens: 4_096 });

		expect(mockProvider.inference).toHaveBeenCalledTimes(1);
	});

	it("says when a fallback answered, so a downgrade is attributable", async () => {
		let call = 0;
		const flaky = {
			inference: vi.fn().mockImplementation(async () => {
				call += 1;
				if (call === 1) {
					throw new ProviderError("openrouter", "primary is down", 503);
				}
				return {
					content: "answered by the fallback",
					usage: { input: 10, output: 5, cost: 0 },
					model: "fallback",
				};
			}),
		} as unknown as LumenProvider;
		const providers: ProviderRegistry = { openrouter: flaky };

		const result = await executeWithFallback("generation", messages, providers);

		expect(result.usedFallback).toBe(true);
		expect(result.fallbackFrom).toBe(getTaskConfig("generation").primaryModel);
		expect(result.model).toBe(getTaskConfig("generation").fallbackChain[0].model);
	});

	it("does not call a primary answer a fallback", async () => {
		const providers: ProviderRegistry = { openrouter: createMockProvider("openrouter") };

		const result = await executeWithFallback("generation", messages, providers);

		expect(result.usedFallback).toBe(false);
		expect(result.fallbackFrom).toBeUndefined();
	});
});

describe("executeWithFallback - oversized max_tokens", () => {
	const messages = [{ role: "user" as const, content: "Hello" }];

	function rejectingProvider(message: string) {
		const inference = vi
			.fn()
			.mockRejectedValueOnce(new ProviderError("openrouter", message, 400))
			.mockResolvedValue({
				content: "retried and fine",
				usage: { input: 10, output: 5, cost: 0 },
				model: "test/model",
			});
		return { inference } as unknown as LumenProvider & {
			inference: typeof inference;
		};
	}

	it("retries the same model at the task default instead of failing", async () => {
		const provider = rejectingProvider("max_tokens is too large for this model");
		const providers: ProviderRegistry = { openrouter: provider };

		const result = await executeWithFallback("summary", messages, providers, {
			model: MODELS.DEEPSEEK_V4_1_FLASH,
			maxTokens: 64_000,
		});

		expect(result.response.content).toBe("retried and fine");
		expect(provider.inference).toHaveBeenCalledTimes(2);
		expect(provider.inference.mock.calls[1][2].maxTokens).toBe(
			getTaskConfig("summary").defaultMaxTokens,
		);
	});

	it("recognises the ways providers word it", async () => {
		for (const message of [
			"max_tokens must be less than 8192",
			"This model's maximum context length is 32768 tokens",
			"requested 64000 completion tokens, limit is 8192",
			"too many tokens requested",
		]) {
			const provider = rejectingProvider(message);
			const providers: ProviderRegistry = { openrouter: provider };
			const result = await executeWithFallback("summary", messages, providers, {
				model: MODELS.QWEN3_8_FLASH,
				maxTokens: 64_000,
			});
			expect(result.response.content, message).toBe("retried and fine");
		}
	});

	it("does not retry on an unrelated provider error", async () => {
		const inference = vi
			.fn()
			.mockRejectedValue(new ProviderError("openrouter", "upstream is down", 503));
		const providers: ProviderRegistry = {
			openrouter: { inference } as unknown as LumenProvider,
		};

		await expect(
			executeWithFallback("summary", messages, providers, {
				model: MODELS.DEEPSEEK_V4_1_FLASH,
				maxTokens: 64_000,
			}),
		).rejects.toThrow(/upstream is down/);
		expect(inference).toHaveBeenCalledTimes(1);
	});

	it("does not retry when the ceiling is already the default", async () => {
		const provider = rejectingProvider("max_tokens is too large for this model");
		const providers: ProviderRegistry = { openrouter: provider };

		await expect(
			executeWithFallback("summary", messages, providers, {
				model: MODELS.DEEPSEEK_V4_1_FLASH,
				maxTokens: getTaskConfig("summary").defaultMaxTokens,
			}),
		).rejects.toThrow(/max_tokens/);
		expect(provider.inference).toHaveBeenCalledTimes(1);
	});

	it("reports both attempts when the retry fails too", async () => {
		const inference = vi
			.fn()
			.mockRejectedValue(new ProviderError("openrouter", "max_tokens too large", 400));
		const providers: ProviderRegistry = {
			openrouter: { inference } as unknown as LumenProvider,
		};

		await expect(
			executeWithFallback("summary", messages, providers, {
				model: MODELS.DEEPSEEK_V4_1_FLASH,
				maxTokens: 64_000,
			}),
		).rejects.toThrow(/max_tokens retry/);
		expect(inference).toHaveBeenCalledTimes(2);
	});
});
