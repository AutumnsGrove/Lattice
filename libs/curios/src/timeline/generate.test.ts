/**
 * One day, start to finish (#1798, slice 3).
 *
 * This is the function both entry points will call, so the tests cover the three
 * shapes a night can take: a day that gets written, a day with nothing on it, and a
 * run that cannot write its record. The model is Lyra's scripted one and GitHub is a
 * fake wire, so the whole path runs without a network or a provider key.
 */

import { fakeClock, scriptedModel, type ScriptedTurn } from "@autumnsgrove/lyra/testkit";
import { memoryStorage } from "@autumnsgrove/lyra/memory";
import { describe, expect, it } from "vitest";
import { generateDay, type GenerateDayDeps, type GenerateDayInput } from "./generate";
import type { DayRunFinish, DayRunStart, DayRunStore } from "./record/types";

const INPUT: GenerateDayInput = {
	tenantId: "tenant-1",
	date: "2026-11-21",
	timezone: "America/Los_Angeles",
	githubUsername: "autumn",
	githubToken: "token",
	repos: ["Lattice"],
};

const COMMIT = {
	sha: "aaaaaaa1111",
	parents: [{ sha: "p1" }],
	commit: {
		message: "feat(timeline): attach a vine to a line",
		author: { date: "2026-11-21T20:00:00Z" },
	},
};

function fakeGitHub(commits: unknown[] = [COMMIT]) {
	return async (input: string) => {
		const url = new URL(input);
		if (url.pathname === "/repos/autumn/Lattice/commits") {
			return Response.json(url.searchParams.get("page") === "1" ? commits : []);
		}
		if (url.pathname === "/repos/autumn/Lattice/commits/aaaaaaa1111") {
			return Response.json({ ...COMMIT, stats: { additions: 12, deletions: 3 } });
		}
		if (url.pathname.endsWith("/issues") || url.pathname.endsWith("/comments")) {
			return Response.json([]);
		}
		return new Response("not found", { status: 404 });
	};
}

interface Recorder {
	started: DayRunStart[];
	finished: DayRunFinish[];
	store: DayRunStore;
}

function recordingStore(overrides: Partial<DayRunStore> = {}): Recorder {
	const started: DayRunStart[] = [];
	const finished: DayRunFinish[] = [];
	const store: DayRunStore = {
		async start(run) {
			started.push({ ...run });
		},
		async finish(run) {
			finished.push({ ...run });
		},
		...overrides,
	};
	return { started, finished, store };
}

function deps(
	store: DayRunStore,
	turns: readonly ScriptedTurn[],
	extra: Partial<GenerateDayDeps> = {},
): GenerateDayDeps {
	const clock = fakeClock();
	return {
		store,
		storage: () => memoryStorage(),
		model: scriptedModel(turns, { clock }),
		fetch: fakeGitHub() as never,
		modelName: "scripted/model",
		runId: "run-1",
		...extra,
	};
}

const WRITE_THE_DAY: readonly ScriptedTurn[] = [
	{ toolCalls: [{ id: "t1", name: "start_project", args: { repo: "Lattice" } }] },
	{
		toolCalls: [
			{
				id: "t2",
				name: "add_line",
				args: { project: "Lattice", text: "Attached a vine to a line.", cites: ["c1"] },
			},
		],
	},
	{ toolCalls: [{ id: "t3", name: "finish", args: {} }] },
];

describe("generateDay", () => {
	it("fetches the day, runs the recipe, and writes the page down", async () => {
		const recorder = recordingStore();
		const result = await generateDay(INPUT, deps(recorder.store, WRITE_THE_DAY));

		expect(result.status).toBe("done");
		expect(result.runId).toBe("run-1");
		expect(result.page.markdown).toBe(
			"### Lattice\n\n- <!-- anchor:l1 -->Attached a vine to a line.",
		);
		expect(result.page.gutter).toEqual([]);
		expect(result.warnings).toEqual([]);

		expect(recorder.started).toEqual([
			{
				runId: "run-1",
				tenantId: "tenant-1",
				date: "2026-11-21",
				recipe: "timeline",
				recipeVersion: 1,
				model: "scripted/model",
			},
		]);
		expect(recorder.finished).toHaveLength(1);
		expect(recorder.finished[0]).toMatchObject({
			runId: "run-1",
			tenantId: "tenant-1",
			status: "done",
			markdown: result.page.markdown,
			gutter: [],
			continuationOf: null,
			error: null,
		});
	});

	it("keeps the run's record as the loop writes it", async () => {
		const recorder = recordingStore();
		const storage = memoryStorage();
		const result = await generateDay(
			INPUT,
			deps(recorder.store, WRITE_THE_DAY, { storage: () => storage }),
		);

		const saved = await storage.read();
		expect(saved.ok).toBe(true);
		const lines = saved.ok ? saved.value : [];
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.some((line) => line.includes("tool_message"))).toBe(true);
		expect(result.status).toBe("done");
	});

	it("writes no run at all for a day with nothing on it", async () => {
		const recorder = recordingStore();
		const result = await generateDay(
			INPUT,
			deps(recorder.store, [], { fetch: fakeGitHub([]) as never }),
		);

		expect(result.status).toBe("empty");
		expect(result.runId).toBeNull();
		expect(result.page.markdown).toBe("");
		expect(recorder.started).toEqual([]);
		expect(recorder.finished).toEqual([]);
	});

	it("still writes the page when the record cannot be opened", async () => {
		const recorder = recordingStore({
			async start() {
				throw new Error("the database is down");
			},
		});

		const result = await generateDay(INPUT, deps(recorder.store, WRITE_THE_DAY));

		expect(result.status).toBe("done");
		expect(result.page.markdown).toContain("anchor:l1");
		expect(result.warnings).toEqual(["could not open the run's record: the database is down"]);
	});

	it("closes the run as failed when the model cannot answer", async () => {
		const recorder = recordingStore();
		const result = await generateDay(INPUT, deps(recorder.store, []));

		expect(result.status).toBe("failed");
		expect(result.error?.message).toContain("no turn 1");
		expect(recorder.finished[0]).toMatchObject({
			status: "failed",
			error: "the scripted model has no turn 1: the script has 0",
			markdown: "",
		});
	});
});
