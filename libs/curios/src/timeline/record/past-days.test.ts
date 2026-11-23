/**
 * Earlier days, for `search_past_days` (#1798, slice 3).
 *
 * Two sources have a day's own words: the new path's run pages and the old path's
 * stored summaries. The tests pin which wins, that both are tenant-scoped, and that
 * a query is taken literally rather than as a pattern.
 */

import { describe, expect, it } from "vitest";
import { createPastDays } from "./past-days";

interface Asked {
	sql: string;
	params: unknown[];
}

function fakeDb(rows: {
	runs?: { date: string; text: string | null }[];
	summaries?: { date: string; text: string | null }[];
}) {
	const asked: Asked[] = [];
	const db = {
		prepare(sql: string) {
			let params: unknown[] = [];
			const statement = {
				bind(...values: unknown[]) {
					params = values;
					return statement;
				},
				async all() {
					asked.push({ sql, params });
					const results = sql.includes("timeline_runs")
						? (rows.runs ?? [])
						: (rows.summaries ?? []);
					return { results };
				},
				async first() {
					asked.push({ sql, params });
					return null;
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

describe("createPastDays", () => {
	it("prefers a run's page to the stored summary for the same day", async () => {
		const { db } = fakeDb({
			runs: [
				{
					date: "2026-11-20",
					text: "### Lattice\n\n- <!-- anchor:l1 -->The new path wrote this about the vine.",
				},
			],
			summaries: [
				{ date: "2026-11-20", text: "The old path wrote this about the vine." },
				{ date: "2026-11-19", text: "The old path wrote about the vine on Tuesday." },
			],
		});

		const found = await createPastDays(db, "tenant-1").search("vine");

		expect(found.map((day) => day.date)).toEqual(["2026-11-20", "2026-11-19"]);
		expect(found[0]?.text).toBe("Lattice The new path wrote this about the vine.");
		expect(found[1]?.text).toBe("The old path wrote about the vine on Tuesday.");
	});

	it("scopes both queries to the tenant", async () => {
		const { db, asked } = fakeDb({});

		await createPastDays(db, "tenant-1").search("vine");

		expect(asked).toHaveLength(2);
		for (const query of asked) {
			expect(query.sql).toContain("tenant_id = ?");
			expect(query.params[0]).toBe("tenant-1");
		}
	});

	it("only searches runs that finished", async () => {
		const { db, asked } = fakeDb({});

		await createPastDays(db, "tenant-1").search("vine");

		const runQuery = asked.find((query) => query.sql.includes("timeline_runs"));
		expect(runQuery?.sql).toContain("status = 'done'");
	});

	it("takes the query literally, so % and _ are not wildcards", async () => {
		const { db, asked } = fakeDb({});

		await createPastDays(db, "tenant-1").search("100%_done");

		expect(asked[0]?.params[1]).toBe("%100\\%\\_done%");
		expect(asked[0]?.sql).toContain("ESCAPE '\\'");
	});

	it("leaves no angle bracket or comment markup in the snippet", async () => {
		const { db } = fakeDb({
			runs: [
				{
					date: "2026-11-20",
					text: "### Lattice\n\n- <!-- <!-- anchor:l1 --> the vine landed <script>",
				},
			],
		});

		const found = await createPastDays(db, "tenant-1").search("vine");

		expect(found[0]?.text).not.toContain("<");
		expect(found[0]?.text).not.toContain(">");
		expect(found[0]?.text).toContain("the vine landed");
	});

	it("says nothing when nothing matches", async () => {
		const { db } = fakeDb({});

		expect(await createPastDays(db, "tenant-1").search("nothing")).toEqual([]);
	});

	it("cuts a long day to the stretch around the match", async () => {
		const long = `${"padding ".repeat(80)}the vine landed${" trailing".repeat(80)}`;
		const { db } = fakeDb({ runs: [{ date: "2026-11-20", text: long }] });

		const found = await createPastDays(db, "tenant-1").search("vine");

		expect(found[0]?.text.length).toBeLessThanOrEqual(302);
		expect(found[0]?.text).toContain("the vine landed");
		expect(found[0]?.text.startsWith("…")).toBe(true);
	});
});
