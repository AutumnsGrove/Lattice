/**
 * The nightly run, after the cutover (#1798, slice 5).
 *
 * The worker no longer fetches, prompts, parses or stores a day itself — it calls
 * `generateDay` and then `writeDaySummary`. What is left to test is exactly the
 * part that is still the worker's: which tenant keys it reads, whether a finished
 * day is left alone, what a quiet day does, and what happens when the run did not
 * finish. The page's own content is curios' business and is tested there.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env, TenantConfig } from "./config";

const {
	generateDayMock,
	writeDaySummaryMock,
	reportRunOutcomeMock,
	createRunLoggerMock,
	initPulseMock,
	emitPulseEventMock,
	flushPulseMock,
	resolvePersonaMock,
	createLumenModelSlotMock,
	safeGetSecretMock,
	d1DayRunMock,
} = vi.hoisted(() => ({
	generateDayMock: vi.fn(),
	writeDaySummaryMock: vi.fn(),
	reportRunOutcomeMock: vi.fn().mockResolvedValue(undefined),
	createRunLoggerMock: vi.fn().mockReturnValue(() => undefined),
	initPulseMock: vi.fn(),
	emitPulseEventMock: vi.fn(),
	flushPulseMock: vi.fn().mockResolvedValue(undefined),
	resolvePersonaMock: vi.fn().mockReturnValue("write like a person"),
	createLumenModelSlotMock: vi.fn().mockReturnValue({ name: "slot" }),
	safeGetSecretMock: vi.fn(),
	d1DayRunMock: vi.fn().mockReturnValue({
		store: { name: "store" },
		storage: () => ({ name: "storage" }),
		pastDays: { search: async () => [] },
	}),
}));

vi.mock("@autumnsgrove/curios/timeline/generate", () => ({ generateDay: generateDayMock }));
vi.mock("@autumnsgrove/curios/timeline/summary", () => ({
	writeDaySummary: writeDaySummaryMock,
}));
vi.mock("@autumnsgrove/curios/timeline/record", () => ({ d1DayRun: d1DayRunMock }));
vi.mock("@autumnsgrove/curios/timeline/voices", () => ({ resolvePersona: resolvePersonaMock }));
vi.mock("@autumnsgrove/lyra-lumen/lumen", () => ({
	createLumenModelSlot: createLumenModelSlotMock,
}));
vi.mock("@autumnsgrove/lattice/pulse", () => ({
	initPulse: initPulseMock,
	emitPulseEvent: emitPulseEventMock,
	flushPulse: flushPulseMock,
}));
vi.mock("@autumnsgrove/grove-crypto/secrets", () => ({
	createSecretsManager: vi.fn().mockResolvedValue({ safeGetSecret: safeGetSecretMock }),
}));
vi.mock("./run-log", () => ({
	createRunLogger: createRunLoggerMock,
	reportRunOutcome: reportRunOutcomeMock,
}));

import { processTenantTimeline } from "./generator";

// =============================================================================
// Fixtures
// =============================================================================

function config(overrides: Partial<TenantConfig> = {}): TenantConfig {
	return {
		tenantId: "tenant-1",
		githubUsername: "AutumnsGrove",
		openrouterModel: "deepseek/deepseek-v4.1-flash-1017",
		voicePreset: "casual",
		customSystemPrompt: null,
		customSummaryInstructions: null,
		customGutterStyle: null,
		reposInclude: ["Lattice"],
		reposExclude: null,
		timezone: "America/New_York",
		ownerName: "Autumn",
		...overrides,
	};
}

function env(): Env {
	return {
		DB: {} as D1Database,
		CURIO_DB: {} as D1Database,
		GROVE_KEK: "a".repeat(64),
		LUMEN_API_KEY: "lumen-key",
		LUMEN: { fetch: vi.fn() },
		PULSE: { fetch: vi.fn() },
		TIMELINE_ADMIN_KEY: "admin-key",
	};
}

interface CtxOptions {
	/** A summary row for the day is already there. */
	exists?: boolean;
}

function ctx({ exists = false }: CtxOptions = {}) {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(exists ? { 1: 1 } : null),
		run: vi.fn().mockResolvedValue({ success: true }),
		all: vi.fn().mockResolvedValue({ results: [] }),
	};
	return { db: { prepare: vi.fn().mockReturnValue(stmt) } } as never as {
		db: { prepare: ReturnType<typeof vi.fn> };
	};
}

const DAY = {
	date: "2026-11-21",
	timezone: "America/New_York",
	githubUsername: "AutumnsGrove",
	repos: ["Lattice"],
	commits: [
		{
			repo: "Lattice",
			sha: "a".repeat(40),
			message: "feat: one",
			authorDate: "2026-11-21T12:00:00Z",
			additions: 30,
			deletions: 4,
			merge: false,
		},
	],
	pulls: [],
	issues: [],
	warnings: [],
};

const PAGE = {
	brief: "One fix, one merge.",
	markdown: "### Lattice\n\n- <!-- anchor:l1 -->the line",
	gutter: [],
	continuation: null,
};

function generated(overrides: Record<string, unknown> = {}) {
	return {
		runId: "day_1",
		day: DAY,
		status: "done",
		page: PAGE,
		model: "deepseek/deepseek-v4.1-flash-1017",
		turns: 14,
		usage: { inputTokens: 169_000, outputTokens: 13_000, cost: { amount: 0.0076 } },
		warnings: [],
		error: null,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	safeGetSecretMock.mockResolvedValue("secret-token");
	generateDayMock.mockResolvedValue(generated());
	writeDaySummaryMock.mockResolvedValue(undefined);
});

// =============================================================================
// Tests
// =============================================================================

describe("processTenantTimeline", () => {
	it("leaves a day that is already written alone", async () => {
		const c = ctx({ exists: true });
		const result = await processTenantTimeline(config(), "2026-11-21", env(), c as never);

		expect(result.success).toBe(true);
		expect(generateDayMock).not.toHaveBeenCalled();
		expect(writeDaySummaryMock).not.toHaveBeenCalled();
	});

	it("asks generateDay for the tenant's own day", async () => {
		const e = env();
		const c = ctx();
		await processTenantTimeline(config(), "2026-11-21", e, c as never);

		expect(generateDayMock).toHaveBeenCalledTimes(1);
		const [input, deps] = generateDayMock.mock.calls[0] as [
			Record<string, unknown>,
			Record<string, unknown>,
		];
		expect(input).toMatchObject({
			tenantId: "tenant-1",
			date: "2026-11-21",
			timezone: "America/New_York",
			githubUsername: "AutumnsGrove",
			githubToken: "secret-token",
			include: ["Lattice"],
			exclude: null,
			ownerName: "Autumn",
			persona: "write like a person",
		});
		// The record goes with the day, or `search_past_days` answers nothing.
		expect(deps).toMatchObject({
			store: { name: "store" },
			pastDays: { search: expect.any(Function) },
			modelName: "deepseek/deepseek-v4.1-flash-1017",
		});
		expect(typeof deps.onEvent).toBe("function");
		// The ID goes to the slot: a slot without one asks Lumen who is calling.
		expect(createLumenModelSlotMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "tenant-1",
				tenantApiKey: "secret-token",
				model: "deepseek/deepseek-v4.1-flash-1017",
				baseUrl: "https://grove-lumen",
			}),
		);
	});

	it("resolves the tenant's voice into the persona the recipe writes with", async () => {
		await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(resolvePersonaMock).toHaveBeenCalledWith({ preset: "casual", custom: null });
	});

	it("passes a custom voice's own prompts through", async () => {
		await processTenantTimeline(
			config({
				voicePreset: "custom",
				customSystemPrompt: "write like a lighthouse keeper",
				customSummaryInstructions: "short lines",
				customGutterStyle: "dry",
			}),
			"2026-11-21",
			env(),
			ctx() as never,
		);

		expect(resolvePersonaMock).toHaveBeenCalledWith({
			preset: "custom",
			custom: {
				systemPrompt: "write like a lighthouse keeper",
				summaryInstructions: "short lines",
				gutterStyle: "dry",
			},
		});
	});

	it("writes the day where the site reads it", async () => {
		const e = env();
		const c = ctx();
		const result = await processTenantTimeline(config(), "2026-11-21", e, c as never);

		expect(writeDaySummaryMock).toHaveBeenCalledTimes(1);
		expect(writeDaySummaryMock).toHaveBeenCalledWith(e.CURIO_DB, {
			tenantId: "tenant-1",
			date: "2026-11-21",
			day: DAY,
			page: PAGE,
			model: "deepseek/deepseek-v4.1-flash-1017",
			voice: "casual",
			usage: { inputTokens: 169_000, outputTokens: 13_000, cost: 0.0076 },
		});
		expect(result).toMatchObject({ success: true, commitCount: 1 });
	});

	it("charges the day to the model that answered, not the one it asked", async () => {
		// A fallback turn is still a bill. The usage row is the only place the
		// timeline records one, so it has to name the model that wrote the page.
		generateDayMock.mockResolvedValue(generated({ model: "anthropic/claude-haiku-fallback" }));
		await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(writeDaySummaryMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				model: "anthropic/claude-haiku-fallback",
				usage: expect.objectContaining({ cost: 0.0076 }),
			}),
		);
	});

	it("falls back to the configured model when the run could not say", async () => {
		generateDayMock.mockResolvedValue(generated({ model: null }));
		await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(writeDaySummaryMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ model: "deepseek/deepseek-v4.1-flash-1017" }),
		);
	});

	it("writes nothing for a day with no activity", async () => {
		generateDayMock.mockResolvedValue(
			generated({ status: "empty", runId: null, turns: 0, page: { ...PAGE, brief: null } }),
		);
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(result).toMatchObject({ success: true, commitCount: 0 });
		expect(writeDaySummaryMock).not.toHaveBeenCalled();
	});

	it("stores a parked run's page but reports it to Pulse", async () => {
		generateDayMock.mockResolvedValue(
			generated({
				status: "parked",
				error: { code: "step_limit", message: "hit the step limit" },
			}),
		);
		const e = env();
		const result = await processTenantTimeline(config(), "2026-11-21", e, ctx() as never);

		// A limit is not a loss: the page that exists is worth keeping.
		expect(writeDaySummaryMock).toHaveBeenCalledTimes(1);
		expect(reportRunOutcomeMock).toHaveBeenCalledWith(
			e,
			expect.objectContaining({ status: "parked", turns: 14, cost: 0.0076 }),
		);
		expect(result.success).toBe(true);
	});

	it("fails without writing a page when the run failed", async () => {
		generateDayMock.mockResolvedValue(
			generated({
				status: "failed",
				error: { code: "provider_error", message: "provider said no" },
			}),
		);
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(writeDaySummaryMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({ success: false, error: "provider said no" });
	});

	it("reports a failed night to Pulse", async () => {
		generateDayMock.mockRejectedValue(new Error("GitHub said 502"));
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(result).toMatchObject({ success: false, error: "GitHub said 502" });
		expect(emitPulseEventMock).toHaveBeenCalledWith(
			"error.server",
			expect.objectContaining({ app: "timeline-sync", tenant_id: "tenant-1" }),
		);
		expect(flushPulseMock).toHaveBeenCalled();
	});

	it("fails the tenant when the GitHub token is missing", async () => {
		safeGetSecretMock.mockImplementation(async (_tenant: string, key: string) =>
			key === "timeline_github_token" ? null : "openrouter-key",
		);
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(result.success).toBe(false);
		expect(result.error).toContain("timeline_github_token");
		expect(generateDayMock).not.toHaveBeenCalled();
	});

	it("fails the tenant with a message that names Settings when no AI key is set", async () => {
		safeGetSecretMock.mockImplementation(async (_tenant: string, key: string) =>
			key === "timeline_github_token" ? "gh-token" : null,
		);
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(result.success).toBe(false);
		expect(result.error).toContain("Settings");
		expect(createLumenModelSlotMock).not.toHaveBeenCalled();
		expect(generateDayMock).not.toHaveBeenCalled();
	});

	it("uses the timeline's own secret name when Settings has not been set", async () => {
		// The fallback is what makes this shippable without rotating anything.
		safeGetSecretMock.mockImplementation(async (_tenant: string, key: string) => {
			if (key === "timeline_github_token") return "gh-token";
			return key === "timeline_openrouter_key" ? "legacy-key" : null;
		});
		await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(createLumenModelSlotMock).toHaveBeenCalledWith(
			expect.objectContaining({ tenantApiKey: "legacy-key" }),
		);
	});

	it("doesn't let a Pulse failure mask the original error", async () => {
		generateDayMock.mockRejectedValue(new Error("the real problem"));
		emitPulseEventMock.mockImplementation(() => {
			throw new Error("pulse is down");
		});
		const result = await processTenantTimeline(config(), "2026-11-21", env(), ctx() as never);

		expect(result).toMatchObject({ success: false, error: "the real problem" });
		emitPulseEventMock.mockReset();
	});
});
