/**
 * The timeline's eight tools (#1798, slice 2).
 *
 * The rule the whole rewrite is built on is here: the model decides what to say,
 * and the tools own anything that has to be exact. It never types a repo name, a
 * commit hash, a link or an anchor — `start_project` checks the repo against the
 * day, `add_line` checks every citation against that repo, `add_vine` takes a line
 * id the tool minted, and the serializer writes the marker and the gutter entry.
 *
 * A refusal is an ordinary error result with a message naming what does exist, so
 * the model corrects itself inside the loop. That is what a prompt cannot do, and
 * it is the reason these tools exist rather than a longer prompt.
 */

import {
	coverageCheck,
	createFinishTool,
	defineTool,
	unknownHandle,
	type DoneCheck,
	type Skipped,
	type Tool,
	type ToolContext,
} from "@autumnsgrove/lyra";
import type { GitHubReader } from "./github";
import { describeState } from "./serialize";
import {
	coveredHandles,
	lineOf,
	linesOf,
	projectOf,
	type TimelineLine,
	type TimelineState,
} from "./state";

/** An earlier day the model may search for continuation evidence. */
export interface PastDay {
	date: string;
	text: string;
}

/**
 * Where earlier days come from. Slice 3 backs this with the tenant's run records;
 * a caller that has none simply leaves it out, and the tool says so.
 */
export interface PastDays {
	search(query: string): Promise<PastDay[]>;
}

export interface TimelineToolOptions {
	reader: GitHubReader;
	pastDays?: PastDays;
}

const PROJECT_INPUT = {
	type: "object",
	properties: { repo: { type: "string", minLength: 1, maxLength: 100 } },
	required: ["repo"],
} as const;

const LINE_INPUT = {
	type: "object",
	properties: {
		project: { type: "string", minLength: 1, maxLength: 100 },
		text: { type: "string", minLength: 1, maxLength: 2_000 },
		cites: {
			type: "array",
			items: { type: "string", minLength: 1, maxLength: 20 },
			minItems: 1,
			maxItems: 30,
		},
	},
	required: ["project", "text", "cites"],
} as const;

const BRIEF_INPUT = {
	type: "object",
	properties: { text: { type: "string", minLength: 1, maxLength: 1_000 } },
	required: ["text"],
} as const;

const VINE_INPUT = {
	type: "object",
	properties: {
		line: { type: "string", minLength: 1, maxLength: 20 },
		text: { type: "string", minLength: 1, maxLength: 500 },
	},
	required: ["line", "text"],
} as const;

const CONTINUATION_INPUT = {
	type: "object",
	properties: {
		day: { type: "string", minLength: 10, maxLength: 10 },
		text: { type: "string", minLength: 1, maxLength: 500 },
	},
	required: ["day", "text"],
} as const;

const HANDLE_INPUT = {
	type: "object",
	properties: { handle: { type: "string", minLength: 1, maxLength: 20 } },
	required: ["handle"],
} as const;

const SEARCH_INPUT = {
	type: "object",
	properties: { query: { type: "string", minLength: 2, maxLength: 200 } },
	required: ["query"],
} as const;

/** The prefix `coverageCheck` puts on a refusal, so three of them read as one. */
const COVERAGE_PREFIX = "not covered yet: ";

/** What a handle names, as the message reads it. */
function describeKind(kind: string): string {
	if (kind === "commit") return "a commit";
	if (kind === "pull") return "a pull request";
	return "an issue";
}

export function createTimelineTools(options: TimelineToolOptions): Tool[] {
	const { reader, pastDays } = options;

	function startProject(): Tool {
		return defineTool({
			name: "start_project",
			description:
				"Open a section for a repo that is on the day's list. Call this before adding lines for that repo.",
			parameters: PROJECT_INPUT,
			safeToRepeat: true,
			// The page is what the run is writing, so one tool says what it is when the
			// run compacts (decision 40).
			currentState: (state: TimelineState) => describeState(state),
			async execute(args, ctx: ToolContext<TimelineState>) {
				const { repos } = ctx.state.day;
				if (!repos.includes(args.repo)) {
					return {
						isError: true,
						content: `there is no repo "${args.repo.slice(0, 60)}" on this day; ${
							repos.length === 0 ? "no repo had activity" : `the repos are ${repos.join(", ")}`
						}`,
					};
				}
				if (projectOf(ctx.state, args.repo) !== undefined) {
					return { isError: false, content: `${args.repo} is already started` };
				}
				return {
					isError: false,
					content: `started a project for ${args.repo}`,
					details: { repo: args.repo },
				};
			},
			apply(state: TimelineState, args) {
				if (projectOf(state, args.repo) !== undefined) {
					return state;
				}
				return {
					...state,
					page: {
						...state.page,
						projects: [...state.page.projects, { repo: args.repo, lines: [] }],
					},
				};
			},
		});
	}

	function addLine(): Tool {
		return defineTool({
			name: "add_line",
			description:
				"Add one bullet to a project, citing the handle of every commit, pull request or issue it is written from.",
			parameters: LINE_INPUT,
			safeToRepeat: true,
			async execute(args, ctx: ToolContext<TimelineState>) {
				const state = ctx.state;
				const project = projectOf(state, args.project);
				if (project === undefined) {
					const started = state.page.projects.map((one) => one.repo);
					return {
						isError: true,
						content: `there is no project "${args.project.slice(0, 60)}"; ${
							started.length === 0
								? "no projects are started yet"
								: `the projects are ${started.join(", ")}`
						}`,
					};
				}

				for (const cite of args.cites) {
					const target = state.handles.target(cite);
					if (target === undefined) {
						return { isError: true, content: unknownHandle(state.table, cite) };
					}
					if (target.repo !== args.project) {
						return {
							isError: true,
							content: `${cite} is ${describeKind(target.kind)} in ${target.repo}, not ${args.project}`,
						};
					}
				}

				const id = `l${state.nextLine}`;
				return {
					isError: false,
					content: `added ${id}: ${args.text}`,
					details: {
						id,
						project: args.project,
						text: args.text,
						cites: args.cites,
						key: ctx.callKey,
					},
				};
			},
			apply(state: TimelineState, args, outcome) {
				const key = keyOf(outcome.details);
				if (state.applied.includes(key)) {
					return state;
				}
				const id =
					outcome.details !== undefined &&
					typeof (outcome.details as { id?: unknown }).id === "string"
						? (outcome.details as { id: string }).id
						: `l${state.nextLine}`;
				const line: TimelineLine = {
					id,
					project: args.project,
					text: args.text,
					cites: [...args.cites],
				};
				return {
					...state,
					page: {
						...state.page,
						projects: state.page.projects.map((project) =>
							project.repo === args.project
								? { ...project, lines: [...project.lines, line] }
								: project,
						),
					},
					nextLine: state.nextLine + 1,
					applied: [...state.applied, key],
				};
			},
		});
	}

	function addVine(): Tool {
		return defineTool({
			name: "add_vine",
			description:
				"Attach a short aside to one line of the page. It renders beside that line, not inside it.",
			parameters: VINE_INPUT,
			safeToRepeat: true,
			async execute(args, ctx: ToolContext<TimelineState>) {
				if (lineOf(ctx.state, args.line) === undefined) {
					const lines = linesOf(ctx.state).map((line) => line.id);
					return {
						isError: true,
						content: `there is no line "${args.line.slice(0, 20)}"; ${
							lines.length === 0
								? "no lines are on the page yet"
								: `the lines are ${lines.join(", ")}`
						}`,
					};
				}
				return {
					isError: false,
					content: `attached a vine to ${args.line}`,
					details: { line: args.line, text: args.text, key: ctx.callKey },
				};
			},
			apply(state: TimelineState, args, outcome) {
				const key = keyOf(outcome.details);
				if (state.applied.includes(key)) {
					return state;
				}
				return {
					...state,
					page: {
						...state.page,
						vines: [...state.page.vines, { line: args.line, text: args.text }],
					},
					applied: [...state.applied, key],
				};
			},
		});
	}

	/**
	 * The page's other half. `brief_summary` has been on every stored day since the
	 * first one, so a run that wrote only lines would produce a page the comparison
	 * could not judge fairly.
	 */
	function setBrief(): Tool {
		return defineTool({
			name: "set_brief",
			description:
				"Write the day's headline: two or three sentences about what the day was. Call it after the lines, from the page you have written.",
			parameters: BRIEF_INPUT,
			safeToRepeat: true,
			async execute() {
				return { isError: false, content: "set the day's brief" };
			},
			apply(state: TimelineState, args) {
				return { ...state, page: { ...state.page, brief: args.text } };
			},
		});
	}

	function markContinuation(): Tool {
		return defineTool({
			name: "mark_continuation",
			description:
				"Say that this day carries on work from an earlier day. The earlier day has to be before this one.",
			parameters: CONTINUATION_INPUT,
			safeToRepeat: true,
			async execute(args, ctx: ToolContext<TimelineState>) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(args.day)) {
					return {
						isError: true,
						content: `a continuation needs a day like 2026-11-17, not "${args.day.slice(0, 40)}"`,
					};
				}
				if (args.day >= ctx.state.day.date) {
					return {
						isError: true,
						content: `a continuation points at an earlier day; this day is ${ctx.state.day.date}`,
					};
				}
				return {
					isError: false,
					content: `this day continues ${args.day}`,
					details: { day: args.day, text: args.text },
				};
			},
			apply(state: TimelineState, args) {
				return {
					...state,
					page: {
						...state.page,
						continuation: { day: args.day, text: args.text },
					},
				};
			},
		});
	}

	function getDiff(): Tool {
		return defineTool({
			name: "get_diff",
			description:
				"Read what changed in one commit or pull request, as a unified diff. Use it when the day's summary line is not enough.",
			parameters: HANDLE_INPUT,
			safeToRepeat: true,
			async execute(args, ctx: ToolContext<TimelineState>) {
				const target = ctx.state.handles.target(args.handle);
				if (target === undefined) {
					return { isError: true, content: unknownHandle(ctx.state.table, args.handle) };
				}
				const read = await reader.diff(target);
				return read.ok
					? { isError: false, content: read.text }
					: { isError: true, content: read.message };
			},
		});
	}

	function getIssueThread(): Tool {
		return defineTool({
			name: "get_issue_thread",
			description:
				"Read an issue's or pull request's description and comments. Use it when the day does not say enough about what was discussed.",
			parameters: HANDLE_INPUT,
			safeToRepeat: true,
			async execute(args, ctx: ToolContext<TimelineState>) {
				const target = ctx.state.handles.target(args.handle);
				if (target === undefined) {
					return { isError: true, content: unknownHandle(ctx.state.table, args.handle) };
				}
				const read = await reader.thread(target);
				return read.ok
					? { isError: false, content: read.text }
					: { isError: true, content: read.message };
			},
		});
	}

	function searchPastDays(): Tool {
		return defineTool({
			name: "search_past_days",
			description:
				"Find earlier days that mention something, with their dates. Use it before claiming this day continues earlier work.",
			parameters: SEARCH_INPUT,
			safeToRepeat: true,
			async execute(args) {
				if (pastDays === undefined) {
					return {
						isError: true,
						content:
							"earlier days are not available in this run; write from the day you were given",
					};
				}
				const found = await pastDays.search(args.query);
				if (found.length === 0) {
					return {
						isError: false,
						content: `no earlier day mentions "${args.query}"`,
					};
				}
				const shown = found.slice(0, 10).map((day) => `${day.date}: ${oneLine(day.text, 400)}`);
				const left = found.length - shown.length;
				return {
					isError: false,
					content: `${shown.join("\n")}${left > 0 ? `\n(and ${left} more)` : ""}`,
				};
			},
		});
	}

	function finish(): Tool {
		return createFinishTool<TimelineState>({
			check: (state, skipped) => doneCheck(state, skipped),
		});
	}

	// The order is the order the model reads them in: build first, then dig.
	return [
		startProject(),
		addLine(),
		addVine(),
		setBrief(),
		markContinuation(),
		getDiff(),
		getIssueThread(),
		searchPastDays(),
		finish(),
	];
}

/**
 * Is the day accounted for? Every handle on the day must be cited by a line or
 * skipped with a reason, and the message names what is missing by kind. This is
 * the check that keeps a day of only issue work from looking empty.
 */
function doneCheck(state: TimelineState, skipped: readonly Skipped[]): DoneCheck {
	if (state.page.brief === null) {
		return {
			ok: false,
			message:
				"the page needs a brief before it can finish; call set_brief with two or three sentences about the day",
		};
	}

	for (const item of skipped) {
		if (state.handles.target(item.handle) === undefined) {
			return {
				ok: false,
				message: `there is no handle "${item.handle.slice(0, 40)}"; ${state.table.describe()}`,
			};
		}
	}

	const covered = coveredHandles(state);
	const expected: Record<"commit" | "pull" | "issue", string[]> = {
		commit: [],
		pull: [],
		issue: [],
	};
	for (const handle of state.handles.all()) {
		const target = state.handles.target(handle);
		if (target !== undefined) {
			expected[target.kind].push(handle);
		}
	}

	const checks: DoneCheck[] = [
		coverageCheck({ expected: expected.commit, covered, label: "commits", skipped }),
		coverageCheck({ expected: expected.pull, covered, label: "pull requests", skipped }),
		coverageCheck({ expected: expected.issue, covered, label: "issues", skipped }),
	];
	// One sentence naming everything, rather than one per kind: the model reads it as
	// a list of what to go back and write.
	const missing = checks
		.filter((check): check is { ok: false; message: string } => !check.ok)
		.map((failure) => failure.message.replace(COVERAGE_PREFIX, ""));
	if (missing.length === 0) {
		return { ok: true };
	}
	return { ok: false, message: `${COVERAGE_PREFIX}${missing.join(", ")}` };
}

/** The call key a tool stores in its details, so a repeated call adds nothing. */
function keyOf(details: unknown): string {
	const key =
		details !== null && typeof details === "object"
			? (details as { key?: unknown }).key
			: undefined;
	return typeof key === "string" ? key : "";
}

function oneLine(text: string, max: number): string {
	const collapsed = text.replace(/\s+/g, " ").trim();
	return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}
