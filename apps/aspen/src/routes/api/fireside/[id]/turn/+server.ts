/**
 * POST /api/fireside/[id]/turn — the writer says something, Wisp answers once.
 *
 * The order matters, and each step is there because of one:
 *
 * 1. The session is loaded tenant- **and writer**-scoped; missing → `404`.
 * 2. The writer's message is validated *before* anything is spent: empty and
 *    over-2,000-character messages are refused, because a refusal after a paid
 *    call is a refusal that cost money.
 * 3. It is appended, then the conversation so far is rendered **from the database**
 *    for the run. The request body never supplies history — that is the
 *    fabrication surface the old design had.
 * 4. The run happens on the writer's own key; its usage is added to the session.
 * 5. Wisp's reply is appended and returned.
 *
 * If the run fails, the writer's message stays and Wisp's reply does not: they did
 * say it, and nothing answered. The panel shows that honestly rather than pretending
 * the turn never happened.
 *
 * The Lyra run's own record is kept in memory for the request and thrown away. The
 * record we *keep* is `fireside_messages` — the writer's transcript, which is what
 * the feature promises, and which no run id needs to be resumed for.
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
import {
	addUsage,
	appendMessage,
	listMessages,
	loadOwnedSession,
	renderTranscript,
} from "$lib/server/fireside/session";
import { createFiresideTurnRecipe } from "$lib/server/fireside/recipes";

/**
 * The spec's ceiling. Longer than this is not a message, it is a paste.
 * (Not exported: SvelteKit treats a route module's exports as endpoints.)
 */
const MAX_MESSAGE_CHARS = 2_000;

export const POST: RequestHandler = async (event) => {
	const { db, tenantId, userId } = await requireFireside(event);
	const sessionId = event.params.id;
	const env = event.platform?.env;

	const session = await loadOwnedSession(db, tenantId, userId, sessionId);
	if (!session) {
		throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "Fireside");
	}

	let body: { message?: unknown; draft?: unknown };
	try {
		body = (await event.request.json()) as typeof body;
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "Fireside");
	}

	const text = typeof body.message === "string" ? body.message.trim() : "";
	if (text === "") {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "Fireside", {
			detail: "a turn needs a message",
		});
	}
	if (text.length > MAX_MESSAGE_CHARS) {
		throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "Fireside", {
			detail: `messages are limited to ${MAX_MESSAGE_CHARS} characters`,
		});
	}

	// The editor's words, for `read_draft`. Optional: a blank page is a normal turn.
	const draft = typeof body.draft === "string" ? body.draft : "";
	const history = renderTranscript(await listMessages(db, tenantId, sessionId));

	await appendMessage(db, {
		id: crypto.randomUUID(),
		sessionId,
		tenantId,
		role: "user",
		content: text,
	});

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
		// A configuration the writer can fix, so it is a body they can act on rather
		// than an error page. `MISSING_AI_KEY_MESSAGE` names Settings → AI.
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

	const recipe = createFiresideTurnRecipe({ draft });

	// `RunResult` carries usage and state, not the words — the reply is whatever the
	// last assistant message said, so it is read from the run's events.
	let reply: string | undefined;
	const result = await runTask({
		runId: crypto.randomUUID(),
		task: recipe.name,
		host: "aspen",
		input: text,
		inputValue: { draft, history } as never,
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
		storage: memoryStorage(),
		clock: workerClock,
		ids: { next: (prefix) => `${prefix}_${crypto.randomUUID()}` },
		limits: recipe.limits,
		compaction: recipe.compaction,
		// The recipe says how its run ends; the run has to be told. Without this the
		// turn's prose would read as "stopped without finishing".
		ending: recipe.ending,
		stuck: recipe.stuck,
		signal: event.request.signal,
		onEvent: (event) => {
			if (event.type === "message_end" && event.text.trim() !== "") {
				reply = event.text;
			}
		},
	});

	await addUsage(db, sessionId, {
		turns: result.turns,
		inputTokens: result.usage.inputTokens,
		outputTokens: result.usage.outputTokens,
		costUsd: result.usage.cost?.amount ?? 0,
	});

	if (result.reason !== "done" || reply === undefined) {
		logGroveError("Fireside", API_ERRORS.AI_SERVICE_NOT_CONFIGURED, {
			detail: `the turn did not finish: ${result.reason}`,
			parked: result.parkedReason,
		});
		throwGroveError(502, API_ERRORS.AI_SERVICE_NOT_CONFIGURED, "Fireside", {
			detail: "Wisp could not answer that one. Your message is saved — try again.",
		});
	}

	await appendMessage(db, {
		id: crypto.randomUUID(),
		sessionId,
		tenantId,
		role: "wisp",
		content: reply,
	});

	return json({ reply, turns: result.turns });
};

/** A worker has no fake clock; a turn simply takes as long as it takes. */
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
