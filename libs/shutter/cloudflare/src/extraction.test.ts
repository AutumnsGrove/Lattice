import { describe, it, expect, vi, beforeEach } from "vitest";
import { getModelForTier, buildExtractionPrompt, extractContent } from "./extraction";

describe("extraction module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// getModelForTier Tests (5)
	// ============================================================================

	describe("getModelForTier", () => {
		it("returns fast tier model", () => {
			const result = getModelForTier("fast");
			expect(result).toBe("openai/gpt-oss-120b");
		});

		it("returns accurate tier model", () => {
			const result = getModelForTier("accurate");
			expect(result).toBe("deepseek/deepseek-v3.2");
		});

		it("returns research tier model", () => {
			const result = getModelForTier("research");
			expect(result).toBe("alibaba/tongyi-deepresearch-30b-a3b");
		});

		it("returns code tier model", () => {
			const result = getModelForTier("code");
			expect(result).toBe("minimax/minimax-m2.1");
		});

		it("falls back to fast model for unknown tier", () => {
			const result = getModelForTier("unknown-tier");
			expect(result).toBe("openai/gpt-oss-120b");
		});
	});

	// ============================================================================
	// buildExtractionPrompt Tests (3)
	// ============================================================================

	describe("buildExtractionPrompt", () => {
		it("includes content and query in basic prompt", () => {
			const prompt = buildExtractionPrompt("Page content here", "What is the title?");
			expect(prompt).toContain("Page content here");
			expect(prompt).toContain("What is the title?");
			expect(prompt).toContain("Web page content:");
		});

		it("appends extended query when provided", () => {
			const prompt = buildExtractionPrompt(
				"Page content",
				"Extract title",
				"Focus on main heading",
			);
			expect(prompt).toContain("Additional extraction guidance:");
			expect(prompt).toContain("Focus on main heading");
		});

		it("excludes extended guidance section when not provided", () => {
			const prompt = buildExtractionPrompt("Page content", "Extract title");
			expect(prompt).not.toContain("Additional extraction guidance:");
		});
	});

	// ============================================================================
	// extractContent Tests (7)
	// ============================================================================

	describe("extractContent", () => {
		it("returns ExtractionResult with extracted content", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content: "The extracted information",
								},
							},
						],
						usage: {
							prompt_tokens: 150,
							completion_tokens: 25,
						},
					}),
				),
			);
			global.fetch = mockFetch;

			const result = await extractContent("Page content goes here", "Extract something", "api-key");
			expect(result.extracted).toBe("The extracted information");
			expect(result.tokensInput).toBe(150);
			expect(result.tokensOutput).toBe(25);
		});

		it("throws Error on non-200 API response", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
				);
			global.fetch = mockFetch;

			await expect(extractContent("Page content", "Extract", "api-key")).rejects.toThrow();
		});

		it("throws Error on empty response", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [
							{
								message: {
									content: "",
								},
							},
						],
						usage: { prompt_tokens: 100, completion_tokens: 0 },
					}),
				),
			);
			global.fetch = mockFetch;

			await expect(extractContent("Page content", "Extract", "api-key")).rejects.toThrow(
				"empty response",
			);
		});

		it("uses correct model for tier", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [{ message: { content: "result" } }],
						usage: { prompt_tokens: 100, completion_tokens: 20 },
					}),
				),
			);
			global.fetch = mockFetch;

			await extractContent("content", "query", "api-key", "accurate");
			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.model).toBe("deepseek/deepseek-v3.2");
		});

		it("sets temperature to 0", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [{ message: { content: "result" } }],
						usage: { prompt_tokens: 100, completion_tokens: 20 },
					}),
				),
			);
			global.fetch = mockFetch;

			await extractContent("content", "query", "api-key");
			const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
			expect(callBody.temperature).toBe(0);
		});

		it("uses Authorization header with Bearer token", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [{ message: { content: "result" } }],
						usage: { prompt_tokens: 100, completion_tokens: 20 },
					}),
				),
			);
			global.fetch = mockFetch;

			await extractContent("content", "query", "test-api-key");
			const headers = mockFetch.mock.calls[0][1].headers;
			expect(headers.Authorization).toBe("Bearer test-api-key");
		});

		it("falls back to prompt length / 4 when usage missing", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						choices: [{ message: { content: "result" } }],
						// No usage field
					}),
				),
			);
			global.fetch = mockFetch;

			const result = await extractContent("content", "query", "api-key");
			// Prompt will be built from content and query
			expect(result.tokensInput).toBeGreaterThan(0);
			expect(result.tokensOutput).toBe(0);
		});
	});
});
