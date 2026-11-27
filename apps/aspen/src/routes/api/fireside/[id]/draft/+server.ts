/**
 * POST /api/fireside/[id]/draft — organize the writer's own words into a proposal.
 *
 * Three gates before a single token is spent:
 *
 * 1. The session must be this tenant's and this writer's (`404` otherwise).
 * 2. `canDraft` — three writer messages and ~150 tokens of their own words. Wisp's
 *    replies never count; a model that talks a lot has not given the writer
 *    anything to organize. Below the gate the answer is the sentence in
 *    `NOT_ENOUGH_YET`, not a paid run.
 * 3. A key must exist. A missing key is a `400` with the settings page named, not a
 *    500 — it is a configuration the writer can fix.
 *
 * The proposal itself is the run's result, not a tool call we have to interpret: a
 * run that ends `done` because `propose_draft` was accepted has already had its
 * payload validated and its vine quotes resolved. The proposal is returned to the
 * client and **not** written to the post — accepting is a person's action.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runTask } from "@autumnsgrove/lyra";
import { memoryStorage } from "@autumnsgrove/lyra/memory";
import { createLumenModelSlot } from "@autumnsgrove/lyra-lumen";
import {
	createTenantSecretsSlot,
	MISSING_AI_KEY_MESSAGE,
	resolveOpenRouterKey,
} from "@autumnsgrove/lyra-lumen/secrets";
import {
	API_ERRORS,
	ARBOR_ERRORS,
	logGroveError,
	throwGroveError,
} from "@autumnsgrove/lattice/errors";
import { requireFireside } from "$lib/server/fireside/guard";
import { canDraft, NOT_ENOUGH_YET } from "$lib/server/fireside/opening";
import {
	addUsage,
	appendMessage,
	listMessages,
	loadOwnedSession,
	renderTranscript,
} from "$lib/server/fireside/session";
import { createFiresideDraftRecipe } from "$lib/server/fireside/recipes";

/** What a proposal looks like once Lyra has validated it. */
interface Proposal {
	title: string;
	body: string;
	vines: { anchor: string; text: string }[];
}

export const POST: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;
	const env = event.platform?.env;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	const messages = await listMessages(db, tenantId, sessionId);
	if (!canDraft(messages)) {
		return json({ drafted: false, message: NOT_ENOUGH_YET }, { status: 200 });
	}

	let body: { draft?: unknown } = {};
	try {
		body = (await event.request.json()) as typeof body;
	} catch {
		// No body is fine: the page may genuinely be blank, and the conversation is
		// what the draft is built from.
	}
	const draft = typeof body.draft === "string" ? body.draft : "";

	if (!env?.GROVE_KEK) {
		throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Fireside", {
			detail: "GROVE_KEK is not configured, so no AI key can be read",
		});
	}

	const aiKey = await resolveOpenRouterKey(
		createTenantSecretsSlot({ db, kek: env.GROVE_KEK, tenantId }).get,
	).catch((cause) => {
		logGroveError("Fireside", ARBOR_ERRORS.DB_NOT_AVAILABLE, {
			detail: "the AI key could not be read",
			cause,
		});
		return undefined;
	});

	if (!aiKey) {
		return json(
			{ error: "openrouter_key_missing", message: MISSING_AI_KEY_MESSAGE },
			{ status: 400 },
		);
	}

	const lumen = env.LUMEN;
	const lumenKey = env.LUMEN_API_KEY;
	if (!lumen || !lumenKey) {
		throwGroveError(500, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "Fireside");
	}

	const recipe = createFiresideDraftRecipe({
		draft,
		recentPosts: await recentPostsFor(db, tenantId),
	});

	// The proposal is a record entry, not a field on the run's result and not on the
	// `tool_end` event (which carries the model-facing text only).
	const storage = memoryStorage();

	const result = await runTask({
		runId: crypto.randomUUID(),
		task: recipe.name,
		host: "aspen",
		input: "organise the conversation into a draft",
		inputValue: { draft, history: renderTranscript(messages) } as never,
		setup: recipe.setup,
		system: recipe.instructions,
		tools: recipe.tools,
		model: createLumenModelSlot({
			baseUrl: "https://grove-lumen",
			fetcher: lumen,
			apiKey: lumenKey,
			tenantId,
			tenantApiKey: aiKey.key,
		}),
		storage,
		clock: workerClock,
		ids: { next: (prefix) => `${prefix}_${crypto.randomUUID()}` },
		limits: recipe.limits,
		compaction: recipe.compaction,
		stuck: recipe.stuck,
		signal: event.request.signal,
	});

	const proposal = readProposalFrom(storage.saved());

	await addUsage(db, sessionId, {
		turns: result.turns,
		inputTokens: result.usage.inputTokens,
		outputTokens: result.usage.outputTokens,
		costUsd: result.usage.cost?.amount ?? 0,
	});

	if (proposal === undefined) {
		logGroveError("Fireside", API_ERRORS.AI_SERVICE_NOT_CONFIGURED, {
			detail: `the draft run did not propose: ${result.reason}`,
			parked: result.parkedReason,
		});
		throwGroveError(502, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "Fireside", {
			detail: "Wisp could not shape that yet. Your conversation is safe — try again.",
		});
	}

	// The proposal is Wisp's message in the transcript, so a resume shows that it
	// happened without re-running the model to find out.
	await appendMessage(db, {
		id: crypto.randomUUID(),
		sessionId,
		tenantId,
		role: "wisp",
		kind: "draft",
		content: JSON.stringify(proposal),
	});

	await db
		.prepare(
			`UPDATE fireside_sessions SET status = 'drafted', updated_at = unixepoch() WHERE id = ?`,
		)
		.bind(sessionId)
		.run();

	return json({ drafted: true, proposal });
};

/** The writer's published posts, so the draft run can hear their voice. */
async function recentPostsFor(
	db: D1Database,
	tenantId: string,
): Promise<{ title: string; excerpt: string }[]> {
	const { results } = await db
		.prepare(
			`SELECT title, markdown_content
			   FROM posts
			  WHERE tenant_id = ? AND status = 'published'
			  ORDER BY published_at DESC
			  LIMIT 3`,
		)
		.bind(tenantId)
		.all<{ title: string; markdown_content: string }>();

	return (results ?? []).map((row) => ({
		title: row.title,
		// ~80 words: enough to hear a rhythm, short enough not to summarize it.
		excerpt: row.markdown_content.split(/\s+/).slice(0, 80).join(" "),
	}));
}

/** The last proposal in the run's record, if it made one. */
function readProposalFrom(lines: readonly string[]): Proposal | undefined {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const parsed = safeJson(lines[index] ?? "");
		if (parsed === undefined || parsed.type !== "proposal") continue;
		const payload = parsed.payload;
		if (typeof payload !== "object" || payload === null) continue;
		const shaped = shapeProposal(payload as Record<string, unknown>);
		if (shaped !== undefined) return shaped;
	}
	return undefined;
}

function safeJson(line: string): Record<string, unknown> | undefined {
	try {
		const parsed = JSON.parse(line) as unknown;
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

function shapeProposal(payload: Record<string, unknown>): Proposal | undefined {
	const { title, body, vines } = payload;
	if (typeof title !== "string" || typeof body !== "string") return undefined;
	return {
		title,
		body,
		vines: Array.isArray(vines)
			? vines.flatMap((vine) => {
					if (typeof vine !== "object" || vine === null) return [];
					const { anchor, text } = vine as Record<string, unknown>;
					if (typeof anchor !== "string" || typeof text !== "string") return [];
					return [{ anchor, text }];
				})
			: [],
	};
}

const workerClock = {
	now: () => Date.now(),
	sleep: (ms: number, signal?: AbortSignal) =>
		new Promise<void>((resolve, reject) => {
			const timer = setTimeout(resolve, ms);
			signal?.addEventListener("abort", () => {
				clearTimeout(timer);
				reject(new Error("aborted"));
			});
		}),
};
