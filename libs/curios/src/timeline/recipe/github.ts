/**
 * The two GitHub calls the recipe's tools need (#1798, slice 2).
 *
 * `get_diff` and `get_issue_thread` exist so the model can ask for the one thing a
 * day cannot carry: what actually changed, and what a thread said. The day is
 * data; this is the follow-up question.
 *
 * The token is held by this reader and never enters the recipe's state or the run's
 * record (decision 51). Everything here is one HTTP call with a cap on what the
 * model reads, because a large diff can be megabytes and a thread can be a book.
 */

import type { DayHandleTarget } from "../day/handles";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface GitHubReaderOptions {
	token: string;
	/** The owner of every repo on the day. */
	username: string;
	fetch?: FetchLike;
	userAgent?: string;
	/** How much of a diff the model reads. Default 12,000 characters. */
	maxDiffChars?: number;
	/** How much of a thread the model reads. Default 8,000 characters. */
	maxThreadChars?: number;
}

export type ReaderResult = { ok: true; text: string } | { ok: false; message: string };

export interface GitHubReader {
	/** The unified diff of a commit or a pull request. */
	diff(target: DayHandleTarget): Promise<ReaderResult>;
	/** An issue's or pull request's body and comments. */
	thread(target: DayHandleTarget): Promise<ReaderResult>;
}

const API_BASE = "https://api.github.com";
const DEFAULT_USER_AGENT = "Lattice-Timeline-Recipe";
const DEFAULT_MAX_DIFF_CHARS = 12_000;
const DEFAULT_MAX_THREAD_CHARS = 8_000;
/** One comment's share of a thread, so the first one cannot eat the whole result. */
const MAX_COMMENT_CHARS = 1_500;

export function createGitHubReader(options: GitHubReaderOptions): GitHubReader {
	const given = options.fetch ?? (globalThis.fetch as FetchLike | undefined);
	if (typeof given !== "function") {
		throw new Error("no fetch is available; pass one as `fetch`");
	}
	const fetchImpl: FetchLike = given;
	const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
	const maxDiff = options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS;
	const maxThread = options.maxThreadChars ?? DEFAULT_MAX_THREAD_CHARS;

	async function get(path: string, accept: string): Promise<ReaderResult> {
		const url = `${API_BASE}${path}`;
		try {
			const response = await fetchImpl(url, {
				headers: {
					Authorization: `Bearer ${options.token}`,
					Accept: accept,
					"User-Agent": userAgent,
				},
			});
			if (!response.ok) {
				if (response.status === 404) {
					return { ok: false, message: `GitHub has nothing at ${path}` };
				}
				return { ok: false, message: `GitHub answered ${response.status} for ${path}` };
			}
			return { ok: true, text: await response.text() };
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			return { ok: false, message: `GitHub could not be reached: ${reason}` };
		}
	}

	return {
		async diff(target) {
			if (target.kind === "issue") {
				return {
					ok: false,
					message: `${target.repo}#${target.number} is an issue, so there is no diff; read it with get_issue_thread`,
				};
			}
			const path =
				target.kind === "commit"
					? `/repos/${options.username}/${target.repo}/commits/${target.sha}`
					: `/repos/${options.username}/${target.repo}/pulls/${target.number}`;
			const response = await get(path, "application/vnd.github.v3.diff");
			if (!response.ok) {
				return response;
			}
			return { ok: true, text: cut(response.text, maxDiff, "diff") };
		},

		async thread(target) {
			if (target.kind === "commit") {
				return {
					ok: false,
					message: `${target.repo}@${target.sha.slice(0, 7)} is a commit, so there is no thread; read it with get_diff`,
				};
			}
			const issuePath = `/repos/${options.username}/${target.repo}/issues/${target.number}`;
			const commentsPath = `${issuePath}/comments`;

			const [issue, comments] = await Promise.all([
				get(issuePath, "application/vnd.github.v3+json"),
				get(commentsPath, "application/vnd.github.v3+json"),
			]);
			if (!issue.ok) {
				return issue;
			}
			if (!comments.ok) {
				// The body is still worth reading even when the thread is not.
				return { ok: true, text: cut(renderIssue(issue.text, ""), maxThread, "thread") };
			}
			return {
				ok: true,
				text: cut(renderIssue(issue.text, comments.text), maxThread, "thread"),
			};
		},
	};
}

interface GitHubIssueBody {
	number: number;
	title: string;
	state: string;
	body: string | null;
	user: { login: string };
	comments: number;
}

interface GitHubCommentBody {
	user: { login: string };
	body: string | null;
}

function renderIssue(rawIssue: string, rawComments: string): string {
	const issue = asJson<GitHubIssueBody>(rawIssue);
	if (issue === null) {
		return "(GitHub answered with something that was not an issue)";
	}

	const lines: string[] = [
		`#${issue.number} ${issue.title} (${issue.state})`,
		`opened by ${issue.user?.login ?? "someone"}`,
		"",
		issue.body?.trim() || "(no description)",
	];

	const comments =
		rawComments.trim() === "" ? [] : (asJson<GitHubCommentBody[]>(rawComments) ?? []);
	if (comments.length > 0) {
		lines.push("", `## Comments (${issue.comments ?? comments.length})`);
		for (const comment of comments) {
			lines.push(
				"",
				`@${comment.user?.login ?? "someone"}:`,
				cut(comment.body?.trim() || "(empty)", MAX_COMMENT_CHARS, "comment"),
			);
		}
	}

	return lines.join("\n");
}

function asJson<T>(text: string): T | null {
	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

/** Cut a long result, saying so, rather than handing the model a silent truncation. */
function cut(text: string, max: number, what: string): string {
	if (text.length <= max) {
		return text;
	}
	return `${text.slice(0, max)}\n\n(the ${what} was cut at ${max} characters)`;
}
