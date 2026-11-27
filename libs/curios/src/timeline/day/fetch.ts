/**
 * Fetching the day (#1798, slice 1).
 *
 * One function, one day: the repos she owns that had activity, and then the
 * commits, pull requests and issues that *happened* on the date. Nothing here
 * talks to a model and nothing writes: the result is plain JSON, which is what
 * the record keeps and what the recipe's `setup` receives.
 *
 * Three rules the code keeps to, each of which was a bug somewhere else first:
 *
 * - **A day is a local calendar day.** GitHub reports UTC timestamps, so every
 *   item is attributed by formatting its timestamp in the tenant's timezone
 *   (`localDateOf`). Commits are the careful case: GitHub's `since`/`until`
 *   filter on *committer* date, so the query is widened by a few days and the
 *   result is filtered on *author* date — otherwise a commit written today and
 *   merged tomorrow vanishes from both days.
 * - **A pull request carries its own merge.** A merge, squash or rebase commit
 *   is the pull request's diff in commit form. Counting it as a commit too
 *   would put the same work on the page twice, so the commit is folded into the
 *   pull request (`foldMergeCommits`) and only git housekeeping merges are left
 *   flagged as commits.
 * - **A repo that fails does not lose the day.** Repo discovery failing throws,
 *   because there is nothing to fetch; a single repo's failure becomes a
 *   `DayWarning` and the rest of the day survives. The record is an audit
 *   trail, so a gap in it is written down rather than smoothed over.
 *
 * Pull requests and issues are read from the repos she owns (`/users/{u}/repos`).
 * Contributions to other people's repos are #1803, deliberately not here yet.
 */

import type { DayActivity, DayCommit, DayIssue, DayPull, DayWarning, TimelineDay } from "./types";

/** The same shape as the global `fetch`, injectable so tests can fake GitHub. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface DayFetchOptions {
	/** The GitHub login whose repos, commits and threads make up the day. */
	username: string;
	token: string;
	/** The day, `YYYY-MM-DD` in `timezone`. */
	date: string;
	/** IANA timezone the day is measured in, such as `America/Los_Angeles`. */
	timezone: string;
	/** Repos to read, by short name. Omit for every repo she owns. */
	include?: readonly string[] | null;
	/** Repos to leave out, by short name. */
	exclude?: readonly string[] | null;
	/**
	 * Short repo names already known to have activity (the backfill fast path, from
	 * `timeline_activity.repos_active`). Given, discovery is skipped.
	 */
	repos?: readonly string[] | null;
	fetch?: FetchLike;
	/** Pause between repos, to stay clear of secondary rate limits. Default 100ms. */
	delayMs?: number;
	/** Pages one list endpoint may return before it gives up with a warning. Default 10. */
	maxPages?: number;
	userAgent?: string;
}

const API_BASE = "https://api.github.com";
const DEFAULT_USER_AGENT = "Lattice-Timeline-Day";
const PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_DELAY_MS = 100;
const STATS_CONCURRENCY = 5;

/**
 * How many days of merge/rebase lag to absorb on each side of the target date.
 * GitHub's commit list filters on committer date, so this is what keeps a commit
 * written today and merged tomorrow from vanishing; the author-date filter below
 * then narrows the result back to the one day.
 */
const AUTHOR_DATE_WINDOW_DAYS = 3;

/** Slack on the `since` bound for issue and comment lists, filtered locally after. */
const SINCE_SLACK_DAYS = 2;

/** GitHub answered with something other than 200. */
export class GitHubRequestError extends Error {
	readonly status: number;
	readonly url: string;

	constructor(status: number, url: string) {
		super(`GitHub answered ${status} for ${url}`);
		this.name = "GitHubRequestError";
		this.status = status;
		this.url = url;
	}
}

/**
 * Read one day of GitHub activity.
 *
 * Throws only when the day cannot be read at all — a bad date, or repo discovery
 * failing. Everything narrower is a `DayWarning` on the result.
 */
export async function fetchTimelineDay(options: DayFetchOptions): Promise<TimelineDay> {
	if (!isCalendarDay(options.date)) {
		throw new TypeError(`a day is YYYY-MM-DD, not "${options.date.slice(0, 40)}"`);
	}

	const warnings: DayWarning[] = [];
	const client = createClient(options);

	let fullNames: string[];
	if (options.repos !== null && options.repos !== undefined && options.repos.length > 0) {
		fullNames = options.repos.map((name) => `${options.username}/${name}`);
	} else {
		const discovered = await discoverRepos(client, options.username, warnings);
		fullNames = discovered;
	}

	fullNames = fullNames.filter((fullName) => passesFilters(shortName(fullName), options));

	const commits: DayCommit[] = [];
	const pulls: DayPull[] = [];
	const issues: DayIssue[] = [];

	for (const fullName of fullNames) {
		const repo = shortName(fullName);

		try {
			const repoCommits = await fetchRepoCommits(client, fullName, repo, options, warnings);
			await enrichCommitStats(client, fullName, repoCommits);
			commits.push(...repoCommits);
		} catch (error) {
			warnings.push(warningFor(repo, "commits", error));
		}

		try {
			const activity = await fetchRepoActivity(client, fullName, repo, options, warnings);
			pulls.push(...activity.pulls);
			issues.push(...activity.issues);
		} catch (error) {
			warnings.push(warningFor(repo, "pull requests and issues", error));
		}

		if (fullNames.length > 1) {
			await pause(client.delayMs);
		}
	}

	const day: TimelineDay = {
		date: options.date,
		timezone: options.timezone,
		githubUsername: options.username,
		repos: [],
		commits: sortCommits(uniqueCommits(commits)),
		pulls: sortByNumber(pulls),
		issues: sortByNumber(issues),
		warnings,
	};

	foldMergeCommits(day);

	const active = new Set<string>();
	for (const commit of day.commits) active.add(commit.repo);
	for (const pull of day.pulls) active.add(pull.repo);
	for (const issue of day.issues) active.add(issue.repo);
	day.repos = [...active].sort(compare);

	return day;
}

// =============================================================================
// Client
// =============================================================================

interface Client {
	token: string;
	fetch: FetchLike;
	userAgent: string;
	maxPages: number;
	delayMs: number;
}

function createClient(options: DayFetchOptions): Client {
	// `fetch` must be called with the global as its receiver. Under workerd, a
	// detached `globalThis.fetch(...)` throws "Illegal invocation", so the platform
	// function is bound rather than copied. Found by running the comparison route on
	// a deployed worker, which no test could have told us.
	const fetchImpl = options.fetch ?? (globalThis.fetch?.bind(globalThis) as FetchLike | undefined);
	if (typeof fetchImpl !== "function") {
		throw new Error("no fetch is available; pass one as `fetch`");
	}
	return {
		token: options.token,
		fetch: fetchImpl,
		userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
		maxPages: options.maxPages ?? DEFAULT_MAX_PAGES,
		delayMs: options.delayMs ?? DEFAULT_DELAY_MS,
	};
}

async function getJson<T>(client: Client, url: string): Promise<T> {
	const response = await client.fetch(url, {
		headers: {
			Authorization: `Bearer ${client.token}`,
			Accept: "application/vnd.github.v3+json",
			"User-Agent": client.userAgent,
		},
	});
	if (!response.ok) {
		throw new GitHubRequestError(response.status, url);
	}
	return (await response.json()) as T;
}

interface Page<T> {
	items: T[];
	/** True when the page cap was reached with more to read. */
	capped: boolean;
}

async function getPages<T>(client: Client, base: URL): Promise<Page<T>> {
	const items: T[] = [];
	for (let page = 1; page <= client.maxPages; page++) {
		const url = new URL(base.toString());
		url.searchParams.set("per_page", String(PER_PAGE));
		url.searchParams.set("page", String(page));
		const batch = await getJson<T[]>(client, url.toString());
		items.push(...batch);
		if (batch.length < PER_PAGE) {
			return { items, capped: false };
		}
	}
	return { items, capped: true };
}

// =============================================================================
// Repos
// =============================================================================

interface GitHubRepo {
	name: string;
	full_name: string;
	fork: boolean;
}

async function discoverRepos(
	client: Client,
	username: string,
	warnings: DayWarning[],
): Promise<string[]> {
	const url = new URL(`${API_BASE}/users/${encodeURIComponent(username)}/repos`);
	url.searchParams.set("sort", "pushed");
	url.searchParams.set("type", "owner");

	const { items, capped } = await getPages<GitHubRepo>(client, url);
	if (capped) {
		warnings.push({
			repo: null,
			message: `repo discovery stopped after ${client.maxPages} pages; some repos were not read`,
		});
	}

	return items
		.filter((repo) => !repo.fork)
		.map((repo) => repo.full_name)
		.sort(compare);
}

function passesFilters(shortRepoName: string, options: DayFetchOptions): boolean {
	if (options.include && options.include.length > 0 && !options.include.includes(shortRepoName)) {
		return false;
	}
	if (options.exclude && options.exclude.includes(shortRepoName)) {
		return false;
	}
	return true;
}

// =============================================================================
// Commits
// =============================================================================

interface GitHubCommit {
	sha: string;
	parents?: { sha: string }[];
	commit: {
		message: string;
		author: { date: string };
	};
	stats?: { additions: number; deletions: number };
}

async function fetchRepoCommits(
	client: Client,
	fullName: string,
	repo: string,
	options: DayFetchOptions,
	warnings: DayWarning[],
): Promise<DayCommit[]> {
	const target = Date.parse(`${options.date}T00:00:00Z`);
	const url = new URL(`${API_BASE}/repos/${fullName}/commits`);
	url.searchParams.set("author", options.username);
	url.searchParams.set(
		"since",
		new Date(target - AUTHOR_DATE_WINDOW_DAYS * 86_400_000).toISOString(),
	);
	url.searchParams.set(
		"until",
		new Date(target + (AUTHOR_DATE_WINDOW_DAYS + 1) * 86_400_000).toISOString(),
	);

	const { items, capped } = await getPages<GitHubCommit>(client, url);
	if (capped) {
		warnings.push({
			repo,
			message: `commit history stopped after ${client.maxPages} pages; the day may be incomplete`,
		});
	}

	const commits: DayCommit[] = [];
	for (const item of items) {
		if (localDateOf(item.commit.author.date, options.timezone) !== options.date) {
			continue;
		}
		commits.push({
			repo,
			sha: item.sha,
			message: item.commit.message,
			authorDate: item.commit.author.date,
			additions: item.stats?.additions ?? 0,
			deletions: item.stats?.deletions ?? 0,
			merge: (item.parents?.length ?? 0) > 1,
		});
	}
	return commits;
}

/**
 * The commit list has no stats, so each commit's detail is read for its line
 * counts. A failure keeps zeroes rather than losing the commit: the lines are
 * colour on the page, the commit is the work.
 */
async function enrichCommitStats(
	client: Client,
	fullName: string,
	commits: DayCommit[],
): Promise<void> {
	for (const batch of chunks(commits, STATS_CONCURRENCY)) {
		await Promise.all(
			batch.map(async (commit) => {
				try {
					const detail = await getJson<GitHubCommit>(
						client,
						`${API_BASE}/repos/${fullName}/commits/${commit.sha}`,
					);
					commit.additions = detail.stats?.additions ?? 0;
					commit.deletions = detail.stats?.deletions ?? 0;
				} catch {
					// Non-fatal: keep 0 for this commit.
				}
			}),
		);
	}
}

// =============================================================================
// Pull requests and issues
// =============================================================================

interface GitHubIssue {
	number: number;
	title: string;
	html_url: string;
	state: "open" | "closed";
	created_at: string;
	closed_at: string | null;
	updated_at: string;
	comments: number;
	user: { login: string };
	pull_request?: { html_url: string; merged_at: string | null };
}

interface GitHubIssueComment {
	id: number;
	created_at: string;
	issue_url: string;
	user: { login: string };
}

interface GitHubPullDetail {
	merge_commit_sha: string | null;
	additions?: number;
	deletions?: number;
	changed_files?: number;
}

interface RepoActivity {
	pulls: DayPull[];
	issues: DayIssue[];
}

async function fetchRepoActivity(
	client: Client,
	fullName: string,
	repo: string,
	options: DayFetchOptions,
	warnings: DayWarning[],
): Promise<RepoActivity> {
	const since = sinceIso(options.date);

	// A comment updates the issue's `updated_at`, so one list call covers every
	// thread with activity that day: opened, closed, and commented on.
	const issuesUrl = new URL(`${API_BASE}/repos/${fullName}/issues`);
	issuesUrl.searchParams.set("state", "all");
	issuesUrl.searchParams.set("since", since);
	issuesUrl.searchParams.set("sort", "updated");
	issuesUrl.searchParams.set("direction", "asc");
	const listed = await getPages<GitHubIssue>(client, issuesUrl);
	if (listed.capped) {
		warnings.push({
			repo,
			message: `issue activity stopped after ${client.maxPages} pages; the day may be incomplete`,
		});
	}

	const commentsUrl = new URL(`${API_BASE}/repos/${fullName}/issues/comments`);
	commentsUrl.searchParams.set("since", since);
	commentsUrl.searchParams.set("sort", "updated");
	commentsUrl.searchParams.set("direction", "asc");
	const comments = await getPages<GitHubIssueComment>(client, commentsUrl);
	if (comments.capped) {
		warnings.push({
			repo,
			message: `comments stopped after ${client.maxPages} pages; the day may be incomplete`,
		});
	}

	const commented = new Set<number>();
	for (const comment of comments.items) {
		if (comment.user.login !== options.username) continue;
		if (localDateOf(comment.created_at, options.timezone) !== options.date) continue;
		const number = issueNumberFromUrl(comment.issue_url);
		if (number !== null) commented.add(number);
	}

	const pulls = new Map<number, DayPull>();
	const issues = new Map<number, DayIssue>();

	for (const raw of listed.items) {
		const activity = activityOf(raw, options, commented.has(raw.number));
		if (activity.length === 0) continue;

		if (raw.pull_request) {
			pulls.set(raw.number, pullOf(repo, raw, activity));
		} else {
			issues.set(raw.number, issueOf(repo, raw, activity));
		}
	}

	// A merged pull request's detail is where `merge_commit_sha` and the diff
	// live; the list only says that it merged.
	for (const pull of pulls.values()) {
		if (!pull.activity.includes("merged")) continue;
		try {
			const detail = await getJson<GitHubPullDetail>(
				client,
				`${API_BASE}/repos/${fullName}/pulls/${pull.number}`,
			);
			pull.mergeCommit = detail.merge_commit_sha ?? null;
			pull.additions = detail.additions ?? 0;
			pull.deletions = detail.deletions ?? 0;
			pull.changedFiles = detail.changed_files ?? 0;
		} catch (error) {
			warnings.push(warningFor(repo, `pull request #${pull.number}`, error));
		}
	}

	return { pulls: [...pulls.values()], issues: [...issues.values()] };
}

/**
 * What one issue or pull request did on the day.
 *
 * Opening and closing are attributed only to the author, so a close by somebody
 * else in her repo is not her day's work. A merge is attributed to the author
 * too: in her own repos her pull requests are merged by her or by an automatic
 * merge, and both are the day's outcome. A comment is activity whoever wrote the
 * issue — commenting on somebody else's thread is work.
 */
function activityOf(raw: GitHubIssue, options: DayFetchOptions, commented: boolean): DayActivity[] {
	const activity: DayActivity[] = [];
	const hers = raw.user.login === options.username;

	if (hers && localDateOf(raw.created_at, options.timezone) === options.date) {
		activity.push("opened");
	}
	if (
		hers &&
		raw.closed_at !== null &&
		localDateOf(raw.closed_at, options.timezone) === options.date
	) {
		const merged = raw.pull_request !== undefined && raw.pull_request.merged_at !== null;
		activity.push(merged ? "merged" : "closed");
	}
	if (commented) {
		activity.push("commented");
	}
	return activity;
}

function pullOf(repo: string, raw: GitHubIssue, activity: DayActivity[]): DayPull {
	return {
		repo,
		number: raw.number,
		title: raw.title,
		url: raw.html_url,
		activity,
		state: raw.state,
		merged: raw.pull_request?.merged_at != null,
		createdAt: raw.created_at,
		closedAt: raw.closed_at,
		mergedAt: raw.pull_request?.merged_at ?? null,
		comments: raw.comments,
		additions: 0,
		deletions: 0,
		changedFiles: 0,
		mergeCommit: null,
	};
}

function issueOf(repo: string, raw: GitHubIssue, activity: DayActivity[]): DayIssue {
	return {
		repo,
		number: raw.number,
		title: raw.title,
		url: raw.html_url,
		activity,
		state: raw.state,
		createdAt: raw.created_at,
		closedAt: raw.closed_at,
		comments: raw.comments,
	};
}

function issueNumberFromUrl(url: string): number | null {
	const match = /\/(\d+)$/.exec(url);
	if (!match) return null;
	const number = Number(match[1]);
	return Number.isSafeInteger(number) ? number : null;
}

// =============================================================================
// Assembling
// =============================================================================

/**
 * Give a pull request its own merge, squash or rebase commit instead of leaving
 * it in the commit list. The pull request's diff and the commit's diff are the
 * same work, and a day that says both is a day that says it twice.
 */
function foldMergeCommits(day: TimelineDay): void {
	const folded = new Set<string>();
	for (const pull of day.pulls) {
		if (pull.mergeCommit !== null) {
			folded.add(`${pull.repo}#${pull.mergeCommit}`);
		}
	}
	if (folded.size === 0) return;
	day.commits = day.commits.filter((commit) => !folded.has(`${commit.repo}#${commit.sha}`));
}

function uniqueCommits(commits: DayCommit[]): DayCommit[] {
	const byKey = new Map<string, DayCommit>();
	for (const commit of commits) {
		byKey.set(`${commit.repo}#${commit.sha}`, commit);
	}
	return [...byKey.values()];
}

function sortCommits(commits: DayCommit[]): DayCommit[] {
	return [...commits].sort(
		(left, right) =>
			compare(left.repo, right.repo) ||
			compare(left.authorDate, right.authorDate) ||
			compare(left.sha, right.sha),
	);
}

function sortByNumber<T extends { repo: string; number: number }>(items: T[]): T[] {
	return [...items].sort(
		(left, right) => compare(left.repo, right.repo) || left.number - right.number,
	);
}

// =============================================================================
// Dates
// =============================================================================

/** Does this ISO timestamp fall on `date` (YYYY-MM-DD) in `timezone`? */
export function localDateOf(iso: string, timezone: string): string {
	// "en-CA" formats as YYYY-MM-DD, which is the convention everywhere else here.
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date(iso));
}

function sinceIso(date: string): string {
	const target = Date.parse(`${date}T00:00:00Z`);
	return new Date(target - SINCE_SLACK_DAYS * 86_400_000).toISOString();
}

function isCalendarDay(date: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	const parsed = new Date(`${date}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

// =============================================================================
// Small things
// =============================================================================

function shortName(fullName: string): string {
	const slash = fullName.indexOf("/");
	return slash === -1 ? fullName : fullName.slice(slash + 1);
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function chunks<T>(items: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		result.push(items.slice(index, index + size));
	}
	return result;
}

function warningFor(repo: string, what: string, error: unknown): DayWarning {
	const reason = error instanceof Error ? error.message : String(error);
	return { repo, message: `could not read ${what}: ${reason}` };
}

function pause(ms: number): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve) => setTimeout(resolve, ms));
}
