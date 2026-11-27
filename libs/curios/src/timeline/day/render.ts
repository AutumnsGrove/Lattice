/**
 * The day as text, which is the message the recipe's model opens with (#1798,
 * slice 1).
 *
 * Everything goes in up front, grouped by repo, because the first tool the model
 * calls is `start_project(repo)` and the day is what tells it which projects
 * exist. Tools are for digging deeper — a diff, an issue thread, an earlier day —
 * not for discovering what happened.
 *
 * Nothing here asks for care: the handles are already the exact thing (`c1`,
 * `pr3`, `i7`), and `add_line`/`add_vine` take handles and mint line ids, so the
 * model never types a hash or an anchor. A prompt that asked it to be careful
 * with exact strings would be a step backwards.
 */

import type { DayHandles } from "./handles";
import type { DayActivity, TimelineDay } from "./types";

/**
 * How much of one commit message the model reads — the subject line, not the body.
 *
 * The day is the first message and is re-sent with every turn, so its length is the
 * run's cost: 100 commits at 300 characters each is a quarter of a million characters
 * across thirty turns. Bodies are what the old prompt's budget was written for; the
 * subject is what a line is written from.
 */
const MAX_COMMIT_CHARS = 120;
/** How much of a pull request or issue title is kept. */
const MAX_TITLE_CHARS = 200;

/** The order activities read in, so the same day always renders the same way. */
const ACTIVITY_ORDER: DayActivity[] = ["opened", "merged", "closed", "commented"];

/**
 * Render the day.
 *
 * Throws if the handles do not cover the day, which means they were minted for a
 * different one — a programming error, not something the model should see.
 */
export function renderDay(day: TimelineDay, handles: DayHandles): string {
	const heading = `The day is ${day.date} in ${day.timezone}`;

	if (day.repos.length === 0) {
		return withWarnings(`${heading}. Nothing happened on any repo.`, day);
	}

	const count = day.repos.length === 1 ? "1 repo" : `${day.repos.length} repos`;
	const lines: string[] = [`${heading}, with activity in ${count}: ${day.repos.join(", ")}.`];

	for (const repo of day.repos) {
		const commits = day.commits.filter((commit) => commit.repo === repo);
		const pulls = day.pulls.filter((pull) => pull.repo === repo);
		const issues = day.issues.filter((issue) => issue.repo === repo);

		const counts = [
			plural(commits.length, "commit"),
			plural(pulls.length, "pull request"),
			plural(issues.length, "issue"),
		].filter((part) => !part.startsWith("0 "));
		lines.push("", `## ${repo} — ${counts.join(", ") || "nothing"}`);

		if (commits.length > 0) {
			lines.push("", "Commits:");
			for (const commit of commits) {
				const name = required(handles.commit(repo, commit.sha), "commit", commit.sha);
				const merge = commit.merge ? "(merge) " : "";
				lines.push(
					`- ${name} ${commit.sha.slice(0, 7)} +${commit.additions}/-${commit.deletions} ${merge}${subjectOf(commit.message, MAX_COMMIT_CHARS)}`,
				);
			}
		}

		if (pulls.length > 0) {
			lines.push("", "Pull requests:");
			for (const pull of pulls) {
				const name = required(handles.pull(repo, pull.number), "pull request", pull.number);
				const activity = activityText(pull.activity);
				const diff =
					pull.mergeCommit !== null
						? ` (+${pull.additions}/-${pull.deletions}, ${pull.changedFiles} ${pull.changedFiles === 1 ? "file" : "files"})`
						: "";
				lines.push(
					`- ${name} #${pull.number} ${oneLine(pull.title, MAX_TITLE_CHARS)} — ${activity}${diff}`,
				);
			}
		}

		if (issues.length > 0) {
			lines.push("", "Issues:");
			for (const issue of issues) {
				const name = required(handles.issue(repo, issue.number), "issue", issue.number);
				lines.push(
					`- ${name} #${issue.number} ${oneLine(issue.title, MAX_TITLE_CHARS)} — ${activityText(issue.activity)}`,
				);
			}
		}
	}

	return withWarnings(lines.join("\n"), day);
}

function withWarnings(body: string, day: TimelineDay): string {
	if (day.warnings.length === 0) {
		return body;
	}
	const lines = day.warnings.map(
		(warning) => `- ${warning.repo === null ? "the day" : warning.repo}: ${warning.message}`,
	);
	return `${body}\n\nCould not read part of the day:\n${lines.join("\n")}`;
}

function activityText(activity: DayActivity[]): string {
	const ordered = ACTIVITY_ORDER.filter((kind) => activity.includes(kind));
	return ordered.length === 0 ? "touched" : ordered.join(", ");
}

/** The subject line of a commit: the first line that says something, bounded. */
function subjectOf(message: string, max: number): string {
	const first = message.split("\n").find((line) => line.trim().length > 0) ?? "";
	const collapsed = first.replace(/\s+/g, " ").trim();
	return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

/** Collapse a message to one bounded line, so the day stays scannable. */
function oneLine(text: string, max: number): string {
	const collapsed = text.replace(/\s+/g, " ").trim();
	return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function plural(count: number, noun: string): string {
	if (count === 0) return `0 ${noun}`;
	return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}

function required(handle: string | undefined, what: string, id: string | number): string {
	if (handle === undefined) {
		throw new Error(`the day's handles were not minted for ${what} ${id}`);
	}
	return handle;
}
