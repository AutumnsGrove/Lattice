/**
 * The run record over D1 (#1798, slice 3).
 *
 * A fake `D1Database` that records what it was asked, because what matters here is
 * the shape of the writes: one line per append, positions that count up, and a
 * failure that comes back as a result rather than an exception.
 */

import { describe, expect, it } from "vitest";
import { d1RunStorage } from "./storage";

interface Asked {
	sql: string;
	params: unknown[];
}

type Reply = { first?: unknown; all?: unknown[] };

function fakeDb(reply: (sql: string, params: unknown[], call: number) => Reply | undefined) {
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
					const reply2 = reply(sql, params, asked.length);
					if (reply2 === undefined) throw new Error("the database is down");
					return reply2.first ?? null;
				},
				async all() {
					asked.push({ sql, params });
					const reply2 = reply(sql, params, asked.length);
					if (reply2 === undefined) throw new Error("the database is down");
					return { results: reply2.all ?? [] };
				},
				async run() {
					asked.push({ sql, params });
					const reply2 = reply(sql, params, asked.length);
					if (reply2 === undefined) throw new Error("the database is down");
					return { success: true, meta: {}, results: [] };
				},
			};
			return statement;
		},
	} as unknown as D1Database;
	return { db, asked };
}

describe("d1RunStorage", () => {
	it("appends a line at the next position", async () => {
		let next = 0;
		const { db, asked } = fakeDb((sql) => {
			if (sql.includes("COALESCE(MAX(seq)")) {
				return { first: { next: next++ } };
			}
			return {};
		});

		const storage = d1RunStorage(db, "run-1");

		expect(await storage.append("first")).toEqual({ ok: true, value: { seq: 0 } });
		expect(await storage.append("second")).toEqual({ ok: true, value: { seq: 1 } });

		const inserts = asked.filter((statement) =>
			statement.sql.includes("INSERT INTO timeline_run_entries"),
		);
		expect(inserts.map((statement) => statement.params)).toEqual([
			["run-1", 0, "first"],
			["run-1", 1, "second"],
		]);
	});

	it("reads every line back in order", async () => {
		const { db } = fakeDb((sql) =>
			sql.includes("SELECT line") ? { all: [{ line: "a" }, { line: "b" }] } : {},
		);

		const storage = d1RunStorage(db, "run-1");

		expect(await storage.read()).toEqual({ ok: true, value: ["a", "b"] });
	});

	it("turns a database failure into a result, not an exception", async () => {
		const { db } = fakeDb(() => undefined);
		const storage = d1RunStorage(db, "run-1");

		const appended = await storage.append("line");
		const read = await storage.read();

		expect(appended.ok).toBe(false);
		expect(appended.ok ? "" : appended.error.code).toBe("internal");
		expect(appended.ok ? "" : appended.error.message).toContain("the database is down");
		expect(read.ok).toBe(false);
	});
});
