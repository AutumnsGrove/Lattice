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
 *   The turn run is 4 steps: one tool, one retry, the opening turn, the answer.
 * - **No cost, token or time limit.** The key is the writer's own (BYOK), so a
 *   limit here would be Grove deciding how much of their money to spend.
 *
 * `reminders: 0` on both: the timeline nudges a model that answers in prose
 * instead of calling tools, and here prose *is* the answer. A nudge would be the
 * loop arguing with a correct finish.
 */

import { defineRecipe, type JsonObject, type Recipe } from "@autumnsgrove/lyra";
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
 * `ending: "reply"` is the whole of it: the model's own answer is the deliverable, so
 * a reply with no tool calls ends the run `done` and there is no sentinel `finish` to
 * forget. Before Lyra 0.4.0 there was no way to say that — a prose reply read as
 * "stopped without finishing" — so this recipe carried a no-op finish tool and told
 * the model to call it after speaking. Both are gone, and the step budget is back to
 * the spec's `2 × 1 + 2 = 4`.
 *
 * Everything the stuck safeguard does besides that nudge still applies: a tool failing
 * the same way repeatedly still parks the run.
 */
export function createFiresideTurnRecipe({ draft }: TurnRecipeOptions): Recipe<FiresideState> {
	const hasDraft = draft.trim().length > 0;
	const tools = [createReadDraftTool(draft)];

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
		// Prose is the answer, so the "stopped without finishing" nudge has nothing to
		// ask for; the reply *is* the finish.
		ending: "reply",
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
