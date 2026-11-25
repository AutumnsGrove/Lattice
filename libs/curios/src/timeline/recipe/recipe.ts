/**
 * The timeline recipe (#1798, slice 2).
 *
 * One recipe, created per run because two of its parts belong to the tenant: the
 * voice its instructions carry, and the GitHub reader that answers `get_diff` and
 * `get_issue_thread`. Neither touches the run's state, so neither can reach the
 * record: the day is input, and the token lives in a closure (decision 51).
 *
 * The recipe itself is deliberately thin. `setup` names the day with
 * `mintDayHandles` and renders it, the tools are the eight from the tool table, and
 * the step limit is 40 (decision 92) unless the caller says otherwise. What it
 * replaces is one long prompt that had to get every exact string right in one
 * answer; here the model asks, cites handles, and is refused when it cites
 * something that is not on the day.
 */

import {
	compileSchema,
	createHandleTable,
	defineRecipe,
	validateValue,
	type JsonObject,
	type JsonValue,
	type Validation,
} from "@autumnsgrove/lyra";
import { mintDayHandles } from "../day/handles";
import { renderDay } from "../day/render";
import type { TimelineDay } from "../day/types";
import type { GitHubReader } from "./github";
import { buildTimelineInstructions, DEFAULT_PAGE_WORDS, pageWordsForDay } from "./instructions";
import { emptyPage, type TimelineState } from "./state";
import { createTimelineTools, type PastDays } from "./tools";

export const TIMELINE_RECIPE_NAME = "timeline";
export const TIMELINE_RECIPE_VERSION = 1;
/** Model turns before a run parks (Lyra decision 92). A normal day is well under it. */
export const DEFAULT_STEP_LIMIT = 40;

/**
 * The window the run is compacted against, which is deliberately much smaller than
 * the models' own.
 *
 * Lyra compacts when the history approaches the context window, and measures in
 * tokens. Lumen refuses a request whose message array passes 100 items, and a day
 * with many small tool calls reaches that long before 1M tokens — the first real run
 * died at turn 12 on exactly that. Compacting keeps the conversation's *shape*, not
 * just its length, inside the protocol.
 *
 * **The model's own window is not the number to use.** DeepSeek's is 1M, and setting
 * 1M here would mean compaction never fires — which is the run that cost 8.6 cents,
 * re-sending its whole history 31 times. Two reasons this stays small:
 *
 * 1. It is a *proxy for message count*. Lumen caps a request at 100 messages (#1817),
 *    and a turn is two or three of them, so ~30 turns is the real ceiling. A
 *    token-based compactor has to be pointed somewhere below that.
 * 2. It is a *cost* choice. Every turn re-sends the conversation, so the same output
 *    from a 32k history costs a third of what it costs from a 90k one.
 *
 * 16k was too tight in practice: the day plus what a cut keeps still came to more
 * than the window, and a run failed with "compacting cannot make it fit" before it
 * wrote its headline. 32k leaves room for both while messages stay well under the cap.
 */
export const COMPACTION_WINDOW = {
	contextWindow: 32_000,
	reserveTokens: 4_000,
	keepTokens: 12_000,
} as const;

/** Re-exported so the public surface keeps one name for the budget. */
export {
	DEFAULT_PAGE_WORDS,
	PAGE_WORDS_CEILING,
	PAGE_WORDS_PER_REPO,
	pageWordsForDay,
} from "./instructions";

export interface TimelineRecipeOptions {
	/** Answers the two GitHub tools. Holds the token; never enters the run's state. */
	reader: GitHubReader;
	/** Earlier days, when the caller can serve them. */
	pastDays?: PastDays;
	/** The preset's voice lines. Defaults to the professional voice. */
	persona?: string;
	/** Whose journal this is, when we know the name. */
	ownerName?: string;
	/** Overrides the step limit. */
	steps?: number;
	/** Overrides the page's word budget. */
	maxWords?: number;
	/**
	 * The repos the day touched, so the budget can follow the work.
	 *
	 * A day of nine repos does not fit in a one-repo allowance, and the model finds
	 * that out by thrashing against the budget instead of writing the day (#1798).
	 * Ignored when `maxWords` is given, which is what the tests and the comparison
	 * use to pin a number.
	 */
	repos?: readonly string[];
}

/**
 * The day, as JSON Schema. Only the fields the tools and the renderer read are
 * declared: the input is our own fetcher's output, and the schema is here because a
 * record outlives a deploy and its saved input is checked again on a resume
 * (Lyra decision 20). Nullable fields are left out rather than declared with a type
 * they do not always have, because the schema subset has no unions.
 */
const DAY_INPUT: JsonObject = {
	type: "object",
	properties: {
		date: { type: "string", minLength: 10, maxLength: 10 },
		timezone: { type: "string", minLength: 1 },
		githubUsername: { type: "string", minLength: 1 },
		repos: { type: "array", items: { type: "string" } },
		commits: {
			type: "array",
			items: {
				type: "object",
				properties: {
					repo: { type: "string" },
					sha: { type: "string" },
					message: { type: "string" },
					authorDate: { type: "string" },
					additions: { type: "number" },
					deletions: { type: "number" },
					merge: { type: "boolean" },
				},
				required: ["repo", "sha", "message", "authorDate", "merge"],
				// The day carries nullable fields (`closedAt`, `mergeCommit`) and the schema
				// subset has no unions, so the objects stay open and the required fields do
				// the checking.
				additionalProperties: true,
			},
		},
		pulls: {
			type: "array",
			items: {
				type: "object",
				properties: {
					repo: { type: "string" },
					number: { type: "number" },
					title: { type: "string" },
					url: { type: "string" },
					activity: { type: "array", items: { enum: ["opened", "merged", "closed", "commented"] } },
					state: { enum: ["open", "closed"] },
					merged: { type: "boolean" },
					createdAt: { type: "string" },
					comments: { type: "number" },
				},
				required: ["repo", "number", "title", "activity", "merged"],
				additionalProperties: true,
			},
		},
		issues: {
			type: "array",
			items: {
				type: "object",
				properties: {
					repo: { type: "string" },
					number: { type: "number" },
					title: { type: "string" },
					url: { type: "string" },
					activity: {
						type: "array",
						items: { enum: ["opened", "closed", "commented"] },
					},
					state: { enum: ["open", "closed"] },
					createdAt: { type: "string" },
					comments: { type: "number" },
				},
				required: ["repo", "number", "title", "activity"],
				additionalProperties: true,
			},
		},
		warnings: {
			type: "array",
			items: {
				type: "object",
				properties: { repo: { type: "string" }, message: { type: "string" } },
				required: ["message"],
				additionalProperties: true,
			},
		},
	},
	required: ["date", "timezone", "githubUsername", "repos", "commits", "pulls", "issues"],
	additionalProperties: true,
};

/** Compiled once: a bad schema is a definition error, raised at load, not per run. */
const DAY_SCHEMA = compileSchema(DAY_INPUT, "the timeline day");

/**
 * Check a day against the recipe's input schema. The runtime calls this before
 * `setup` on a resume, and `generateDay` calls it before a run starts.
 */
export function checkDayInput(input: JsonValue): Validation<JsonValue> {
	return validateValue(DAY_SCHEMA, input);
}

export function createTimelineRecipe(options: TimelineRecipeOptions) {
	const maxWords = options.maxWords ?? pageWordsForDay(options.repos?.length ?? 1);

	return defineRecipe({
		name: TIMELINE_RECIPE_NAME,
		version: TIMELINE_RECIPE_VERSION,
		instructions: buildTimelineInstructions({
			ownerName: options.ownerName,
			persona: options.persona,
			maxWords,
		}),
		input: DAY_INPUT,
		setup: (input) => {
			// Checked against DAY_INPUT before this runs, and produced by
			// `fetchTimelineDay`, so the shape is ours rather than a model's.
			const day = input as unknown as TimelineDay;
			const table = createHandleTable();
			const handles = mintDayHandles(day, table);
			const state: TimelineState = {
				day,
				table,
				handles,
				page: emptyPage(),
				nextLine: 1,
				applied: [],
			};
			return { message: renderDay(day, handles), state };
		},
		tools: createTimelineTools({
			reader: options.reader,
			pastDays: options.pastDays,
			maxWords,
		}),
		limits: { steps: options.steps ?? DEFAULT_STEP_LIMIT },
		compaction: COMPACTION_WINDOW,
		// Two nudges is Lyra's default. A day this size gives a weaker model one more
		// chance to get back to writing tools after it answers with prose.
		stuck: { reminders: 3 },
	});
}
