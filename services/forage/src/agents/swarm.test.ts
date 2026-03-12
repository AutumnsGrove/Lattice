/**
 * Swarm Agent Tests
 *
 * Tests quickEvaluate heuristics, filterWorthChecking, rankEvaluations,
 * and the evaluateDomains orchestrator.
 */

import { describe, it, expect, vi } from "vitest";
import {
	quickEvaluate,
	filterWorthChecking,
	rankEvaluations,
	evaluateDomains,
	type DomainEvaluation,
	type SwarmOptions,
} from "./swarm";
import type { AIProvider, ProviderResponse } from "../providers/types";

// =============================================================================
// quickEvaluate (pure heuristic scoring)
// =============================================================================

describe("quickEvaluate", () => {
	describe("length scoring", () => {
		it("should score short names (≤8 chars) highest", () => {
			const result = quickEvaluate("sunrise.com");
			// "sunrise" = 7 chars → length score = 1.0
			expect(result.score).toBeGreaterThan(0.8);
		});

		it("should penalize long names progressively", () => {
			// Use same TLD and avoid consonant clusters to isolate the length effect
			const short = quickEvaluate("luna.com"); // 4 chars → length 1.0
			const medium = quickEvaluate("lunabakeries.com"); // 12 chars → length 0.6
			const long = quickEvaluate("lunabakerieonline.com"); // 17 chars → length 0.3

			expect(short.score).toBeGreaterThan(medium.score);
			expect(medium.score).toBeGreaterThan(long.score);
		});
	});

	describe("TLD scoring", () => {
		it("should give .com the highest TLD score", () => {
			const com = quickEvaluate("test.com");
			const xyz = quickEvaluate("test.xyz");

			expect(com.score).toBeGreaterThan(xyz.score);
		});

		it("should recognize tech TLDs (.io, .dev, .app)", () => {
			const io = quickEvaluate("myapp.io");
			const dev = quickEvaluate("myapp.dev");
			const app = quickEvaluate("myapp.app");

			// All tech TLDs should score reasonably well
			expect(io.score).toBeGreaterThan(0.7);
			expect(dev.score).toBeGreaterThan(0.7);
			expect(app.score).toBeGreaterThan(0.7);
		});

		it("should recognize nature TLDs (.garden, .earth, .place)", () => {
			const garden = quickEvaluate("grove.garden");
			const earth = quickEvaluate("grove.earth");
			const place = quickEvaluate("grove.place");

			expect(garden.score).toBeGreaterThan(0.5);
			expect(earth.score).toBeGreaterThan(0.5);
			expect(place.score).toBeGreaterThan(0.5);
		});

		it("should give unknown TLDs a default score of 0.5", () => {
			const result = quickEvaluate("test.zzz");
			// TLD score = 0.5, length score = 1.0 → avg ≈ 0.75
			expect(result.notes).toContain("tld=.zzz");
		});
	});

	describe("pronounceability detection", () => {
		it("should flag consonant clusters of 4+", () => {
			const result = quickEvaluate("xnrths.com");
			expect(result.pronounceable).toBe(false);
			expect(result.flags).toContain("hard to pronounce");
		});

		it("should not flag normal words", () => {
			const result = quickEvaluate("sunrise.com");
			expect(result.pronounceable).toBe(true);
		});

		it("should penalize score for unpronounceable names", () => {
			const good = quickEvaluate("sunrise.com");
			const bad = quickEvaluate("xnrths.com");
			expect(good.score).toBeGreaterThan(bad.score);
		});
	});

	describe("number and hyphen penalties", () => {
		it("should flag domains with numbers", () => {
			const result = quickEvaluate("site123.com");
			expect(result.flags).toContain("contains numbers");
			expect(result.emailFriendly).toBe(false);
		});

		it("should flag domains with hyphens", () => {
			const result = quickEvaluate("my-site.com");
			expect(result.flags).toContain("contains hyphens");
			expect(result.emailFriendly).toBe(false);
		});

		it("should mark clean domains as email-friendly", () => {
			const result = quickEvaluate("sunrise.com");
			expect(result.emailFriendly).toBe(true);
		});

		it("should penalize score for numbers", () => {
			const clean = quickEvaluate("sunrise.com");
			const numbered = quickEvaluate("sunrise1.com");
			expect(clean.score).toBeGreaterThan(numbered.score);
		});
	});

	describe("memorability", () => {
		it("should mark short names (≤12) as memorable", () => {
			expect(quickEvaluate("sunrise.com").memorable).toBe(true);
			expect(quickEvaluate("shortname.io").memorable).toBe(true);
		});

		it("should mark long names (>12) as not memorable", () => {
			expect(quickEvaluate("averylongdomainname.com").memorable).toBe(false);
		});
	});

	describe("worthChecking threshold", () => {
		it("should mark high-scoring domains as worth checking", () => {
			expect(quickEvaluate("sunrise.com").worthChecking).toBe(true);
		});

		it("should mark very low-scoring domains as not worth checking", () => {
			// Long, unpronounceable, bad TLD, has numbers
			const result = quickEvaluate("xnrthsblrmp123.zzz");
			expect(result.worthChecking).toBe(false);
		});
	});

	describe("output structure", () => {
		it("should include notes with length and TLD info", () => {
			const result = quickEvaluate("sunrise.com");
			expect(result.notes).toBe("Quick eval: length=7, tld=.com");
		});

		it("should round score to 2 decimal places", () => {
			const result = quickEvaluate("test.com");
			const decimalPlaces = (result.score.toString().split(".")[1] || "").length;
			expect(decimalPlaces).toBeLessThanOrEqual(2);
		});
	});
});

// =============================================================================
// filterWorthChecking
// =============================================================================

describe("filterWorthChecking", () => {
	const evaluations: DomainEvaluation[] = [
		{ ...quickEvaluate("great.com"), score: 0.95, worthChecking: true },
		{ ...quickEvaluate("good.io"), score: 0.85, worthChecking: true },
		{ ...quickEvaluate("meh.xyz"), score: 0.5, worthChecking: true },
		{ ...quickEvaluate("bad.zzz"), score: 0.3, worthChecking: false },
	];

	it("should filter by worthChecking AND minScore", () => {
		const result = filterWorthChecking(evaluations, 0.8);
		expect(result).toHaveLength(2);
	});

	it("should exclude domains where worthChecking is false even if score is high", () => {
		const tweaked = [{ ...evaluations[0], worthChecking: false, score: 0.99 }];
		const result = filterWorthChecking(tweaked, 0.5);
		expect(result).toHaveLength(0);
	});

	it("should use 0.8 as default minScore", () => {
		const result = filterWorthChecking(evaluations);
		expect(result).toHaveLength(2);
	});
});

// =============================================================================
// rankEvaluations
// =============================================================================

describe("rankEvaluations", () => {
	it("should sort by score descending", () => {
		const evals: DomainEvaluation[] = [
			{ ...quickEvaluate("low.com"), score: 0.3 },
			{ ...quickEvaluate("high.com"), score: 0.9 },
			{ ...quickEvaluate("mid.com"), score: 0.6 },
		];

		const ranked = rankEvaluations(evals);
		expect(ranked[0].score).toBe(0.9);
		expect(ranked[1].score).toBe(0.6);
		expect(ranked[2].score).toBe(0.3);
	});

	it("should not mutate the original array", () => {
		const original: DomainEvaluation[] = [
			{ ...quickEvaluate("low.com"), score: 0.3 },
			{ ...quickEvaluate("high.com"), score: 0.9 },
		];

		const ranked = rankEvaluations(original);
		expect(original[0].score).toBe(0.3); // Unchanged
		expect(ranked[0].score).toBe(0.9);
	});
});

// =============================================================================
// evaluateDomains (orchestrator)
// =============================================================================

describe("evaluateDomains", () => {
	function mockProvider(overrides: Partial<AIProvider> = {}): AIProvider {
		return {
			name: "test",
			defaultModel: "test-model",
			supportsTools: false,
			generate: vi.fn(
				async (): Promise<ProviderResponse> => ({
					content: JSON.stringify({
						evaluations: [
							{
								domain: "example.com",
								score: 0.8,
								worth_checking: true,
								pronounceable: true,
								memorable: true,
								brand_fit: true,
								email_friendly: true,
								flags: [],
								notes: "Good domain",
							},
						],
					}),
					model: "test",
					provider: "test",
					usage: { inputTokens: 100, outputTokens: 50 },
					toolCalls: [],
				}),
			),
			generateWithTools: vi.fn(),
			...overrides,
		};
	}

	it("should return empty results for empty domain list", async () => {
		const provider = mockProvider();
		const result = await evaluateDomains(provider, {
			domains: [],
			vibe: "modern",
			businessName: "Test",
		});

		expect(result.evaluations).toHaveLength(0);
		expect(result.inputTokens).toBe(0);
		expect(result.outputTokens).toBe(0);
	});

	it("should evaluate domains and track token usage", async () => {
		const provider = mockProvider();
		const result = await evaluateDomains(provider, {
			domains: ["example.com"],
			vibe: "modern",
			businessName: "Test",
		});

		expect(result.evaluations).toHaveLength(1);
		expect(result.evaluations[0].domain).toBe("example.com");
		expect(result.inputTokens).toBe(100);
		expect(result.outputTokens).toBe(50);
	});

	it("should chunk domains by chunkSize", async () => {
		const generateFn = vi.fn(async () => ({
			content: JSON.stringify({ evaluations: [] }),
			model: "test",
			provider: "test",
			usage: { inputTokens: 50, outputTokens: 25 },
			toolCalls: [],
		}));

		const provider = mockProvider({ generate: generateFn });
		const domains = Array.from({ length: 25 }, (_, i) => `domain${i}.com`);

		await evaluateDomains(provider, {
			domains,
			vibe: "modern",
			businessName: "Test",
			chunkSize: 10,
		});

		// 25 domains / 10 per chunk = 3 chunks
		expect(generateFn).toHaveBeenCalledTimes(3);
	});

	it("should propagate AI errors when generate throws", async () => {
		// NOTE: evaluateChunk uses `return evaluateChunkFallback(...)` without
		// `await`, so the rejection escapes the outer try/catch — the
		// quickEvaluate fallback at lines 142-150 is unreachable for this path.
		// This is a known bug (missing `await` on return).
		const provider = mockProvider({
			supportsTools: false,
			generate: vi.fn().mockRejectedValue(new Error("AI unavailable")),
		});

		vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(
			evaluateDomains(provider, {
				domains: ["fallback.com"],
				vibe: "modern",
				businessName: "Test",
			}),
		).rejects.toThrow("AI unavailable");
	});

	it("should fill in missing domains with quickEvaluate", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: JSON.stringify({
					evaluations: [{ domain: "only-one.com", score: 0.9, worth_checking: true }],
				}),
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const result = await evaluateDomains(provider, {
			domains: ["only-one.com", "missing.com", "also-missing.io"],
			vibe: "modern",
			businessName: "Test",
			chunkSize: 10,
		});

		expect(result.evaluations).toHaveLength(3);
		// Missing domains get quickEvaluate
		const missing = result.evaluations.find((e) => e.domain === "missing.com");
		expect(missing?.notes).toContain("Quick eval");
	});

	it("should use tool calling when provider supports it", async () => {
		const generateWithToolsFn = vi.fn(async () => ({
			content: "",
			model: "test",
			provider: "test",
			usage: { inputTokens: 200, outputTokens: 100 },
			toolCalls: [
				{
					toolName: "evaluate_domains",
					arguments: {
						evaluations: [
							{
								domain: "tooled.com",
								score: 0.9,
								worth_checking: true,
								pronounceable: true,
								memorable: true,
								brand_fit: true,
								email_friendly: true,
								flags: [],
								notes: "Tool eval",
							},
						],
					},
				},
			],
		}));

		const provider = mockProvider({
			supportsTools: true,
			generateWithTools: generateWithToolsFn,
		});

		const result = await evaluateDomains(provider, {
			domains: ["tooled.com"],
			vibe: "modern",
			businessName: "Test",
		});

		expect(generateWithToolsFn).toHaveBeenCalled();
		expect(result.evaluations[0].domain).toBe("tooled.com");
		expect(result.evaluations[0].score).toBe(0.9);
	});

	it("should accumulate tokens across chunks", async () => {
		const provider = mockProvider({
			generate: vi.fn(async () => ({
				content: JSON.stringify({ evaluations: [] }),
				model: "test",
				provider: "test",
				usage: { inputTokens: 100, outputTokens: 50 },
				toolCalls: [],
			})),
		});

		const domains = Array.from({ length: 30 }, (_, i) => `d${i}.com`);
		const result = await evaluateDomains(provider, {
			domains,
			vibe: "modern",
			businessName: "Test",
			chunkSize: 10,
		});

		// 3 chunks × 100 input tokens each
		expect(result.inputTokens).toBe(300);
		expect(result.outputTokens).toBe(150);
	});
});
