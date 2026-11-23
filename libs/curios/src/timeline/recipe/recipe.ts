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
import { buildTimelineInstructions } from "./instructions";
import { emptyPage, type TimelineState } from "./state";
import { createTimelineTools, type PastDays } from "./tools";

export const TIMELINE_RECIPE_NAME = "timeline";
export const TIMELINE_RECIPE_VERSION = 1;
/** Model turns before a run parks (Lyra decision 92). A normal day is well under it. */
export const DEFAULT_STEP_LIMIT = 40;

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
	return defineRecipe({
		name: TIMELINE_RECIPE_NAME,
		version: TIMELINE_RECIPE_VERSION,
		instructions: buildTimelineInstructions({
			ownerName: options.ownerName,
			persona: options.persona,
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
		tools: createTimelineTools({ reader: options.reader, pastDays: options.pastDays }),
		limits: { steps: options.steps ?? DEFAULT_STEP_LIMIT },
	});
}
