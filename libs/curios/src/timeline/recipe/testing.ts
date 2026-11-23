/**
 * Shared fixtures for the recipe's tests.
 *
 * Not part of the package's exports (`./timeline/recipe` maps to `index.ts`), so a
 * consumer cannot import it: it exists so `tools.test.ts` and `run.test.ts` build
 * the same day and drive tools the way the loop does.
 */

import { formatErrors, type Recipe, type Tool, type ToolOutcome } from "@autumnsgrove/lyra";
import type { TimelineDay } from "../day/types";
import type { GitHubReader, ReaderResult } from "./github";
import type { TimelineState } from "./state";

const DAY: TimelineDay = {
	date: "2026-11-21",
	timezone: "America/Los_Angeles",
	githubUsername: "autumn",
	repos: ["Lattice"],
	commits: [
		{
			repo: "Lattice",
			sha: "aaaaaaa1111",
			message: "feat(timeline): attach a vine to a line",
			authorDate: "2026-11-21T10:00:00Z",
			additions: 12,
			deletions: 3,
			merge: false,
		},
		{
			repo: "Lattice",
			sha: "bbbbbbb2222",
			message: "fix(timeline): place the marker at the start of the line",
			authorDate: "2026-11-21T11:00:00Z",
			additions: 4,
			deletions: 1,
			merge: false,
		},
	],
	pulls: [
		{
			repo: "Lattice",
			number: 1804,
			title: "Fetch the day, merges included",
			url: "https://github.com/autumn/Lattice/pull/1804",
			activity: ["opened", "merged"],
			state: "closed",
			merged: true,
			createdAt: "2026-11-21T09:00:00Z",
			closedAt: "2026-11-21T12:00:00Z",
			mergedAt: "2026-11-21T12:00:00Z",
			comments: 2,
			additions: 340,
			deletions: 20,
			changedFiles: 9,
			mergeCommit: "ccccccc3333",
		},
	],
	issues: [
		{
			repo: "Lattice",
			number: 1798,
			title: "Timeline: let an agent write the day",
			url: "https://github.com/autumn/Lattice/issues/1798",
			activity: ["commented"],
			state: "open",
			createdAt: "2026-11-19T09:00:00Z",
			closedAt: null,
			comments: 3,
		},
	],
	warnings: [],
};

/** The day every test writes about, unless it says otherwise. */
export function createDay(overrides: Partial<TimelineDay> = {}): TimelineDay {
	return { ...DAY, ...overrides };
}

/** A reader that answers with fixed text and records what was asked for. */
export function fakeReader(
	options: {
		diff?: ReaderResult;
		thread?: ReaderResult;
	} = {},
): GitHubReader & { diffCalls: unknown[]; threadCalls: unknown[] } {
	const diffCalls: unknown[] = [];
	const threadCalls: unknown[] = [];
	return {
		diffCalls,
		threadCalls,
		async diff(target) {
			diffCalls.push(target);
			return options.diff ?? { ok: true, text: "diff --git a/x b/x" };
		},
		async thread(target) {
			threadCalls.push(target);
			return (
				options.thread ?? { ok: true, text: "#1798 Timeline: let an agent write the day (open)" }
			);
		},
	};
}

/** The state `setup` builds for a day, which every test starts from. */
export function startState(recipe: Recipe<TimelineState>, day = createDay()): TimelineState {
	if (recipe.setup === undefined) {
		throw new Error("the timeline recipe has no setup");
	}
	return recipe.setup(day as never).state;
}

export function toolOf<S>(recipe: Recipe<S>, name: string): Tool {
	const tool = recipe.tools.find((candidate) => candidate.spec.name === name);
	if (tool === undefined) {
		throw new Error(`the recipe has no tool named ${name}`);
	}
	return tool;
}

/** What one tool call did, and the state after it (or the state it started with). */
export interface CallResult {
	outcome: ToolOutcome;
	state: TimelineState;
}

/**
 * One tool call, the way the loop makes it: validate the arguments, execute, and
 * apply only when the result was not an error.
 */
export async function callTool(
	recipe: Recipe<TimelineState>,
	state: TimelineState,
	name: string,
	args: unknown,
	callKey = `call-${name}`,
): Promise<CallResult> {
	const tool = toolOf(recipe, name);
	const checked = tool.validate?.(args);
	if (checked !== undefined && !checked.ok) {
		return {
			outcome: { isError: true, content: formatErrors(checked.errors) },
			state,
		};
	}

	const outcome = await tool.execute(args, {
		signal: new AbortController().signal,
		runId: "test-run",
		callId: callKey,
		callKey,
		state,
	});

	if (outcome.isError || tool.apply === undefined) {
		return { outcome, state };
	}
	return { outcome, state: tool.apply(state, args, outcome) as TimelineState };
}
