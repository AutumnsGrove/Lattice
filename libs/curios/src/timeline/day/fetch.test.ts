/**
 * The day, against a fake GitHub (#1798, slice 1).
 *
 * The cases are the ones that were bugs elsewhere: a commit written today and
 * merged tomorrow, a pull request whose merge commit must not be counted twice,
 * an issue that was merely edited, and a repo that fails while the rest of the
 * day survives.
 */

import { describe, expect, it } from "vitest";
import { fetchTimelineDay, type FetchLike } from "./fetch";

type Route = (url: URL) => unknown | undefined;

interface Fake {
	fetch: FetchLike;
	requests: string[];
}

function fakeGitHub(routes: Route[]): Fake {
	const requests: string[] = [];
	const fetchImpl = async (input: string, _init?: RequestInit) => {
		const url = new URL(input);
		requests.push(url.toString());
		for (const route of routes) {
			const data = route(url);
			if (data !== undefined) {
				return new Response(JSON.stringify(data), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
		}
		return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
	};
	return { fetch: fetchImpl, requests };
}

const DAY = {
	username: "autumn",
	token: "token",
	date: "2026-11-21",
	timezone: "America/Los_Angeles",
	delayMs: 0,
} as const;

/** A repo's commit list, and the per-commit detail calls that carry the stats. */
function commitsRoute(
	repoPath: string,
	commits: unknown[],
	stats: Record<string, unknown> = {},
): Route {
	const list = `${repoPath}/commits`;
	return (url) => {
		if (url.pathname === list) {
			return url.searchParams.get("page") === "1" ? commits : [];
		}
		if (url.pathname.startsWith(`${list}/`)) {
			return stats[url.pathname.slice(list.length + 1)];
		}
		return undefined;
	};
}

function listRoute(path: string, pageOne: unknown[]): Route {
	return (url) => {
		if (url.pathname !== path) return undefined;
		return url.searchParams.get("page") === "1" ? pageOne : [];
	};
}

const MERGED_COMMIT = {
	sha: "bbb2222",
	parents: [{ sha: "p1" }, { sha: "p2" }],
	commit: {
		message: "Merge pull request #7 from feat/day",
		author: { date: "2026-11-21T21:00:00Z" },
	},
};

const WORK_COMMIT = {
	sha: "aaa1111",
	parents: [{ sha: "p1" }],
	commit: {
		message: "feat(timeline): attach a vine to a line",
		author: { date: "2026-11-21T20:00:00Z" },
	},
};

describe("fetchTimelineDay", () => {
	it("reads a day: commits, a merged pull request, and a commented issue", async () => {
		const github = fakeGitHub([
			commitsRoute(
				"/repos/autumn/Lattice",
				[
					WORK_COMMIT,
					MERGED_COMMIT,
					{
						sha: "ccc3333",
						parents: [{ sha: "p1" }],
						commit: { message: "three days ago", author: { date: "2026-11-17T20:00:00Z" } },
					},
				],
				{
					aaa1111: { sha: "aaa1111", stats: { additions: 12, deletions: 3 } },
					bbb2222: { sha: "bbb2222", stats: { additions: 40, deletions: 5 } },
				},
			),
			(url) =>
				url.pathname === "/repos/autumn/Lattice/pulls/7"
					? { merge_commit_sha: "bbb2222", additions: 40, deletions: 5, changed_files: 3 }
					: undefined,
			listRoute("/repos/autumn/Lattice/issues", [
				{
					number: 7,
					title: "Add the day",
					html_url: "https://github.com/autumn/Lattice/pull/7",
					state: "closed",
					created_at: "2026-11-21T19:00:00Z",
					closed_at: "2026-11-21T21:00:00Z",
					updated_at: "2026-11-21T21:05:00Z",
					comments: 2,
					user: { login: "autumn" },
					pull_request: {
						html_url: "https://github.com/autumn/Lattice/pull/7",
						merged_at: "2026-11-21T21:00:00Z",
					},
				},
				{
					number: 8,
					title: "Timeline idea",
					html_url: "https://github.com/autumn/Lattice/issues/8",
					state: "open",
					created_at: "2026-11-18T12:00:00Z",
					closed_at: null,
					updated_at: "2026-11-21T22:00:00Z",
					comments: 1,
					user: { login: "friend" },
				},
				{
					number: 9,
					title: "Retitled, nothing happened",
					html_url: "https://github.com/autumn/Lattice/issues/9",
					state: "open",
					created_at: "2026-11-10T12:00:00Z",
					closed_at: null,
					updated_at: "2026-11-21T22:30:00Z",
					comments: 0,
					user: { login: "friend" },
				},
			]),
			listRoute("/repos/autumn/Lattice/issues/comments", [
				{
					id: 1,
					created_at: "2026-11-21T22:00:00Z",
					issue_url: "https://api.github.com/repos/autumn/Lattice/issues/8",
					user: { login: "autumn" },
				},
				{
					id: 2,
					created_at: "2026-11-21T22:10:00Z",
					issue_url: "https://api.github.com/repos/autumn/Lattice/issues/9",
					user: { login: "friend" },
				},
			]),
		]);

		const day = await fetchTimelineDay({ ...DAY, repos: ["Lattice"], fetch: github.fetch });

		expect(day.repos).toEqual(["Lattice"]);
		expect(day.commits).toHaveLength(1);
		expect(day.commits[0]).toMatchObject({
			sha: "aaa1111",
			repo: "Lattice",
			additions: 12,
			deletions: 3,
			merge: false,
		});

		expect(day.pulls).toHaveLength(1);
		expect(day.pulls[0]).toMatchObject({
			repo: "Lattice",
			number: 7,
			activity: ["opened", "merged"],
			merged: true,
			mergeCommit: "bbb2222",
			additions: 40,
			deletions: 5,
			changedFiles: 3,
		});

		expect(day.issues).toHaveLength(1);
		expect(day.issues[0]).toMatchObject({
			repo: "Lattice",
			number: 8,
			activity: ["commented"],
		});
		expect(day.warnings).toEqual([]);
	});

	it("attributes a commit by author date in the tenant's timezone", async () => {
		const github = fakeGitHub([
			commitsRoute("/repos/autumn/Lattice", [
				{
					sha: "evening",
					parents: [{ sha: "p1" }],
					// 21:00 on the 21st in Los Angeles.
					commit: { message: "late work", author: { date: "2026-11-22T05:00:00Z" } },
				},
				{
					sha: "next-day",
					parents: [{ sha: "p1" }],
					// 01:00 on the 22nd in Los Angeles.
					commit: { message: "not today", author: { date: "2026-11-22T09:00:00Z" } },
				},
			]),
			listRoute("/repos/autumn/Lattice/issues", []),
			listRoute("/repos/autumn/Lattice/issues/comments", []),
		]);

		const day = await fetchTimelineDay({ ...DAY, repos: ["Lattice"], fetch: github.fetch });

		expect(day.commits.map((commit) => commit.sha)).toEqual(["evening"]);
	});

	it("keeps the rest of the day when one repo fails", async () => {
		const github = fakeGitHub([
			(url) => {
				if (url.pathname === "/repos/autumn/Fine/commits") {
					return url.searchParams.get("page") === "1" ? [WORK_COMMIT] : [];
				}
				if (url.pathname === "/repos/autumn/Fine/issues") return [];
				if (url.pathname === "/repos/autumn/Fine/issues/comments") return [];
				return undefined;
			},
		]);

		const day = await fetchTimelineDay({
			...DAY,
			repos: ["Broken", "Fine"],
			fetch: github.fetch,
		});

		expect(day.commits.map((commit) => commit.repo)).toEqual(["Fine"]);
		expect(day.warnings.map((warning) => warning.repo)).toEqual(["Broken", "Broken"]);
	});

	it("discovers owned repos, skips forks, and applies the exclude list", async () => {
		const github = fakeGitHub([
			(url) =>
				url.pathname === "/users/autumn/repos"
					? [
							{ name: "Keep", full_name: "autumn/Keep", fork: false },
							{ name: "Fork", full_name: "autumn/Fork", fork: true },
							{ name: "Skip", full_name: "autumn/Skip", fork: false },
						]
					: undefined,
			(url) => {
				if (url.pathname === "/repos/autumn/Keep/commits") {
					return url.searchParams.get("page") === "1" ? [WORK_COMMIT] : [];
				}
				if (url.pathname.endsWith("/issues") || url.pathname.endsWith("/comments")) {
					return [];
				}
				return undefined;
			},
		]);

		const day = await fetchTimelineDay({
			...DAY,
			exclude: ["Skip"],
			fetch: github.fetch,
		});

		expect(day.commits.map((commit) => commit.repo)).toEqual(["Keep"]);
		expect(github.requests.some((url) => url.includes("/repos/autumn/Skip/"))).toBe(false);
		expect(github.requests.some((url) => url.includes("/repos/autumn/Fork/"))).toBe(false);
	});

	it("warns when a list is longer than the page cap", async () => {
		const many = Array.from({ length: 100 }, (_, index) => ({
			number: index + 1,
			title: `issue ${index + 1}`,
			html_url: `https://github.com/autumn/Lattice/issues/${index + 1}`,
			state: "open",
			created_at: "2026-11-18T12:00:00Z",
			closed_at: null,
			updated_at: "2026-11-21T22:00:00Z",
			comments: 0,
			user: { login: "friend" },
		}));

		const github = fakeGitHub([
			listRoute("/repos/autumn/Lattice/commits", []),
			listRoute("/repos/autumn/Lattice/issues", many),
			listRoute("/repos/autumn/Lattice/issues/comments", []),
		]);

		const day = await fetchTimelineDay({
			...DAY,
			repos: ["Lattice"],
			maxPages: 1,
			fetch: github.fetch,
		});

		expect(day.warnings).toHaveLength(1);
		expect(day.warnings[0]?.message).toContain("stopped after 1 pages");
	});

	it("calls the platform fetch with the global as its receiver", async () => {
		// workerd throws "Illegal invocation" for a detached `globalThis.fetch(...)`,
		// which is exactly what a copied function reference is. This fake behaves the
		// same way, so the regression cannot come back unnoticed.
		const original = globalThis.fetch;
		let receiver: unknown = "never called";
		globalThis.fetch = function (this: unknown) {
			receiver = this;
			return Promise.resolve(Response.json([]));
		} as unknown as typeof globalThis.fetch;

		try {
			await fetchTimelineDay({ ...DAY, repos: ["Lattice"] });
		} finally {
			globalThis.fetch = original;
		}

		expect(receiver).toBe(globalThis);
	});

	it("refuses a date that is not a calendar day", async () => {
		await expect(
			fetchTimelineDay({ ...DAY, date: "2026-02-31", fetch: fakeGitHub([]).fetch }),
		).rejects.toThrow(/YYYY-MM-DD/);
	});
});
