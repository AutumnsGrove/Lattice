/**
 * The day: one calendar date of GitHub activity, as the timeline recipe is
 * handed it (#1798, slice 1).
 *
 * The shape is deliberately flat and JSON-safe. It is the recipe's input, and a
 * run's record keeps it, so a day can be replayed without asking GitHub again.
 * Every item is something that *happened* on the date — not merely something
 * that was touched — because the page is a diary, and "edited a title" is not
 * a day's work.
 *
 * Repos are short names (`Lattice`), which is what the page's heading and the
 * model use. The owner is always the day's `githubUsername`, because slice 1
 * reads repos she owns; work in other people's repos is #1803.
 */

/** What a pull request or an issue did on the day. */
export type DayActivity = "opened" | "merged" | "closed" | "commented";

/** One commit authored on the day, in one of the day's repos. */
export interface DayCommit {
	repo: string;
	sha: string;
	/** The commit message as GitHub returned it, body included; the renderer bounds it. */
	message: string;
	/** Author date, ISO 8601 — when the work happened, not when it merged. */
	authorDate: string;
	additions: number;
	deletions: number;
	/**
	 * Two or more parents. A merge of the day's pull request is folded into that
	 * pull request instead of appearing here; what is left is git housekeeping,
	 * such as `Merge branch 'main' into feat/x`, which the model may skip.
	 */
	merge: boolean;
}

/** One pull request she did something to on the day. */
export interface DayPull {
	repo: string;
	number: number;
	title: string;
	url: string;
	/** At least one; `merged` implies the pull request was also opened or updated. */
	activity: DayActivity[];
	state: "open" | "closed";
	merged: boolean;
	createdAt: string;
	closedAt: string | null;
	mergedAt: string | null;
	/** How many comments the thread carries, for `get_issue_thread` to be worth calling. */
	comments: number;
	/** The pull request's diff, from its own detail call; zero until merged. */
	additions: number;
	deletions: number;
	changedFiles: number;
	/**
	 * The commit this pull request produced — the merge, squash or last rebased
	 * commit. It is *not* listed in `commits`: the pull request carries its diff,
	 * so counting both would count the same work twice.
	 */
	mergeCommit: string | null;
}

/** One issue she did something to on the day. */
export interface DayIssue {
	repo: string;
	number: number;
	title: string;
	url: string;
	activity: DayActivity[];
	state: "open" | "closed";
	createdAt: string;
	closedAt: string | null;
	comments: number;
}

/** A part of the day that could not be read, kept so the record shows the gap. */
export interface DayWarning {
	/** The short repo name, or `null` for a failure before any repo was known. */
	repo: string | null;
	message: string;
}

/** A whole day, in the order it is handed to the model. */
export interface TimelineDay {
	/** `YYYY-MM-DD`, in `timezone`. */
	date: string;
	timezone: string;
	githubUsername: string;
	/** Short names of the repos with activity, sorted. */
	repos: string[];
	commits: DayCommit[];
	pulls: DayPull[];
	issues: DayIssue[];
	warnings: DayWarning[];
}
