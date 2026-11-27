/**
 * Naming the day (#1798, slice 1).
 *
 * The property that matters is determinism: the same day minted twice has to
 * produce the same handles, because a resumed run rebuilds the table from the
 * saved day rather than trusting what the model remembers.
 */

import { describe, expect, it } from "vitest";
import { mintDayHandles, type HandleMinter } from "./handles";
import type { TimelineDay } from "./types";

/** A stand-in for Lyra's table: one counter per kind, deduped by target. */
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
				sha: "aaa1111",
				message: "one",
				authorDate: "2026-11-21T10:00:00Z",
				additions: 1,
				deletions: 1,
				merge: false,
			},
			{
				repo: "Lattice",
				sha: "bbb2222",
				message: "two",
				authorDate: "2026-11-21T11:00:00Z",
				additions: 2,
				deletions: 0,
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
				comments: 0,
				additions: 4,
				deletions: 2,
				changedFiles: 1,
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

describe("mintDayHandles", () => {
	it("names commits, then pull requests, then issues", () => {
		const handles = mintDayHandles(createDay(), createMinter());

		expect(handles.all()).toEqual(["c1", "c2", "pr1", "i1"]);
		expect(handles.commit("Lattice", "aaa1111")).toBe("c1");
		expect(handles.commit("Lattice", "bbb2222")).toBe("c2");
		expect(handles.pull("Lattice", 7)).toBe("pr1");
		expect(handles.issue("Lattice", 8)).toBe("i1");
	});

	it("knows what each handle names", () => {
		const handles = mintDayHandles(createDay(), createMinter());

		expect(handles.target("c1")).toEqual({
			kind: "commit",
			repo: "Lattice",
			sha: "aaa1111",
		});
		expect(handles.target("pr1")).toEqual({ kind: "pull", repo: "Lattice", number: 7 });
		expect(handles.target("i1")).toEqual({ kind: "issue", repo: "Lattice", number: 8 });
		expect(handles.target("i99")).toBeUndefined();
	});

	it("is a miss, not a wrong answer, for something off the day", () => {
		const handles = mintDayHandles(createDay(), createMinter());

		expect(handles.commit("Lattice", "ffff9999")).toBeUndefined();
		expect(handles.commit("Other", "aaa1111")).toBeUndefined();
		expect(handles.pull("Lattice", 7)).toBe("pr1");
		expect(handles.issue("Lattice", 7)).toBeUndefined();
	});

	it("mints the same names for the same day twice", () => {
		const day = createDay();
		const first = mintDayHandles(day, createMinter());
		const second = mintDayHandles(day, createMinter());

		expect(second.all()).toEqual(first.all());
	});

	it("keeps numbers apart across repos", () => {
		const day = createDay({
			repos: ["Fern", "Lattice"],
			issues: [
				{
					repo: "Fern",
					number: 8,
					title: "One",
					url: "https://github.com/autumn/Fern/issues/8",
					activity: ["opened"],
					state: "open",
					createdAt: "2026-11-21T10:00:00Z",
					closedAt: null,
					comments: 0,
				},
				{
					repo: "Lattice",
					number: 8,
					title: "Two",
					url: "https://github.com/autumn/Lattice/issues/8",
					activity: ["opened"],
					state: "open",
					createdAt: "2026-11-21T10:00:00Z",
					closedAt: null,
					comments: 0,
				},
			],
			pulls: [],
		});

		const handles = mintDayHandles(day, createMinter());

		expect(handles.issue("Fern", 8)).toBe("i1");
		expect(handles.issue("Lattice", 8)).toBe("i2");
	});
});
