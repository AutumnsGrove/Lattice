/**
 * The eight tools, driven the way the loop drives them (#1798, slice 2).
 *
 * Each refusal here is a case the one-shot prompt could only ask the model not to
 * do: a repo that is not on the day, a citation from another repo, a line that does
 * not exist, a finish before the day is covered. The message is the correction, so
 * the tests pin what the model actually reads.
 */

import { describe, expect, it } from "vitest";
import { createTimelineRecipe } from "./recipe";
import type { PastDays } from "./tools";
import { callTool, createDay, fakeReader, startState } from "./testing";
import type { TimelineState } from "./state";

function setup(options: { pastDays?: PastDays } = {}) {
	const reader = fakeReader();
	const recipe = createTimelineRecipe({ reader, pastDays: options.pastDays });
	return { recipe, reader, state: startState(recipe) };
}

describe("start_project", () => {
	it("refuses a repo that is not on the day, and says which are", async () => {
		const { recipe, state } = setup();

		const result = await callTool(recipe, state, "start_project", { repo: "lyra" });

		expect(result.outcome.isError).toBe(true);
		expect(result.outcome.content).toBe(
			'there is no repo "lyra" on this day; the repos are Lattice',
		);
		expect(result.state.page.projects).toEqual([]);
	});

	it("starts a project once, and says so when asked again", async () => {
		const { recipe, state } = setup();

		const first = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		const again = await callTool(recipe, first.state, "start_project", { repo: "Lattice" });

		expect(first.outcome.isError).toBe(false);
		expect(again.outcome.content).toBe("Lattice is already started");
		expect(again.state.page.projects).toHaveLength(1);
	});
});

describe("add_line", () => {
	it("refuses a project that was never started", async () => {
		const { recipe, state } = setup();

		const result = await callTool(recipe, state, "add_line", {
			project: "Lattice",
			text: "Wrote the day",
			cites: ["c1"],
		});

		expect(result.outcome.content).toBe(
			'there is no project "Lattice"; no projects are started yet',
		);
	});

	it("refuses a handle the day never minted", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });

		const result = await callTool(recipe, started.state, "add_line", {
			project: "Lattice",
			text: "Wrote the day",
			cites: ["c9"],
		});

		expect(result.outcome.isError).toBe(true);
		expect(result.outcome.content).toContain('there is no handle "c9"');
		expect(result.outcome.content).toContain("c1");
	});

	it("refuses a citation from another repo", async () => {
		const reader = fakeReader();
		const recipe = createTimelineRecipe({ reader });
		const day = createDay({
			repos: ["Lattice", "lyra"],
			commits: [
				...createDay().commits,
				{
					repo: "lyra",
					sha: "ddddddd4444",
					message: "chore: cut the release",
					authorDate: "2026-11-21T13:00:00Z",
					additions: 1,
					deletions: 0,
					merge: false,
				},
			],
		});
		const state = startState(recipe, day);
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });

		const result = await callTool(recipe, started.state, "add_line", {
			project: "Lattice",
			text: "Cut the release",
			cites: ["c3"],
		});

		expect(result.outcome.content).toBe("c3 is a commit in lyra, not Lattice");
	});

	it("mints line ids in order, and adding the same call twice adds one line", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });

		const first = await callTool(
			recipe,
			started.state,
			"add_line",
			{ project: "Lattice", text: "Attached a vine to a line", cites: ["c1"] },
			"call-one",
		);
		const second = await callTool(
			recipe,
			first.state,
			"add_line",
			{ project: "Lattice", text: "Put the marker first", cites: ["c2"] },
			"call-two",
		);
		const repeated = await callTool(
			recipe,
			second.state,
			"add_line",
			{ project: "Lattice", text: "Attached a vine to a line", cites: ["c1"] },
			"call-one",
		);

		expect(first.outcome.content).toBe("added l1: Attached a vine to a line");
		expect(second.outcome.content).toBe("added l2: Put the marker first");
		expect(repeated.state.page.projects[0]?.lines.map((line) => line.id)).toEqual(["l1", "l2"]);
		expect(repeated.state.nextLine).toBe(3);
	});

	it("refuses empty citations before the tool runs", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });

		const result = await callTool(recipe, started.state, "add_line", {
			project: "Lattice",
			text: "No citation",
			cites: [],
		});

		expect(result.outcome.isError).toBe(true);
		expect(result.outcome.content).toContain("cites");
	});
});

describe("add_vine", () => {
	it("refuses a line that does not exist, and names the lines", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });

		const empty = await callTool(recipe, started.state, "add_vine", { line: "l9", text: "aside" });
		expect(empty.outcome.content).toBe('there is no line "l9"; no lines are on the page yet');

		const line = await callTool(
			recipe,
			started.state,
			"add_line",
			{ project: "Lattice", text: "Attached a vine", cites: ["c1"] },
			"call-one",
		);
		const missing = await callTool(recipe, line.state, "add_vine", { line: "l9", text: "aside" });
		expect(missing.outcome.content).toBe('there is no line "l9"; the lines are l1');
	});

	it("attaches a vine to an existing line, once", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		const line = await callTool(
			recipe,
			started.state,
			"add_line",
			{ project: "Lattice", text: "Attached a vine", cites: ["c1"] },
			"call-one",
		);

		const first = await callTool(
			recipe,
			line.state,
			"add_vine",
			{ line: "l1", text: "finally, the marker worked" },
			"vine-one",
		);
		const repeated = await callTool(
			recipe,
			first.state,
			"add_vine",
			{ line: "l1", text: "finally, the marker worked" },
			"vine-one",
		);

		expect(first.outcome.content).toBe("attached a vine to l1");
		expect(repeated.state.page.vines).toEqual([{ line: "l1", text: "finally, the marker worked" }]);
	});
});

describe("fitting the page to its budget", () => {
	async function threeHundredWordLines(
		recipe: ReturnType<typeof createTimelineRecipe>,
		state: TimelineState,
	) {
		const line = "word ".repeat(300).trim();
		let current = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		current = await callTool(recipe, current.state, "set_brief", { text: "A long day." });
		for (const [index, cite] of ["c1", "c2"].entries()) {
			current = await callTool(
				recipe,
				current.state,
				"add_line",
				{ project: "Lattice", text: line, cites: [cite] },
				`line-${index}`,
			);
			expect(current.outcome.isError).toBe(false);
		}
		return current.state;
	}

	it("refuses a line that would take the page past the budget, and says how to fit it", async () => {
		// The default budget is over a thousand words now, so this pins its own.
		const reader = fakeReader();
		const recipe = createTimelineRecipe({ reader, maxWords: 650 });
		const two = await threeHundredWordLines(recipe, startState(recipe));

		const refused = await callTool(
			recipe,
			two,
			"add_line",
			{ project: "Lattice", text: "word ".repeat(100).trim(), cites: ["pr1"] },
			"line-2",
		);

		expect(refused.outcome.isError).toBe(true);
		expect(refused.outcome.content).toContain("past the 650-word budget");
		expect(refused.outcome.content).toContain("edit_line");
		// The page did not grow.
		expect(refused.state.page.projects[0]?.lines).toHaveLength(2);
	});

	it("lets a too-long line be rewritten shorter", async () => {
		// A page that is inside the budget, whose line can still grow past it. The
		// per-line length cap is 2,000 characters, so the budget here is what an edit
		// can cross (~380 words is 1,899 characters).
		const reader = fakeReader();
		const recipe = createTimelineRecipe({ reader, maxWords: 550 });
		const line = "word ".repeat(250).trim();
		let current = await callTool(recipe, startState(recipe), "start_project", { repo: "Lattice" });
		for (const [index, cite] of ["c1", "c2"].entries()) {
			current = await callTool(
				recipe,
				current.state,
				"add_line",
				{ project: "Lattice", text: line, cites: [cite] },
				`line-${index}`,
			);
			expect(current.outcome.isError).toBe(false);
		}

		const longer = await callTool(recipe, current.state, "edit_line", {
			line: "l1",
			text: "word ".repeat(380).trim(),
		});
		expect(longer.outcome.isError).toBe(true);
		expect(longer.outcome.content).toContain("past the 550-word budget");

		const shorter = await callTool(recipe, current.state, "edit_line", {
			line: "l1",
			text: "One thread, told once.",
		});
		expect(shorter.outcome.isError).toBe(false);
		expect(shorter.state.page.projects[0]?.lines[0]?.text).toBe("One thread, told once.");
	});

	it("removes a line and the vine that hung on it", async () => {
		const { recipe, state } = setup();
		const two = await threeHundredWordLines(recipe, state);
		const withVine = await callTool(recipe, two, "add_vine", {
			line: "l2",
			text: "an aside",
		});

		const removed = await callTool(recipe, withVine.state, "remove_line", { line: "l1" });

		expect(removed.outcome.isError).toBe(false);
		expect(removed.state.page.projects[0]?.lines.map((line) => line.id)).toEqual(["l2"]);
		expect(removed.state.page.vines).toEqual([{ line: "l2", text: "an aside" }]);

		const gone = await callTool(recipe, removed.state, "remove_line", { line: "l2" });
		expect(gone.state.page.vines).toEqual([]);
	});

	it("folds one line's citations into another, so a merge keeps the day covered", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		const first = await callTool(
			recipe,
			started.state,
			"add_line",
			{ project: "Lattice", text: "The day fetcher landed.", cites: ["c1"] },
			"line-1",
		);
		const second = await callTool(
			recipe,
			first.state,
			"add_line",
			{ project: "Lattice", text: "And the marker moved.", cites: ["c2"] },
			"line-2",
		);

		// Merge: fold l2's handle into l1, then drop l2.
		const merged = await callTool(recipe, second.state, "edit_line", {
			line: "l1",
			text: "The day fetcher landed and the marker moved.",
			cites: ["c2"],
		});
		const removed = await callTool(recipe, merged.state, "remove_line", { line: "l2" });
		const briefed = await callTool(recipe, removed.state, "set_brief", {
			text: "A day of the fetcher.",
		});
		const covered = await callTool(
			recipe,
			briefed.state,
			"add_line",
			{ project: "Lattice", text: "The pull request merged.", cites: ["pr1"] },
			"line-3",
		);
		const covered2 = await callTool(
			recipe,
			covered.state,
			"add_line",
			{ project: "Lattice", text: "Left a note on the issue.", cites: ["i1"] },
			"line-4",
		);

		expect(merged.outcome.content).toBe("rewrote l1, now citing c2");
		expect(removed.state.page.projects[0]?.lines).toHaveLength(1);
		expect(removed.state.page.projects[0]?.lines[0]?.cites).toEqual(["c1", "c2"]);

		const finished = await callTool(recipe, covered2.state, "finish", {});
		expect(finished.outcome.isError).toBe(false);
	});

	it("refuses a folded citation from another repo", async () => {
		const { recipe, state } = setup();
		const started = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		const line = await callTool(recipe, started.state, "add_line", {
			project: "Lattice",
			text: "One thing.",
			cites: ["c1"],
		});

		const refused = await callTool(recipe, line.state, "edit_line", {
			line: "l1",
			text: "One thing.",
			cites: ["zz1"],
		});

		expect(refused.outcome.isError).toBe(true);
		expect(refused.outcome.content).toContain('there is no handle "zz1"');
	});

	it("refuses an edit to a line that does not exist", async () => {
		const { recipe, state } = setup();

		const refused = await callTool(recipe, state, "edit_line", { line: "l9", text: "nothing" });

		expect(refused.outcome.content).toBe('there is no line "l9"; no lines are on the page yet');
	});
});

describe("set_brief", () => {
	it("writes the headline, and the last call wins", async () => {
		const { recipe, state } = setup();

		const first = await callTool(recipe, state, "set_brief", { text: "One busy day." }, "brief-1");
		const second = await callTool(
			recipe,
			first.state,
			"set_brief",
			{ text: "One busy day, mostly on the timeline." },
			"brief-2",
		);

		expect(first.outcome.isError).toBe(false);
		expect(second.state.page.brief).toBe("One busy day, mostly on the timeline.");
	});
});

describe("mark_continuation", () => {
	it("refuses a malformed day, and this very day", async () => {
		const { recipe, state } = setup();

		const malformed = await callTool(recipe, state, "mark_continuation", {
			day: "21-11-2026",
			text: "still the same thread",
		});
		expect(malformed.outcome.content).toContain("needs a day like 2026-11-17");

		const today = await callTool(recipe, state, "mark_continuation", {
			day: "2026-11-21",
			text: "still the same thread",
		});
		expect(today.outcome.content).toContain("points at an earlier day");
	});

	it("records a continuation of an earlier day", async () => {
		const { recipe, state } = setup();

		const result = await callTool(recipe, state, "mark_continuation", {
			day: "2026-11-19",
			text: "day two of the day fetcher",
		});

		expect(result.outcome.isError).toBe(false);
		expect(result.state.page.continuation).toEqual({
			day: "2026-11-19",
			text: "day two of the day fetcher",
		});
	});
});

describe("get_diff and get_issue_thread", () => {
	it("refuses a handle that is not on the day", async () => {
		const { recipe, state } = setup();

		const diff = await callTool(recipe, state, "get_diff", { handle: "zz1" });

		expect(diff.outcome.isError).toBe(true);
		expect(diff.outcome.content).toContain('there is no handle "zz1"');
	});

	it("reads a diff for a commit and a thread for an issue", async () => {
		const { recipe, reader, state } = setup();

		const diff = await callTool(recipe, state, "get_diff", { handle: "c1" });
		const thread = await callTool(recipe, state, "get_issue_thread", { handle: "i1" });

		expect(diff.outcome.content).toBe("diff --git a/x b/x");
		expect(thread.outcome.isError).toBe(false);
		expect(reader.diffCalls).toEqual([{ kind: "commit", repo: "Lattice", sha: "aaaaaaa1111" }]);
		expect(reader.threadCalls).toEqual([{ kind: "issue", repo: "Lattice", number: 1798 }]);
	});

	it("passes a pull request's handle to the diff reader", async () => {
		const { recipe, reader, state } = setup();

		await callTool(recipe, state, "get_diff", { handle: "pr1" });

		expect(reader.diffCalls).toEqual([{ kind: "pull", repo: "Lattice", number: 1804 }]);
	});

	it("hands a GitHub failure back as an error result, not a crash", async () => {
		const reader = fakeReader({ diff: { ok: false, message: "GitHub answered 403 for /x" } });
		const recipe = createTimelineRecipe({ reader });
		const state = startState(recipe);

		const result = await callTool(recipe, state, "get_diff", { handle: "c1" });

		expect(result.outcome.isError).toBe(true);
		expect(result.outcome.content).toBe("GitHub answered 403 for /x");
	});
});

describe("search_past_days", () => {
	it("says so when the run has no earlier days", async () => {
		const { recipe, state } = setup();

		const result = await callTool(recipe, state, "search_past_days", { query: "vine" });

		expect(result.outcome.isError).toBe(true);
		expect(result.outcome.content).toContain("earlier days are not available");
	});

	it("renders earlier days with their dates", async () => {
		const pastDays: PastDays = {
			async search(query) {
				expect(query).toBe("vine");
				return [
					{ date: "2026-11-19", text: "day two of the day fetcher" },
					{ date: "2026-11-18", text: "started the day fetcher" },
				];
			},
		};
		const { recipe, state } = setup({ pastDays });

		const result = await callTool(recipe, state, "search_past_days", { query: "vine" });

		expect(result.outcome.isError).toBe(false);
		expect(result.outcome.content).toBe(
			"2026-11-19: day two of the day fetcher\n2026-11-18: started the day fetcher",
		);
	});

	it("says when nothing matches", async () => {
		const pastDays: PastDays = { search: async () => [] };
		const { recipe, state } = setup({ pastDays });

		const result = await callTool(recipe, state, "search_past_days", { query: "nothing" });

		expect(result.outcome.content).toBe('no earlier day mentions "nothing"');
	});
});

describe("finish", () => {
	async function withBrief(
		recipe: ReturnType<typeof createTimelineRecipe>,
		state: TimelineState,
	): Promise<TimelineState> {
		const brief = await callTool(recipe, state, "set_brief", {
			text: "Attached a vine to a line, and kept the run.",
		});
		return brief.state;
	}

	async function coverEverything(
		recipe: ReturnType<typeof createTimelineRecipe>,
		state: TimelineState,
	): Promise<TimelineState> {
		let current = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		let next = await withBrief(recipe, current.state);
		for (const [index, cite] of ["c1", "c2", "pr1", "i1"].entries()) {
			current = await callTool(
				recipe,
				next,
				"add_line",
				{ project: "Lattice", text: `line ${index + 1}`, cites: [cite] },
				`line-${index}`,
			);
			next = current.state;
		}
		return next;
	}

	it("refuses until the page has a brief", async () => {
		const { recipe, state } = setup();

		const refused = await callTool(recipe, state, "finish", {});

		expect(refused.outcome.isError).toBe(true);
		expect(refused.outcome.content).toContain("needs a brief");
		expect(refused.outcome.content).toContain("set_brief");
	});

	it("refuses until every handle is covered, naming what is missing by kind", async () => {
		const { recipe, state } = setup();
		let current = await callTool(recipe, state, "start_project", { repo: "Lattice" });
		current = await callTool(
			recipe,
			current.state,
			"add_line",
			{ project: "Lattice", text: "Attached a vine", cites: ["c1"] },
			"line-1",
		);
		const withBriefState = await withBrief(recipe, current.state);

		const refused = await callTool(recipe, withBriefState, "finish", {});

		expect(refused.outcome.isError).toBe(true);
		expect(refused.outcome.content).toBe(
			"not covered yet: 1 commit (c2), 1 pull request (pr1), 1 issue (i1)",
		);
	});

	it("accepts a day where everything is covered", async () => {
		const { recipe, state } = setup();
		const covered = await coverEverything(recipe, state);

		const result = await callTool(recipe, covered, "finish", {});

		expect(result.outcome.isError).toBe(false);
		expect(result.outcome.content).toBe("finished");
	});

	it("accepts a skip with a reason, and refuses one without", async () => {
		const { recipe, state } = setup();
		const covered = await coverEverything(recipe, state);

		const noReason = await callTool(recipe, covered, "finish", {
			skipped: [{ handle: "c2", reason: "  " }],
		});
		expect(noReason.outcome.isError).toBe(true);
		expect(noReason.outcome.content).toContain("a skip needs a reason");

		const unknown = await callTool(recipe, covered, "finish", {
			skipped: [{ handle: "c9", reason: "not mine" }],
		});
		expect(unknown.outcome.content).toContain('there is no handle "c9"');

		const skipped = await callTool(recipe, covered, "finish", {
			skipped: [{ handle: "c2", reason: "same thread as c1" }],
		});
		expect(skipped.outcome.isError).toBe(false);
		expect(skipped.outcome.details).toEqual({
			skipped: [{ handle: "c2", reason: "same thread as c1" }],
		});
	});

	it("still refuses a page an unguarded addition pushed over the budget", async () => {
		// add_line and edit_line refuse to cross the budget; the brief does not, so the
		// check on finish is the backstop that catches a page already over it.
		const reader = fakeReader();
		const recipe = createTimelineRecipe({ reader, maxWords: 10 });
		const started = await callTool(recipe, startState(recipe), "start_project", {
			repo: "Lattice",
		});
		const line = await callTool(
			recipe,
			started.state,
			"add_line",
			{ project: "Lattice", text: "one two three four five", cites: ["c1"] },
			"line-1",
		);
		const briefed = await callTool(recipe, line.state, "set_brief", {
			text: "a b c d e f g",
		});

		const refused = await callTool(recipe, briefed.state, "finish", {});

		expect(refused.outcome.isError).toBe(true);
		expect(refused.outcome.content).toContain("12 words and the budget is 10");
		expect(refused.outcome.content).toContain("merge related work into one line");
	});

	it("accepts a day with nothing written, when everything is skipped", async () => {
		const { recipe, state } = setup();
		const briefed = await withBrief(recipe, state);

		const result = await callTool(recipe, briefed, "finish", {
			skipped: [
				{ handle: "c1", reason: "one thread with c2" },
				{ handle: "c2", reason: "one thread with c1" },
				{ handle: "pr1", reason: "the pull request merged c1 and c2" },
				{ handle: "i1", reason: "the issue thread is the pull request" },
			],
		});

		expect(result.outcome.isError).toBe(false);
	});
});
