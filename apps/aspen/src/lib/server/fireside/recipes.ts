/**
 * The two Fireside recipes.
 *
 * `fireside-turn` is one reply in prose; `fireside-draft` organises the writer's
 * own words into a proposal. They are separate recipes rather than one with a
 * mode, because they disagree about almost everything a recipe decides: the tools
 * (one vs three), whether there is anything to finish, and what a good answer even
 * is. Sharing a recipe would mean the turn run carrying three tools it must never
 * call.
 *
 * Two numbers here are deliberate and were argued about (spec, "How it is built"):
 *
 * - **Steps are derived, never declared.** `2 × tools + 2` is one call and one
 *   retry per tool, plus the opening turn and the final answer. A run that reaches
 *   it parks, which is visible and resumable — the correct failure for a guard.
 *   `finish` counts as a tool, so the turn run is 6 steps, not the spec's 4.
 * - **No cost, token or time limit.** The key is the writer's own (BYOK), so a
 *   limit here would be Grove deciding how much of their money to spend.
 *
 * `reminders: 0` on both: the timeline nudges a model that answers in prose
 * instead of calling tools, and here prose *is* the answer. A nudge would be the
 * loop arguing with a correct finish.
 */

import { createFinishTool, defineRecipe, type JsonObject, type Recipe } from "@autumnsgrove/lyra";
import { buildDraftInstructions, buildTurnInstructions } from "./instructions";
import {
	createProposeDraftTool,
	createReadDraftTool,
	createReadRecentPostsTool,
	type FiresideState,
	type RecentPost,
} from "./tools";

export const FIRESIDE_TURN_RECIPE = "fireside-turn";
export const FIRESIDE_DRAFT_RECIPE = "fireside-draft";
export const FIRESIDE_RECIPE_VERSION = 1;

/** The body budget a proposal is held to, before it is refused for being long. */
export const DEFAULT_DRAFT_WORDS = 1_400;

/**
 * Steps for a recipe with `tools` tools: one call and one retry each, plus the
 * opening turn and the answer. Never written as a literal at a call site.
 */
export function stepsFor(toolCount: number): number {
	return 2 * toolCount + 2;
}

/**
 * Sized to the model, with a policy cap — not a constant copied from the timeline.
 *
 * A window costs nothing until it is reached; the *history* is what costs. So a
 * small window does not save money, it only spends a summary call and throws
 * detail away. Compaction should essentially never fire for a conversation this
 * size; if it does, the signal is about tool payloads, not the chat.
 */
export const FIRESIDE_COMPACTION = {
	contextWindow: 120_000,
	reserveTokens: 4_000,
	keepTokens: 40_000,
} as const;

/** What a run needs to know about the page before it starts. */
/**
 * Both runs take the page, and optionally the conversation so far.
 *
 * `history` is *rendered by the route* from `fireside_messages` — never accepted
 * from a request body — and is already wrapped by `secureUserContent` when it
 * arrives. It is optional so the first turn of a session needs no plumbing.
 */
const DRAFT_INPUT: JsonObject = {
	type: "object",
	properties: {
		draft: { type: "string" },
		history: { type: "string" },
	},
	required: ["draft"],
};

export interface TurnRecipeOptions {
	/** The editor's words. Read by `read_draft`; never typed back at the model by setup. */
	draft: string;
}

/**
 * One reply, in prose.
 *
 * **`finish` is required, and the spec says it should not be.** The spec's row for
 * this recipe reads "Finish: prose with no tool call", which reads like Lyra ends a
 * run when the model simply stops calling tools. It does not: `runTask` treats a
 * reply with no tool call as "stopped without finishing" — it nudges when the stuck
 * safeguard has reminders, and otherwise fails the run (`run.js`, the `calls.length
 * === 0` branch). So a sentinel `finish` is the only way a turn can end `done`, and
 * the model is told to say its piece *then* finish.
 *
 * The check always passes: the turn's job is to say one true thing, and no state
 * can make that false. Two consequences worth knowing: the step budget is now
 * `2 × 2 + 2 = 6` rather than the spec's 4, and a model that replies without
 * finishing parks the run instead of quietly succeeding.
 */
export function createFiresideTurnRecipe({ draft }: TurnRecipeOptions): Recipe<FiresideState> {
	const hasDraft = draft.trim().length > 0;
	const tools = [
		createReadDraftTool(draft),
		createFinishTool({
			check: () => ({ ok: true }),
			content: "that's your turn — the writer has it.",
		}),
	];

	return defineRecipe({
		name: FIRESIDE_TURN_RECIPE,
		version: FIRESIDE_RECIPE_VERSION,
		instructions: buildTurnInstructions({ hasDraft }),
		input: DRAFT_INPUT,
		setup: (input) => {
			const { draft: inputDraft, history } = input as { draft?: string; history?: string };
			const page = hasDraft
				? `The writer has ${inputDraft?.trim().split(/\s+/).filter(Boolean).length ?? 0} words on the page and is mid-draft. \`read_draft\` shows you what they have.`
				: "The page is blank — the writer has not started writing yet.";
			return {
				message: history === undefined || history === "" ? page : `${history}\n\n${page}`,
				state: { draft: inputDraft ?? draft },
			};
		},
		tools,
		limits: { steps: stepsFor(tools.length) },
		compaction: FIRESIDE_COMPACTION,
		stuck: { reminders: 0 },
	});
}

export interface DraftRecipeOptions extends TurnRecipeOptions {
	/** Titles and short excerpts of the writer's published posts. May be empty. */
	recentPosts?: readonly RecentPost[];
	/** Overrides the body's word budget. */
	maxWords?: number;
}

/**
 * The writer's own words, organised.
 *
 * The three tools are the draft run's whole advantage over a longer prompt: read
 * the page, hear the voice, and propose something a person then decides about.
 */
export function createFiresideDraftRecipe({
	draft,
	recentPosts = [],
	maxWords = DEFAULT_DRAFT_WORDS,
}: DraftRecipeOptions): Recipe<FiresideState> {
	const tools = [
		createReadDraftTool(draft),
		createReadRecentPostsTool(recentPosts),
		createProposeDraftTool({ draft, maxWords }),
	];

	return defineRecipe({
		name: FIRESIDE_DRAFT_RECIPE,
		version: FIRESIDE_RECIPE_VERSION,
		instructions: buildDraftInstructions({
			maxWords,
			hasRecentPosts: recentPosts.length > 0,
		}),
		input: DRAFT_INPUT,
		setup: (input) => {
			const { draft: inputDraft, history } = input as { draft?: string; history?: string };
			const ask =
				"The writer has asked you to organise what is already here into a draft. Read the page, then propose.";
			return {
				message: history === undefined || history === "" ? ask : `${history}\n\n${ask}`,
				state: { draft: inputDraft ?? draft },
			};
		},
		tools,
		limits: { steps: stepsFor(tools.length) },
		compaction: FIRESIDE_COMPACTION,
		stuck: { reminders: 0 },
	});
}
