/**
 * Fireside's three tools, and nothing else.
 *
 * The bar a tool has to clear here is the timeline's: **the model cannot say the
 * thing correctly without it.** The model can ask a question without help, and it
 * can write a sentence without help — what it cannot do is know what is on the
 * writer's page, know how that writer sounds, or attach a margin note to the
 * right paragraph. Those three are the tools.
 *
 * Everything else was considered and left out on purpose (the spec keeps the
 * list): `suggest_title` (the proposal carries a title), `ask_writer` (the
 * conversation is the asking), `insert_into_editor` (accept is a person's
 * action), `search_my_posts`, `read_past_session`, `remember`.
 *
 * A refusal is an ordinary error result with a message naming what *is* there, so
 * the model corrects itself inside the loop. That is what a prompt cannot do.
 */

import {
	NO_PARAMETERS,
	createProposeTool,
	defineTool,
	type JsonObject,
	type Tool,
	type ToolContext,
} from "@autumnsgrove/lyra";
import { readDraftWindow, resolveVines, DEFAULT_DRAFT_WORDS } from "./draft-text";

/** A post the writer has published before, for the draft run to hear their voice. */
export interface RecentPost {
	title: string;
	excerpt: string;
}

/** What a fireside run carries besides its tools. Never written by a tool. */
export interface FiresideState {
	draft: string;
}

export const READ_DRAFT_BYTES = 6_000;
export const READ_RECENT_POSTS_BYTES = 6_000;

/**
 * `read_draft` — the page as it stands.
 *
 * On both runs, because mid-post Fireside is half the feature: without it the
 * model is guessing at a draft it has been told exists, and it asks the writer to
 * repeat what it could have read.
 */
export function createReadDraftTool(draft: string, maxWords = DEFAULT_DRAFT_WORDS): Tool {
	return defineTool({
		name: "read_draft",
		description:
			"Read what is already on the writer's page. Returns the beginning of the draft; if it is longer than the window you will be told to ask about a section.",
		parameters: NO_PARAMETERS,
		safeToRepeat: true,
		maxResultBytes: READ_DRAFT_BYTES,
		async execute(_args, _ctx: ToolContext<FiresideState>) {
			const window = readDraftWindow(draft, maxWords);
			if (window.wordCount === 0) {
				return {
					isError: false,
					content:
						"the page is blank — there are no words in the editor yet, so there is nothing to read",
				};
			}
			return {
				isError: false,
				content: window.text,
				details: { words: window.wordCount, truncated: window.truncated },
			};
		},
	});
}

/**
 * `read_my_recent_posts` — so the model hears the writer's voice instead of being
 * told to have one.
 *
 * Titles and a short excerpt of each: enough to catch rhythm and word choice,
 * short enough that the model does not start summarizing someone else's essay.
 */
export function createReadRecentPostsTool(posts: readonly RecentPost[]): Tool {
	return defineTool({
		name: "read_my_recent_posts",
		description:
			"Read short excerpts from this writer's own recently published posts, so your proposal matches how they actually sound.",
		parameters: NO_PARAMETERS,
		safeToRepeat: true,
		maxResultBytes: READ_RECENT_POSTS_BYTES,
		async execute(_args, _ctx: ToolContext<FiresideState>) {
			if (posts.length === 0) {
				return {
					isError: false,
					content:
						"this writer has no published posts yet — their voice is only in the conversation and the draft",
				};
			}
			const content = posts
				.slice(0, 3)
				.map((post, index) => `${index + 1}. "${post.title}"\n${post.excerpt.trim()}`)
				.join("\n\n");
			return { isError: false, content, details: { count: Math.min(posts.length, 3) } };
		},
	});
}

/**
 * The proposal's payload, which is the shape the accept step reads.
 *
 * Exported so a test can prove the largest legal proposal still fits the row it is
 * stored in. `fireside_messages.content` is capped at 8,000 characters by the
 * schema, and the stored content *is* this payload serialised — so the bounds here
 * and the CHECK there are one contract, tested as one.
 */
export const PROPOSAL_SCHEMA: JsonObject = {
	type: "object",
	properties: {
		title: { type: "string", minLength: 1, maxLength: 120 },
		// 3,000 characters is ~400 words at the budget the prompt states, with room
		// for the long words real prose sometimes has. Six vines' worth of quotes and
		// notes plus the title and the payload's own JSON still leave headroom under
		// the 8,000-character row.
		body: { type: "string", minLength: 1, maxLength: 3000 },
		vines: {
			type: "array",
			maxItems: 6,
			items: {
				type: "object",
				properties: {
					// The model quotes its own prose; the tool resolves the anchor.
					quote: { type: "string", minLength: 1, maxLength: 400 },
					text: { type: "string", minLength: 1, maxLength: 280 },
				},
				required: ["quote", "text"],
			},
		},
	},
	required: ["title", "body"],
};

export interface ProposeDraftOptions {
	/** The page as it stands, so a proposal can be measured against the words already there. */
	draft: string;
	/** The body's word budget. Over it is refused, the same way a bad quote is. */
	maxWords: number;
}

/**
 * `propose_draft` — the only writer of prose in the feature, and it stops and asks.
 *
 * Built on Lyra's `createProposeTool` (a finished run's result, for a person to
 * decide later), with one check the generic tool cannot make: a vine's `quote`
 * has to be a sentence of *this* body. The payload's schema catches shape; this
 * catches a quote the model remembered from the conversation instead of from
 * what it wrote.
 */
export function createProposeDraftTool({ draft, maxWords }: ProposeDraftOptions): Tool {
	const base = createProposeTool({
		name: "propose_draft",
		description:
			"Propose a draft for the writer to accept, revise, or refuse. Ends the run: they decide afterwards.",
		payload: PROPOSAL_SCHEMA,
	});

	return {
		...base,
		async execute(args, ctx) {
			const payload = isPayload(args) ? args.payload : undefined;
			if (payload === undefined) {
				return { isError: true, content: "a proposal needs a payload with a title and a body" };
			}

			const words = payload.body.trim().split(/\s+/).filter(Boolean).length;
			if (words > maxWords) {
				return {
					isError: true,
					content: `that draft is ${words} words and the budget is ${maxWords}. Tighten it — the writer's own sentences are the point, not the volume`,
				};
			}

			const resolved = resolveVines(payload.body, payload.vines ?? []);
			if (!resolved.ok) {
				return { isError: true, content: resolved.message };
			}

			// Hand the generic tool the payload with anchors already resolved: from
			// here on it is a proposal like any other.
			const rewritten = {
				...(args as Record<string, unknown>),
				payload: {
					title: payload.title,
					body: payload.body,
					vines: resolved.vines,
					// Recorded, not used by the model: the accept step shows the writer
					// what the page already held when this was proposed.
					proposedAgainst: draft.length,
				},
			} as unknown as JsonObject;

			return base.execute(rewritten, ctx);
		},
	};
}

interface ProposedPayload {
	title: string;
	body: string;
	vines?: { quote: string; text: string }[];
}

function isPayload(args: unknown): args is { payload: ProposedPayload } {
	if (typeof args !== "object" || args === null) return false;
	const payload = (args as { payload?: unknown }).payload;
	if (typeof payload !== "object" || payload === null) return false;
	const { title, body, vines } = payload as Record<string, unknown>;
	if (typeof title !== "string" || typeof body !== "string") return false;
	if (vines === undefined) return true;
	return Array.isArray(vines);
}
