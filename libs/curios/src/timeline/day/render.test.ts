/**
 * The day as the model reads it (#1798, slice 1).
 *
 * The text is an interface, so the tests pin it: a change here changes what the
 * model is told. Grouping by repo matters because `start_project` takes a repo,
 * and the merge marker matters because a housekeeping merge is not a day's work.
 */

import { describe, expect, it } from "vitest";
import { mintDayHandles, type HandleMinter } from "./handles";
import { renderDay } from "./render";
import type { TimelineDay } from "./types";

function createMinter(): HandleMinter {
	const counters = new Map<string, number>();
	const byTarget = new Map<string, string>();
	return {
		mint(kind, target) {
			const key = `${kind}:${JSON.stringify(target)}`;
			const known = byTarget.get(key);
			if (known !== undefined) return known;
			const next = (counters.get(kind) ?? 0) + 1;
			counters.set(kind, next);
			const handle = `${kind}${next}`;
			byTarget.set(key, handle);
			return handle;
		},
	};
}

function createDay(overrides: Partial<TimelineDay> = {}): TimelineDay {
	return {
		date: "2026-11-21",
		timezone: "America/Los_Angeles",
		githubUsername: "autumn",
		repos: ["Lattice"],
		commits: [
			{
				repo: "Lattice",
				sha: "aaaaaaa1111",
				message: "feat(timeline): attach a vine to a line\n\nAnd a body nobody needs twice.",
				authorDate: "2026-11-21T10:00:00Z",
				additions: 12,
				deletions: 3,
				merge: false,
			},
		],
		pulls: [
			{
				repo: "Lattice",
				number: 7,
				title: "Add the day",
				url: "https://github.com/autumn/Lattice/pull/7",
				activity: ["opened", "merged"],
				state: "closed",
				merged: true,
				createdAt: "2026-11-21T10:00:00Z",
				closedAt: "2026-11-21T12:00:00Z",
				mergedAt: "2026-11-21T12:00:00Z",
				comments: 2,
				additions: 40,
				deletions: 5,
				changedFiles: 3,
				mergeCommit: "bbb2222",
			},
		],
		issues: [
			{
				repo: "Lattice",
				number: 8,
				title: "Timeline idea",
				url: "https://github.com/autumn/Lattice/issues/8",
				activity: ["commented"],
				state: "open",
				createdAt: "2026-11-18T10:00:00Z",
				closedAt: null,
				comments: 1,
			},
		],
		warnings: [],
		...overrides,
	};
}

describe("renderDay", () => {
	it("renders a day grouped by repo, with handles and activity", () => {
		const day = createDay();
		const text = renderDay(day, mintDayHandles(day, createMinter()));

		expect(text).toBe(
			[
				"The day is 2026-11-21 in America/Los_Angeles, with activity in 1 repo: Lattice.",
				"",
				"## Lattice — 1 commit, 1 pull request, 1 issue",
				"",
				"Commits:",
				"- c1 aaaaaaa +12/-3 feat(timeline): attach a vine to a line",
				"",
				"Pull requests:",
				"- pr1 #7 Add the day — opened, merged (+40/-5, 3 files)",
				"",
				"Issues:",
				"- i1 #8 Timeline idea — commented",
			].join("\n"),
		);
	});

	it("marks a housekeeping merge so it is not mistaken for work", () => {
		const day = createDay({
			pulls: [],
			issues: [],
			commits: [
				{
					repo: "Lattice",
					sha: "ccccccc9999",
					message: "Merge branch 'main' into feat/timeline",
					authorDate: "2026-11-21T10:00:00Z",
					additions: 0,
					deletions: 0,
					merge: true,
				},
			],
		});

		const text = renderDay(day, mintDayHandles(day, createMinter()));

		expect(text).toContain("- c1 ccccccc +0/-0 (merge) Merge branch 'main' into feat/timeline");
	});

	it("says so when nothing happened", () => {
		const day = createDay({ repos: [], commits: [], pulls: [], issues: [] });
		const text = renderDay(day, mintDayHandles(day, createMinter()));

		expect(text).toBe(
			"The day is 2026-11-21 in America/Los_Angeles. Nothing happened on any repo.",
		);
	});

	it("names the parts of the day it could not read", () => {
		const day = createDay({
			warnings: [
				{ repo: "Fern", message: "could not read commits: GitHub answered 500" },
				{ repo: null, message: "repo discovery stopped after 10 pages" },
			],
		});

		const text = renderDay(day, mintDayHandles(day, createMinter()));

		expect(text).toContain(
			"Could not read part of the day:\n- Fern: could not read commits: GitHub answered 500\n- the day: repo discovery stopped after 10 pages",
		);
	});

	it("refuses handles minted for another day", () => {
		const day = createDay();
		const other = createDay({ commits: [], pulls: [], issues: [] });
		const handles = mintDayHandles(other, createMinter());

		expect(() => renderDay(day, handles)).toThrow(/not minted for commit/);
	});
});
