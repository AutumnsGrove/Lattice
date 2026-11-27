/**
 * Sessions and messages, as the routes need them.
 *
 * Two rules from the spec are enforced here rather than in each route:
 *
 * 1. **Every lookup is tenant-scoped, and a missing row is `404`, never `403`.**
 *    A `403` confirms the session exists, which is the one thing a tenant boundary
 *    must not disclose.
 * 2. **The transcript comes from the database, never from the request.** A turn's
 *    history is read from `fireside_messages`; the only thing a request body may
 *    supply is the writer's next sentence.
 *
 * A note on how a turn reaches the model (chosen here, not in the spec): each turn
 * is its own Lyra run, and the conversation so far is rendered into the opening
 * message. Lyra's mid-run *record* is per-run, and a chat has to survive the run
 * ending — so the schedule is the database, exactly as the security section says.
 * `read_draft` is still there for the page itself; nothing about the model's
 * ability to see the writer's words depends on the replayed history.
 */

import { secureUserContent } from "@autumnsgrove/lattice/ai/lumen";

export interface FiresideSessionRow {
	id: string;
	tenant_id: string;
	user_id: string;
	status: "open" | "drafted" | "accepted" | "abandoned";
	turns: number;
	input_tokens: number;
	output_tokens: number;
	cost_usd: number;
	model: string | null;
	transcript_public: number;
	transcript_published_at: number | null;
	started_at: number;
	updated_at: number;
	expires_at: number | null;
}

export interface FiresideMessageRow {
	id: string;
	session_id: string;
	role: "user" | "wisp";
	kind: "turn" | "draft";
	content: string;
	seq: number;
	created_at: number;
}

/** How many turns a replayed transcript may carry before it is trimmed. */
export const TRANSCRIPT_TURN_LIMIT = 20;

/**
 * One session, for one tenant and one writer.
 *
 * Scoped on all three because a session belongs to a person, not to the grove: an
 * editor shared between two people on the same tenant must not resume the other's
 * fire.
 */
export async function loadOwnedSession(
	db: D1Database,
	tenantId: string,
	userId: string,
	sessionId: string,
): Promise<FiresideSessionRow | null> {
	return db
		.prepare(
			`SELECT id, tenant_id, user_id, status, turns, input_tokens, output_tokens, cost_usd,
			        model, transcript_public, transcript_published_at, started_at, updated_at, expires_at
			   FROM fireside_sessions
			  WHERE id = ? AND tenant_id = ? AND user_id = ?`,
		)
		.bind(sessionId, tenantId, userId)
		.first<FiresideSessionRow>();
}

/** The conversation, oldest first. `seq` orders it; two turns in one second is normal. */
export async function listMessages(
	db: D1Database,
	tenantId: string,
	sessionId: string,
): Promise<FiresideMessageRow[]> {
	const { results } = await db
		.prepare(
			`SELECT id, session_id, role, kind, content, seq, created_at
			   FROM fireside_messages
			  WHERE session_id = ? AND tenant_id = ?
			  ORDER BY seq ASC`,
		)
		.bind(sessionId, tenantId)
		.all<FiresideMessageRow>();

	return results ?? [];
}

/**
 * Append one message and return it.
 *
 * `seq` is read and written in one statement, so two appends racing on the same
 * session cannot mint the same number — the unique `(session_id, seq)` index would
 * refuse it rather than interleave the conversation.
 */
export async function appendMessage(
	db: D1Database,
	message: {
		id: string;
		sessionId: string;
		tenantId: string;
		role: "user" | "wisp";
		kind?: "turn" | "draft";
		content: string;
	},
): Promise<number> {
	const row = await db
		.prepare(
			`INSERT INTO fireside_messages (id, session_id, tenant_id, role, kind, content, seq)
			 VALUES (?, ?, ?, ?, ?, ?,
			         (SELECT COALESCE(MAX(seq), 0) + 1 FROM fireside_messages WHERE session_id = ?))
			 RETURNING seq`,
		)
		.bind(
			message.id,
			message.sessionId,
			message.tenantId,
			message.role,
			message.kind ?? "turn",
			message.content,
			message.sessionId,
		)
		.first<{ seq: number }>();

	return row?.seq ?? 0;
}

/** What a turn cost, added to the session's running totals. */
export async function addUsage(
	db: D1Database,
	sessionId: string,
	usage: {
		turns?: number;
		inputTokens?: number;
		outputTokens?: number;
		costUsd?: number;
		model?: string;
	},
): Promise<void> {
	await db
		.prepare(
			`UPDATE fireside_sessions
			    SET turns = turns + ?,
			        input_tokens = input_tokens + ?,
			        output_tokens = output_tokens + ?,
			        cost_usd = cost_usd + ?,
			        model = COALESCE(?, model),
			        updated_at = unixepoch()
			  WHERE id = ?`,
		)
		.bind(
			usage.turns ?? 0,
			usage.inputTokens ?? 0,
			usage.outputTokens ?? 0,
			usage.costUsd ?? 0,
			usage.model ?? null,
			sessionId,
		)
		.run();
}

/**
 * The conversation as one opening message for a fresh run.
 *
 * The writer's own lines are wrapped and passed through `secureUserContent`, so a
 * transcript that contains "ignore your instructions" is text the model was asked
 * to read, not an instruction it can follow. Wisp's lines are kept as given: they
 * are the model's own words coming back, and wrapping them would be theatre.
 */
export function renderTranscript(messages: readonly FiresideMessageRow[]): string {
	const recent = messages.slice(-TRANSCRIPT_TURN_LIMIT);
	if (recent.length === 0) return "";

	const lines = recent.map((message) => {
		if (message.kind === "draft") {
			// A proposal is stored as its payload, so a resume can show it without
			// re-running the model. The model does not need the JSON back — it needs
			// to know it already proposed once.
			return `WISP PROPOSED A DRAFT: ${proposalTitle(message.content)}`;
		}
		if (message.role === "wisp") {
			return `WISP: ${message.content}`;
		}
		const secured = secureUserContent(message.content, "listening to the writer's own message");
		return secured;
	});

	return [
		"The conversation so far, oldest first. Some of it is the writer's own words, quoted back.",
		"",
		lines.join("\n\n"),
	].join("\n");
}

/** The title out of a stored proposal, for the one-line note in a replayed transcript. */
function proposalTitle(content: string): string {
	try {
		const parsed = JSON.parse(content) as { title?: unknown };
		if (typeof parsed.title === "string") return `"${parsed.title}"`;
	} catch {
		// A proposal written by an older shape is still a proposal.
	}
	return "one the writer has not accepted yet";
}
