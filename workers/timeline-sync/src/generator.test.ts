/**
 * Tests for processTenantTimeline's resilience behavior
 *
 * Covers:
 * - Retry: the Lumen call gets retried on failure, not given up on immediately
 * - Retry: succeeds if a later attempt succeeds
 * - Pulse: a failed generation reports to Pulse for durable visibility
 * - Pulse: a successful generation never reports anything
 *
 * Everything upstream of the Lumen call (tokens, GitHub commits, prompt
 * building) is mocked to a fixed happy path — this file is only exercising
 * the retry/observability behavior around the Lumen call itself.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env, TenantConfig } from "./config";

const { runMock, emitPulseEventMock, flushPulseMock, initPulseMock, parseMock } = vi.hoisted(
	() => ({
		runMock: vi.fn(),
		emitPulseEventMock: vi.fn(),
		flushPulseMock: vi.fn().mockResolvedValue(undefined),
		initPulseMock: vi.fn(),
		parseMock: vi.fn(),
	}),
);

vi.mock("@autumnsgrove/lattice/ai/lumen", () => ({
	// mockImplementation needs a real (constructible) function, not an arrow
	// function, since generator.ts calls `new RemoteLumenClient(...)`.
	RemoteLumenClient: vi.fn().mockImplementation(function (this: { run: typeof runMock }) {
		this.run = runMock;
	}),
}));

vi.mock("@autumnsgrove/lattice/pulse", () => ({
	initPulse: initPulseMock,
	emitPulseEvent: emitPulseEventMock,
	flushPulse: flushPulseMock,
}));

vi.mock("@autumnsgrove/grove-crypto/secrets", () => ({
	createSecretsManager: vi.fn().mockResolvedValue({
		safeGetSecret: vi.fn().mockResolvedValue("secret-token"),
		setSecret: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock("./github", () => ({
	fetchGitHubCommits: vi.fn().mockResolvedValue([
		{
			sha: "abc123",
			repo: "test-repo",
			message: "Test commit",
			timestamp: "2026-03-11T10:00:00Z",
			additions: 5,
			deletions: 2,
		},
	]),
	fetchCommitStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./response-parser", () => ({
	parseAIResponse: parseMock,
}));

vi.mock("./voices", () => ({
	buildVoicedPrompt: vi.fn().mockReturnValue({
		systemPrompt: "system",
		userPrompt: "user",
	}),
}));

vi.mock("./context", () => ({
	getHistoricalContext: vi.fn().mockResolvedValue([]),
	detectTaskFromText: vi.fn().mockReturnValue(null),
	detectContinuation: vi.fn().mockReturnValue(null),
	formatHistoricalContextForPrompt: vi.fn().mockReturnValue(""),
	formatContinuationForPrompt: vi.fn().mockReturnValue(""),
	buildSummaryContextData: vi.fn().mockReturnValue({
		contextBrief: {},
		detectedFocus: null,
		continuationOf: null,
		focusStreak: 0,
	}),
}));

import { SUMMARY_MAX_OUTPUT_TOKENS } from "@autumnsgrove/curios/timeline/voices";
import { processTenantTimeline } from "./generator";

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
	return {
		tenantId: "tenant-1",
		githubUsername: "testuser",
		openrouterModel: "anthropic/claude-3.5-haiku",
		voicePreset: "professional",
		customSystemPrompt: null,
		customSummaryInstructions: null,
		customGutterStyle: null,
		reposInclude: null,
		reposExclude: null,
		timezone: "UTC",
		ownerName: null,
		...overrides,
	};
}

function createMockEnv(): Env {
	return {
		DB: {} as D1Database,
		CURIO_DB: {} as D1Database,
		GROVE_KEK: "a".repeat(64),
		LUMEN_API_KEY: "test-lumen-api-key",
		LUMEN: { fetch: vi.fn() },
		PULSE: { fetch: vi.fn() },
		TIMELINE_ADMIN_KEY: "test-admin-key",
	};
}

function createMockCtx() {
	const noExistingRow = { first: vi.fn().mockResolvedValue(null) };
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({ success: true }),
		all: vi.fn().mockResolvedValue({ results: [] }),
	};
	return { db: { prepare: vi.fn().mockReturnValue(stmt) } } as any;
}

/**
 * True if any prepared statement wrote a summary row. A written row carries a
 * real commit_count, so the date reads as generated and every later run skips
 * it — the exact shape of the 2026-11-13 bug.
 */
function writtenSummaryRows(ctx: any): boolean {
	return ctx.db.prepare.mock.calls.some((call: unknown[]) =>
		String(call[0]).includes("INSERT INTO timeline_summaries"),
	);
}

const successfulParseResult = {
	success: true,
	brief: "Brief summary",
	detailed: "Detailed timeline",
	gutter: [],
};

const successfulLumenResult = {
	content: JSON.stringify({
		brief: "A day of small fixes and one stubborn parser.",
		detailed: "## Projects\n\n### Lattice\n- Tightened the response parser",
		gutter: [{ anchor: "### Lattice", type: "comment", content: "about time" }],
	}),
	model: "anthropic/claude-3.5-haiku",
	usage: { input: 100, output: 50, cost: 0.001 },
};

describe("processTenantTimeline resilience", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		parseMock.mockReturnValue(successfulParseResult);
	});

	describe("retry", () => {
		it("succeeds without retrying when Lumen succeeds on the first attempt", async () => {
			runMock.mockResolvedValueOnce(successfulLumenResult);

			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(result.success).toBe(true);
			expect(runMock).toHaveBeenCalledTimes(1);
			expect(emitPulseEventMock).not.toHaveBeenCalled();
		});

		it("retries and succeeds if a later attempt works", async () => {
			runMock
				.mockRejectedValueOnce(new Error("Provider openrouter timed out after 60000ms"))
				.mockResolvedValueOnce(successfulLumenResult);

			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(result.success).toBe(true);
			expect(runMock).toHaveBeenCalledTimes(2);
			expect(emitPulseEventMock).not.toHaveBeenCalled();
		}, 10000);

		it("gives up and reports failure after exhausting all retry attempts", async () => {
			runMock.mockRejectedValue(new Error("Provider openrouter timed out after 60000ms"));

			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("timed out");
			// 3 total attempts: 1 initial + 2 retries
			expect(runMock).toHaveBeenCalledTimes(3);
		}, 15000);
	});

	describe("unusable AI responses", () => {
		it("fails instead of storing the generic fallback on truncated output", async () => {
			// 2026-11-13: the response pinned exactly maxTokens and got cut off
			// mid-JSON. It used to be stored as a real summary with the real
			// commit count, which then blocked every future run for that date.
			runMock.mockResolvedValue({
				...successfulLumenResult,
				content: '{"brief": "Some work happened today. The summary got a bit',
				usage: { input: 7753, output: SUMMARY_MAX_OUTPUT_TOKENS, cost: 0.015945 },
			});
			parseMock.mockReturnValue({ ...successfulParseResult, success: false });

			const ctx = createMockCtx();
			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-11-13",
				createMockEnv(),
				ctx,
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("ceiling");
			expect(emitPulseEventMock).toHaveBeenCalledWith(
				"error.server",
				expect.objectContaining({
					metadata: expect.objectContaining({ date: "2026-11-13" }),
				}),
			);
			// Nothing may be written — a written row would freeze the date.
			expect(writtenSummaryRows(ctx)).toBe(false);
		}, 15000);

		it("fails when the response parses to non-JSON under the token ceiling", async () => {
			runMock.mockResolvedValueOnce({
				...successfulLumenResult,
				content: "Sure! Here is your summary",
			});
			parseMock.mockReturnValue({ ...successfulParseResult, success: false });

			const ctx = createMockCtx();
			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-11-13",
				createMockEnv(),
				ctx,
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("not valid JSON");
			expect(writtenSummaryRows(ctx)).toBe(false);
		}, 15000);
	});

	describe("Pulse reporting", () => {
		it("reports to Pulse when generation ultimately fails", async () => {
			runMock.mockRejectedValue(new Error("Provider openrouter timed out after 60000ms"));

			await processTenantTimeline(
				createMockConfig({ tenantId: "tenant-abc" }),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(initPulseMock).toHaveBeenCalled();
			expect(emitPulseEventMock).toHaveBeenCalledWith(
				"error.server",
				expect.objectContaining({
					app: "timeline-sync",
					tenant_id: "tenant-abc",
					metadata: expect.objectContaining({
						date: "2026-03-11",
						message: expect.stringContaining("timed out"),
					}),
				}),
			);
			expect(flushPulseMock).toHaveBeenCalled();
		}, 15000);

		it("never reports to Pulse on success", async () => {
			runMock.mockResolvedValueOnce(successfulLumenResult);

			await processTenantTimeline(
				createMockConfig(),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(emitPulseEventMock).not.toHaveBeenCalled();
			expect(flushPulseMock).not.toHaveBeenCalled();
		});

		it("doesn't let a Pulse reporting failure mask the original error", async () => {
			runMock.mockRejectedValue(new Error("Provider openrouter timed out after 60000ms"));
			flushPulseMock.mockRejectedValueOnce(new Error("pulse-collector unreachable"));

			const result = await processTenantTimeline(
				createMockConfig(),
				"2026-03-11",
				createMockEnv(),
				createMockCtx(),
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("timed out");
		}, 15000);
	});
});
