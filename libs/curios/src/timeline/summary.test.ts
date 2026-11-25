/**
 * Writing a day into the tables the site reads (#1798, slice 5).
 *
 * These pin the columns rather than the prose: `brief_summary` and
 * `detailed_timeline` are what the page renders, `commit_count` and `repos_active`
 * are what the heatmap counts, and a swapped pair here would put a day's page in
 * the wrong shape with nothing failing. The last test is the one that matters most:
 * a commit-less day (a pull request merged with no commits of its own) still writes
 * a page, because the new path's day is not a commit list.
 */

import { describe, expect, it } from "vitest";
import { writeDaySummary, type DaySummaryInput } from "./summary";
import type { TimelineDay } from "./day/types";
import type { SerializedPage } from "./recipe/serialize";

interface Asked {
	sql: string;
	params: unknown[];
}

function fakeDb() {
	const asked: Asked[] = [];
	const db = {
		prepare(sql: string) {
			let params: unknown[] = [];
			const statement = {
				bind(...values: unknown[]) {
					params = values;
					return statement;
				},
				asked: () => ({ sql, params }),
			};
			return statement;
		},
		async batch(statements: Array<{ asked: () => Asked }>) {
			for (const statement of statements) {
				asked.push(statement.asked());
			}
			return [];
		},
	};
	return { db: db as unknown as D1Database, asked };
}

const DAY: TimelineDay = {
	date: "2026-11-21",
	timezone: "America/New_York",
	githubUsername: "AutumnsGrove",
	repos: ["Lattice", "Sentinel"],
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
		{
			repo: "Sentinel",
			sha: "b".repeat(40),
			message: "fix: two",
			authorDate: "2026-11-21T15:00:00Z",
			additions: 2,
			deletions: 11,
			merge: true,
		},
	],
	pulls: [],
	issues: [],
	warnings: [],
};

const PAGE: SerializedPage = {
	brief: "Two repos, one long day.",
	markdown: "### Lattice\n\n- <!-- anchor:l1 -->the line",
	gutter: [{ anchor: "anchor:l1", type: "comment", content: "a note" }],
	continuation: null,
};

function input(overrides: Partial<DaySummaryInput> = {}): DaySummaryInput {
	return {
		tenantId: "tenant-1",
		date: "2026-11-21",
		day: DAY,
		page: PAGE,
		model: "deepseek/deepseek-v4.1-flash-1017",
		voice: "casual",
		usage: { inputTokens: 169_000, outputTokens: 13_000, cost: 0.0076 },
		...overrides,
	};
}

type Row = Record<string, unknown>;

/** The bound parameters, named by the column list each statement declares. */
function rows(asked: Asked[]): { summary: Row; activity: Row; usage: Row } {
	const [summary, activity, usage] = asked;
	if (!summary || !activity || !usage) {
		throw new Error(`expected three statements, got ${asked.length}`);
	}
	return {
		summary: {
			id: summary.params[0],
			tenant_id: summary.params[1],
			summary_date: summary.params[2],
			brief_summary: summary.params[3],
			detailed_timeline: summary.params[4],
			gutter_content: summary.params[5],
			commit_count: summary.params[6],
			repos_active: summary.params[7],
			total_additions: summary.params[8],
			total_deletions: summary.params[9],
			ai_model: summary.params[10],
			ai_cost: summary.params[11],
			input_tokens: summary.params[12],
			output_tokens: summary.params[13],
			voice_preset: summary.params[14],
			continuation_of: summary.params[15],
			focus_streak: summary.params[16],
		},
		activity: {
			tenant_id: activity.params[0],
			activity_date: activity.params[1],
			commit_count: activity.params[2],
			repos_active: activity.params[3],
			lines_added: activity.params[4],
			lines_deleted: activity.params[5],
		},
		usage: {
			tenant_id: usage.params[0],
			model: usage.params[1],
			input_tokens: usage.params[2],
			output_tokens: usage.params[3],
			cost_usd: usage.params[4],
		},
	};
}

describe("writeDaySummary", () => {
	it("writes the page, the activity and the usage in one batch", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(db, input());

		expect(asked).toHaveLength(3);
		expect(asked[0].sql).toContain("INSERT INTO timeline_summaries");
		expect(asked[1].sql).toContain("INSERT INTO timeline_activity");
		expect(asked[2].sql).toContain("INSERT INTO timeline_ai_usage");
	});

	it("puts the page where the readers already look for it", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(db, input());
		const { summary } = rows(asked);

		expect(summary.id).toBe("tenant-1-2026-11-21");
		expect(summary.brief_summary).toBe("Two repos, one long day.");
		expect(summary.detailed_timeline).toBe(PAGE.markdown);
		expect(JSON.parse(String(summary.gutter_content))).toEqual(PAGE.gutter);
		expect(summary.voice_preset).toBe("casual");
		expect(summary.ai_model).toBe("deepseek/deepseek-v4.1-flash-1017");
	});

	it("counts the day from its commits, not its word count", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(db, input());
		const { summary, activity } = rows(asked);

		expect(summary.commit_count).toBe(2);
		expect(summary.total_additions).toBe(32);
		expect(summary.total_deletions).toBe(15);
		expect(JSON.parse(String(summary.repos_active))).toEqual(["Lattice", "Sentinel"]);

		// The heatmap reads its own table, so it has to agree with the summary.
		expect(activity.commit_count).toBe(2);
		expect(activity.lines_added).toBe(32);
		expect(activity.lines_deleted).toBe(15);
		expect(JSON.parse(String(activity.repos_active))).toEqual(["Lattice", "Sentinel"]);
	});

	it("carries the run's spend onto the row as well as the usage log", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(db, input());
		const { summary, usage } = rows(asked);

		expect(summary.ai_cost).toBe(0.0076);
		expect(summary.input_tokens).toBe(169_000);
		expect(summary.output_tokens).toBe(13_000);
		expect(usage.cost_usd).toBe(0.0076);
		expect(usage.model).toBe("deepseek/deepseek-v4.1-flash-1017");
	});

	it("never writes a keyword guess into the two context columns", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(db, input());

		// There is no bound value for either: the SQL names them and says NULL.
		expect(asked[0].sql).toContain("context_brief");
		expect(asked[0].sql).toContain("NULL, NULL");
		expect(asked[0].params).toHaveLength(17);
	});

	it("records a continuation as the day it continues and a streak of one", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(
			db,
			input({ page: { ...PAGE, continuation: { day: "2026-11-19", text: "still on it" } } }),
		);
		const { summary } = rows(asked);

		expect(summary.continuation_of).toBe("2026-11-19");
		expect(summary.focus_streak).toBe(1);
	});

	it("writes a day with no commits of its own", async () => {
		const { db, asked } = fakeDb();
		await writeDaySummary(
			db,
			input({
				day: { ...DAY, commits: [] },
				usage: undefined,
			}),
		);
		const { summary, activity, usage } = rows(asked);

		// A merged pull request with no commits to its name is still a day's work,
		// and its page is still the day's page.
		expect(summary.commit_count).toBe(0);
		expect(summary.detailed_timeline).toBe(PAGE.markdown);
		expect(activity.commit_count).toBe(0);
		expect(usage.cost_usd).toBe(0);
	});

	it("does not hide a failed write", async () => {
		const db = {
			prepare: () => ({ bind: () => ({}) }),
			batch: async () => {
				throw new Error("no such table: timeline_summaries");
			},
		} as unknown as D1Database;

		await expect(writeDaySummary(db, input())).rejects.toThrow("no such table");
	});
});
