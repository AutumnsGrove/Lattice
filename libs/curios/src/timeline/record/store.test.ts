/**
 * Writing a run down (#1798, slice 3).
 *
 * These are the two statements a day's audit trail depends on, so the tests pin the
 * columns and the order of the names: a swapped pair here would write a page into
 * the wrong row and nobody would notice until the comparison.
 */

import { describe, expect, it } from "vitest";
import { d1RunStore, listRunsForDay, readRun } from "./store";
import type { DayRunRow } from "./types";

interface Asked {
	sql: string;
	params: unknown[];
}

function fakeDb(reply: (sql: string) => { first?: unknown; all?: unknown[] } = () => ({})) {
	const asked: Asked[] = [];
	const db = {
		prepare(sql: string) {
			let params: unknown[] = [];
			const statement = {
				bind(...values: unknown[]) {
					params = values;
					return statement;
				},
				async first() {
					asked.push({ sql, params });
					return reply(sql).first ?? null;
				},
				async all() {
					asked.push({ sql, params });
					return { results: reply(sql).all ?? [] };
				},
				async run() {
					asked.push({ sql, params });
					return { success: true, meta: {}, results: [] };
				},
			};
			return statement;
		},
	} as unknown as D1Database;
	return { db, asked };
}

const START = {
	runId: "run-1",
	tenantId: "tenant-1",
	date: "2026-11-21",
	recipe: "timeline",
	recipeVersion: 1,
	model: "anthropic/claude-3.5-haiku",
};

const FINISH = {
	runId: "run-1",
	status: "done" as const,
	turns: 6,
	inputTokens: 1_200,
	outputTokens: 300,
	cost: 0.018,
	markdown: "### Lattice\n\n- <!-- anchor:l1 -->Wrote the day.",
	gutter: [{ anchor: "anchor:l1", type: "comment" as const, content: "finally" }],
	continuationOf: "2026-11-19",
	error: null,
};

describe("d1RunStore", () => {
	it("opens a run in the running state", async () => {
		const { db, asked } = fakeDb();
		const store = d1RunStore(db);

		await store.start(START);

		expect(asked[0]?.sql).toContain("INSERT INTO timeline_runs");
		expect(asked[0]?.sql).toContain("'running'");
		expect(asked[0]?.params).toEqual([
			"run-1",
			"tenant-1",
			"2026-11-21",
			"timeline",
			1,
			"anthropic/claude-3.5-haiku",
		]);
	});

	it("closes a run with its page, gutter and cost", async () => {
		const { db, asked } = fakeDb();
		const store = d1RunStore(db);

		await store.finish(FINISH);

		expect(asked[0]?.sql).toContain("UPDATE timeline_runs");
		expect(asked[0]?.params).toEqual([
			"done",
			6,
			1_200,
			300,
			0.018,
			FINISH.markdown,
			JSON.stringify([{ anchor: "anchor:l1", type: "comment", content: "finally" }]),
			"2026-11-19",
			null,
			"run-1",
		]);
	});

	it("refuses to write a broken record quietly", async () => {
		const db = {
			prepare() {
				throw new Error("the database is down");
			},
		} as unknown as D1Database;

		await expect(d1RunStore(db).start(START)).rejects.toThrow("the database is down");
	});
});

describe("reading runs", () => {
	const row: DayRunRow = {
		id: "run-1",
		tenant_id: "tenant-1",
		run_date: "2026-11-21",
		recipe: "timeline",
		recipe_version: 1,
		status: "done",
		model: null,
		turns: 6,
		input_tokens: 1_200,
		output_tokens: 300,
		cost: 0.018,
		markdown: "### Lattice",
		gutter_content: "[]",
		continuation_of: null,
		error: null,
		created_at: 1_763_000_000,
		finished_at: 1_763_000_060,
	};

	it("reads one run for its tenant", async () => {
		const { db, asked } = fakeDb(() => ({ first: row }));

		const found = await readRun(db, "tenant-1", "run-1");

		expect(found?.id).toBe("run-1");
		expect(asked[0]?.params).toEqual(["run-1", "tenant-1"]);
	});

	it("lists a day's runs for its tenant, newest first", async () => {
		const { db, asked } = fakeDb(() => ({ all: [row] }));

		const runs = await listRunsForDay(db, "tenant-1", "2026-11-21");

		expect(runs).toHaveLength(1);
		expect(asked[0]?.sql).toContain("ORDER BY created_at DESC");
		expect(asked[0]?.params).toEqual(["tenant-1", "2026-11-21"]);
	});
});
