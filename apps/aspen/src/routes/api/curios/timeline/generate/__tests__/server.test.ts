/**
 * Manual timeline generation (#1798, slice 5).
 *
 * The route is now a thin wrapper around `generateDay` + `writeDaySummary`, so
 * what is worth testing is exactly what it still owns: the guard that leaves a
 * written day alone, the two key lookups with their UI-visible error codes, the
 * deployment fault (no Lumen binding) said plainly, and the response shape the
 * Arbor panel reads (`summary` truthy means "written", `usage.cost` feeds the
 * running total).
 *
 * @see beaver-build (skill) for testing philosophy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	generateDayMock,
	writeDaySummaryMock,
	resolvePersonaMock,
	createLumenModelSlotMock,
	getTimelineTokenMock,
	d1DayRunMock,
	thresholdCheckMock,
} = vi.hoisted(() => ({
	generateDayMock: vi.fn(),
	writeDaySummaryMock: vi.fn(),
	resolvePersonaMock: vi.fn().mockReturnValue("write like a person"),
	createLumenModelSlotMock: vi.fn().mockReturnValue({ name: "slot" }),
	getTimelineTokenMock: vi.fn(),
	d1DayRunMock: vi.fn().mockReturnValue({
		store: { name: "store" },
		storage: () => ({ name: "storage" }),
		pastDays: { search: async () => [] },
	}),
	thresholdCheckMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@sveltejs/kit", () => ({
	json: (data: unknown, init?: { status?: number }) => ({
		status: init?.status ?? 200,
		body: data,
	}),
}));

vi.mock("@autumnsgrove/lattice/errors", async () => {
	const actual = await vi.importActual<typeof import("@autumnsgrove/lattice/errors")>(
		"@autumnsgrove/lattice/errors",
	);
	return {
		...actual,
		throwGroveError: (status: number, groveError: { userMessage: string; code: string }) => {
			const err = new Error(groveError.userMessage) as Error & { status: number; code: string };
			err.status = status;
			err.code = groveError.code;
			throw err;
		},
		logGroveError: vi.fn(),
	};
});

vi.mock("@autumnsgrove/lattice/platform/threshold/factory", () => ({
	createThreshold: () => ({ name: "threshold" }),
}));
vi.mock("@autumnsgrove/lattice/platform/threshold/sveltekit", () => ({
	thresholdCheck: thresholdCheckMock,
}));

vi.mock("@autumnsgrove/curios/timeline/secrets.server", () => ({
	getTimelineToken: getTimelineTokenMock,
	TIMELINE_SECRET_KEYS: {
		GITHUB_TOKEN: "timeline_github_token",
		OPENROUTER_KEY: "timeline_openrouter_key",
	},
}));
vi.mock("@autumnsgrove/curios/timeline/generate", () => ({ generateDay: generateDayMock }));
vi.mock("@autumnsgrove/curios/timeline/record", () => ({ d1DayRun: d1DayRunMock }));
vi.mock("@autumnsgrove/curios/timeline/summary", () => ({
	writeDaySummary: writeDaySummaryMock,
}));
vi.mock("@autumnsgrove/curios/timeline/voices", () => ({ resolvePersona: resolvePersonaMock }));
vi.mock("@autumnsgrove/lyra-lumen/lumen", () => ({
	createLumenModelSlot: createLumenModelSlotMock,
}));

import { POST } from "../+server.js";

// =============================================================================
// Fixtures
// =============================================================================

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

interface ContextOptions {
	existingRow?: boolean;
	user?: unknown;
	tenantId?: string | null;
	platform?: unknown;
	date?: string;
}

function context(options: ContextOptions = {}) {
	// Two reads on the same prepared shape: the "has this day been written" guard,
	// then the tenant's config row.
	const configRow = {
		enabled: 1,
		github_username: "AutumnsGrove",
		openrouter_model: "deepseek/deepseek-v4.1-flash-1017",
		voice_preset: "casual",
		custom_system_prompt: null,
		custom_summary_instructions: null,
		custom_gutter_style: null,
		repos_include: '["Lattice"]',
		repos_exclude: null,
		timezone: "America/New_York",
		owner_name: "Autumn",
	};
	let reads = 0;
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockImplementation(async () => {
			reads += 1;
			if (reads === 1) return options.existingRow === true ? { 1: 1 } : null;
			return configRow;
		}),
	};

	const platform =
		options.platform ??
		({
			env: {
				DB: {},
				CURIO_DB: { prepare: vi.fn().mockReturnValue(stmt) },
				GROVE_KEK: "a".repeat(64),
				LUMEN: { fetch: vi.fn() },
				LUMEN_API_KEY: "lumen-key",
			},
		} as unknown);

	return {
		request: new Request("https://grove.place/api/curios/timeline/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ date: options.date ?? "2026-11-21" }),
		}),
		platform: platform as never,
		locals: {
			user: "user" in options ? options.user : { id: "user_1", email: "a@b.c" },
			tenantId: "tenantId" in options ? options.tenantId : "tenant-1",
		} as never,
		stmt,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	getTimelineTokenMock.mockResolvedValue({ token: "secret-token", source: "encrypted" });
	generateDayMock.mockResolvedValue(generated());
	writeDaySummaryMock.mockResolvedValue(undefined);
	thresholdCheckMock.mockResolvedValue(null);
});

// =============================================================================
// Tests
// =============================================================================

describe("POST /api/curios/timeline/generate", () => {
	it("leaves a day that is already written alone", async () => {
		const ctx = context({ existingRow: true });
		const result = (await POST(ctx as never)) as unknown as {
			status: number;
			body: Record<string, unknown>;
		};

		expect(result.body).toMatchObject({ success: true, summary: null, alreadyExists: true });
		expect(generateDayMock).not.toHaveBeenCalled();
		expect(writeDaySummaryMock).not.toHaveBeenCalled();
	});

	it("makes the day for the signed-in tenant", async () => {
		const ctx = context();
		await POST(ctx as never);

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
		expect(deps).toMatchObject({
			store: { name: "store" },
			modelName: "deepseek/deepseek-v4.1-flash-1017",
		});
		expect(createLumenModelSlotMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "tenant-1",
				tenantApiKey: "secret-token",
				apiKey: "lumen-key",
			}),
		);
	});

	it("writes the day and answers with what the panel reads", async () => {
		const ctx = context();
		const result = (await POST(ctx as never)) as unknown as {
			status: number;
			body: Record<string, unknown>;
		};

		expect(writeDaySummaryMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tenantId: "tenant-1",
				date: "2026-11-21",
				day: DAY,
				page: PAGE,
				model: "deepseek/deepseek-v4.1-flash-1017",
				voice: "casual",
			}),
		);
		expect(result.status).toBe(200);
		expect(result.body).toMatchObject({
			success: true,
			summary: {
				summaryDate: "2026-11-21",
				briefSummary: "One fix, one merge.",
				commitCount: 1,
				reposActive: ["Lattice"],
				totalAdditions: 30,
				totalDeletions: 4,
				status: "done",
			},
			usage: { cost: 0.0076, model: "deepseek/deepseek-v4.1-flash-1017", turns: 14 },
		});
	});

	it("answers 'no activity' without writing a page", async () => {
		generateDayMock.mockResolvedValue(generated({ status: "empty", runId: null, turns: 0 }));
		const ctx = context();
		const result = (await POST(ctx as never)) as unknown as {
			body: Record<string, unknown>;
		};

		expect(writeDaySummaryMock).not.toHaveBeenCalled();
		expect(result.body).toMatchObject({ success: true, summary: null });
	});

	it("fails the request when the run failed", async () => {
		generateDayMock.mockResolvedValue(
			generated({ status: "failed", error: { code: "provider_error", message: "no answer" } }),
		);
		const ctx = context();
		const result = (await POST(ctx as never)) as unknown as {
			status: number;
			body: Record<string, unknown>;
		};

		expect(writeDaySummaryMock).not.toHaveBeenCalled();
		expect(result.status).toBe(500);
		expect(result.body).toMatchObject({ success: false, error: "generation_failed" });
	});

	it("says a missing GitHub token in the shape the panel already handles", async () => {
		getTimelineTokenMock.mockImplementation(async (_env: unknown, _tenant: string, key: string) =>
			key === "timeline_github_token"
				? { token: null, source: "none" }
				: { token: "or", source: "x" },
		);
		const ctx = context();
		const result = (await POST(ctx as never)) as unknown as {
			status: number;
			body: Record<string, unknown>;
		};

		expect(result.status).toBe(400);
		expect(result.body).toMatchObject({ success: false, error: "github_token_missing" });
		expect(generateDayMock).not.toHaveBeenCalled();
	});

	it("refuses plainly when the Lumen binding is not deployed", async () => {
		// A missing binding is a deployment fault. Saying so beats a model error three
		// turns into a run nobody can see.
		const ctx = context({
			platform: {
				env: {
					DB: {},
					CURIO_DB: {
						prepare: vi.fn().mockReturnValue({
							bind: vi.fn().mockReturnThis(),
							first: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({
								enabled: 1,
								github_username: "AutumnsGrove",
								openrouter_model: "deepseek/deepseek-v4.1-flash-1017",
								voice_preset: "casual",
								custom_system_prompt: null,
								custom_summary_instructions: null,
								custom_gutter_style: null,
								repos_include: null,
								repos_exclude: null,
								timezone: "UTC",
								owner_name: null,
							}),
						}),
					},
					GROVE_KEK: "a".repeat(64),
				},
			},
		});

		await expect(POST(ctx as never)).rejects.toMatchObject({ status: 500 });
		expect(generateDayMock).not.toHaveBeenCalled();
	});

	it("requires a signed-in Wanderer", async () => {
		const ctx = context({ user: null });
		await expect(POST(ctx as never)).rejects.toMatchObject({ status: 401 });
	});
});
