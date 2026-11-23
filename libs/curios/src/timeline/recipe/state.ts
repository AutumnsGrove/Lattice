/**
 * The page the model is writing, and the state every tool shares (#1798, slice 2).
 *
 * The shape is Lyra's recipe shape (decision 112): `setup` builds it, `apply` is the
 * only writer, and replaying a run's saved results through `apply` rebuilds it
 * exactly. That is why the day and the handle table live here rather than in a
 * closure: a resumed run has to have both back.
 */

import type { HandleTable } from "@autumnsgrove/lyra";
import type { DayHandles } from "../day/handles";
import type { TimelineDay } from "../day/types";

/** One bullet on the page. The id is minted here and is what a vine points at. */
export interface TimelineLine {
	id: string;
	project: string;
	text: string;
	/** The handles this line is written from: commits, pull requests, issues. */
	cites: string[];
}

/** One repo's section. */
export interface TimelineProject {
	repo: string;
	lines: TimelineLine[];
}

/** An aside, placed beside the line it comments on. */
export interface TimelineVine {
	line: string;
	text: string;
}

export interface TimelinePage {
	projects: TimelineProject[];
	vines: TimelineVine[];
	/** Set by `mark_continuation`. Metadata: the stored day's page has no place for it. */
	continuation: { day: string; text: string } | null;
}

export interface TimelineState {
	/** The day, exactly as the recipe was given it. */
	day: TimelineDay;
	/** The table behind the handles, kept for the messages that list what exists. */
	table: HandleTable;
	handles: DayHandles;
	page: TimelinePage;
	/** The next line's number, so a resume numbers lines as the live run did. */
	nextLine: number;
	/** Call keys already applied, so a repeated call adds nothing (decision 24). */
	applied: string[];
}

export function emptyPage(): TimelinePage {
	return { projects: [], vines: [], continuation: null };
}

export function projectOf(state: TimelineState, repo: string): TimelineProject | undefined {
	return state.page.projects.find((project) => project.repo === repo);
}

export function lineOf(state: TimelineState, id: string): TimelineLine | undefined {
	for (const project of state.page.projects) {
		const line = project.lines.find((candidate) => candidate.id === id);
		if (line !== undefined) {
			return line;
		}
	}
	return undefined;
}

/** The repo a handle's commit, pull request or issue belongs to. */
export function repoOfHandle(state: TimelineState, handle: string): string | undefined {
	return state.handles.target(handle)?.repo;
}

/** Every line on the page, in the order they were written. */
export function linesOf(state: TimelineState): TimelineLine[] {
	return state.page.projects.flatMap((project) => project.lines);
}

/** The handles a line has cited so far. */
export function coveredHandles(state: TimelineState): Set<string> {
	const covered = new Set<string>();
	for (const line of linesOf(state)) {
		for (const cite of line.cites) {
			covered.add(cite);
		}
	}
	return covered;
}
