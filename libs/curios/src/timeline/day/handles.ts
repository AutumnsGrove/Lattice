/**
 * Handles for the day's work (#1798, slice 1).
 *
 * The model must never copy a commit hash or a pull request number: Lumen's
 * scrubber may rewrite a long exact string on the way through, and a copied hash
 * is a typo waiting to happen. So every commit, pull request and issue is named
 * by a short handle — `c1`, `pr3`, `i7` — and the recipe's handle table keeps the
 * way back (Lyra decision 114).
 *
 * Minting is delegated to a table rather than done here, because the table lives
 * in the recipe's state and replaying a run's saved results has to rebuild the
 * same names. This module only fixes the *order* (commits, then pull requests,
 * then issues, each as the day lists them), which is what makes a rebuilt table
 * agree with a live one.
 */

import type { TimelineDay } from "./types";

/** The part of Lyra's handle table this module needs. */
export interface HandleMinter {
	mint(kind: string, target: Record<string, string | number>): string;
}

/** What a handle names, in the plain JSON the table stores. */
export type DayHandleTarget =
	| { kind: "commit"; repo: string; sha: string }
	| { kind: "pull"; repo: string; number: number }
	| { kind: "issue"; repo: string; number: number };

export interface DayHandles {
	commit(repo: string, sha: string): string | undefined;
	pull(repo: string, number: number): string | undefined;
	issue(repo: string, number: number): string | undefined;
	/** Every handle, in the order it was minted. */
	all(): string[];
	/** What a handle names, or `undefined` for a name this day never minted. */
	target(handle: string): DayHandleTarget | undefined;
}

/**
 * Name everything on the day.
 *
 * Deterministic: the same day and the same minting order give the same handles,
 * which is how a resumed run and a live run agree.
 */
export function mintDayHandles(day: TimelineDay, table: HandleMinter): DayHandles {
	const commits = new Map<string, string>();
	const pulls = new Map<string, string>();
	const issues = new Map<string, string>();
	const targets = new Map<string, DayHandleTarget>();
	const minted: string[] = [];

	for (const commit of day.commits) {
		const handle = table.mint("c", { repo: commit.repo, sha: commit.sha });
		commits.set(commitKey(commit.repo, commit.sha), handle);
		minted.push(handle);
		targets.set(handle, { kind: "commit", repo: commit.repo, sha: commit.sha });
	}

	for (const pull of day.pulls) {
		const handle = table.mint("pr", { repo: pull.repo, number: pull.number });
		pulls.set(repoNumberKey(pull.repo, pull.number), handle);
		minted.push(handle);
		targets.set(handle, { kind: "pull", repo: pull.repo, number: pull.number });
	}

	for (const issue of day.issues) {
		const handle = table.mint("i", { repo: issue.repo, number: issue.number });
		issues.set(repoNumberKey(issue.repo, issue.number), handle);
		minted.push(handle);
		targets.set(handle, { kind: "issue", repo: issue.repo, number: issue.number });
	}

	return {
		commit: (repo, sha) => commits.get(commitKey(repo, sha)),
		pull: (repo, number) => pulls.get(repoNumberKey(repo, number)),
		issue: (repo, number) => issues.get(repoNumberKey(repo, number)),
		all: () => [...minted],
		target: (handle) => targets.get(handle),
	};
}

function commitKey(repo: string, sha: string): string {
	return `${repo}#${sha}`;
}

function repoNumberKey(repo: string, number: number): string {
	return `${repo}#${number}`;
}
