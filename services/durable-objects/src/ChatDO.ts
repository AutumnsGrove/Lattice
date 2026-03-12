/// <reference types="@cloudflare/workers-types" />

/**
 * ChatDO — Per-Conversation Durable Object for Chirp (1:1 Direct Messaging)
 *
 * Coordinates WebSocket presence and message relay between two tenants.
 * All persistence goes to D1 (no DO-local SQLite schema needed).
 *
 * ID Pattern: chat:{min(tenantA, tenantB)}:{max(tenantA, tenantB)}
 *
 * Hibernation-aware: DM conversations are bursty, so the DO should
 * hibernate between message bursts to save resources.
 *
 * Part of the Loom pattern — Grove's coordination layer.
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
	safeJsonParse,
} from "@autumnsgrove/lattice/loom";

// ============================================================================
// Types
// ============================================================================

/** ChatDO has no local state — all data lives in D1. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ChatState {
	initialized: boolean;
}

interface ChatEnv extends Record<string, unknown> {
	DB: D1Database;
}

/**
 * Local type definitions for ChatDO (Chirp).
 *
 * Canonical source of truth: libs/engine/src/lib/server/services/chat.types.ts
 * The DO can't import from that file directly because @autumnsgrove/lattice
 * doesn't expose a subpath for chat types. These are kept in sync manually.
 * If you change the wire protocol, update BOTH files.
 */

/** Content types supported in chat messages. */
type ChatContentType = "text" | "image";

/** Image metadata stored alongside image messages. */
interface ChatImageMetadata {
	url: string;
	width: number;
	height: number;
	alt?: string;
}

/** Display-ready message as sent over WebSocket. */
interface ChatMessageData {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string;
	content_type: ChatContentType;
	metadata: ChatImageMetadata | null;
	created_at: string;
	retracted_at: string | null;
}

/** Client → Server WebSocket message union. */
interface WSClientMessage {
	type: "message" | "typing" | "read";
	conversation_id?: string;
	content?: string;
	content_type?: ChatContentType;
	metadata?: ChatImageMetadata;
	last_read_message_id?: string;
	sender_id?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum message content length. */
const MAX_MESSAGE_LENGTH = 4000;

/** Maximum message preview length in conversation list. */
const MAX_PREVIEW_LENGTH = 200;

// ============================================================================
// ChatDO Class
// ============================================================================

export class ChatDO extends LoomDO<ChatState, ChatEnv> {
	config(): LoomConfig {
		return {
			name: "ChatDO",
			hibernation: true,
			blockOnInit: false,
		};
	}

	routes(): LoomRoute[] {
		return [
			{
				method: "GET",
				path: "/ws",
				handler: (ctx) => this.handleWebSocketUpgrade(ctx),
			},
			{
				method: "POST",
				path: "/send",
				handler: (ctx) => this.handleSendMessage(ctx),
			},
			{
				method: "GET",
				path: "/history",
				handler: (ctx) => this.handleGetHistory(ctx),
			},
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Custom fetch override — WebSocket upgrade needs special handling
	// ════════════════════════════════════════════════════════════════════

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade") === "websocket") {
			const url = new URL(request.url);
			const tenantId = url.searchParams.get("tenantId");
			if (!tenantId) {
				return new Response("Missing tenantId", { status: 400 });
			}
			return this.acceptWebSocket(tenantId);
		}
		return super.fetch(request);
	}

	// ════════════════════════════════════════════════════════════════════
	// WebSocket Handling
	// ════════════════════════════════════════════════════════════════════

	/**
	 * Accept a WebSocket connection tagged with the tenant's ID.
	 * The tag lets us identify who sent messages during onWebSocketMessage.
	 *
	 * Tags: [tenantId] — used by hibernation-aware API via
	 * state.acceptWebSocket(server, tags).
	 */
	private acceptWebSocket(tenantId: string): Response {
		return this.sockets.accept(
			new Request("http://internal/ws", {
				headers: { Upgrade: "websocket" },
			}),
			[tenantId],
		);
	}

	/**
	 * Handle incoming WebSocket messages.
	 * Tenant ID is recovered from the WebSocket's hibernation tag.
	 */
	protected async onWebSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const tags = this.state.getTags(ws);
		const senderId = tags?.[0];
		if (!senderId) {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-001",
				message: "Connection not authenticated",
			});
			return;
		}

		const parsed = safeJsonParse<WSClientMessage | null>(message.toString(), null);
		if (!parsed || !parsed.type) {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-002",
				message: "Invalid message format",
			});
			return;
		}

		switch (parsed.type) {
			case "message":
				await this.handleWSMessage(ws, senderId, parsed);
				break;
			case "typing":
				this.handleWSTyping(ws, senderId, parsed);
				break;
			case "read":
				await this.handleWSRead(senderId, parsed);
				break;
			default:
				this.sendToSocket(ws, {
					type: "error",
					code: "CHAT-003",
					message: "Unknown message type",
				});
		}
	}

	protected async onWebSocketClose(): Promise<void> {
		this.log.debug("WebSocket closed", {
			remaining: this.sockets.connectionCount,
		});
	}

	// ════════════════════════════════════════════════════════════════════
	// WebSocket Message Handlers
	// ════════════════════════════════════════════════════════════════════

	private async handleWSMessage(
		ws: WebSocket,
		senderId: string,
		msg: WSClientMessage,
	): Promise<void> {
		const db = this.env.DB;
		if (!db) {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-010",
				message: "Service unavailable",
			});
			return;
		}

		const content = (msg.content ?? "").toString();
		const contentType = msg.content_type ?? "text";

		// Validate content_type is a known value (prevent arbitrary strings in DB)
		if (contentType !== "text" && contentType !== "image") {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-007",
				message: "Invalid content type",
			});
			return;
		}

		if (!content && contentType !== "image") {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-004",
				message: "Message content required",
			});
			return;
		}

		if (content.length > MAX_MESSAGE_LENGTH) {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-005",
				message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
			});
			return;
		}

		const conversationId = msg.conversation_id;
		if (!conversationId) {
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-006",
				message: "Missing conversation_id",
			});
			return;
		}

		try {
			const messageData = await this.persistMessage(
				db,
				conversationId,
				senderId,
				content,
				contentType,
				msg.metadata ?? null,
			);

			// Acknowledge to sender
			this.sendToSocket(ws, {
				type: "message:ack",
				message_id: messageData.id,
				created_at: messageData.created_at,
			});

			// Broadcast to other participant(s)
			this.sockets.broadcast({ type: "message", message: messageData }, ws);

			// TODO: Thorn content moderation (fire-and-forget)
			// The DO can't import moderatePublishedContent() from the engine
			// because @autumnsgrove/lattice/thorn isn't exported as a DO-safe
			// subpath. Two options:
			//   1. Emit to a MODERATION_QUEUE and let a consumer call Thorn
			//   2. Add a thorn subpath export and wire AI binding to the DO
			// For now, text moderation runs via the API route layer where
			// platform.context.waitUntil() is available.
		} catch (err) {
			this.log.errorWithCause("Failed to persist message", err);
			this.sendToSocket(ws, {
				type: "error",
				code: "CHAT-011",
				message: "Failed to send message",
			});
		}
	}

	private handleWSTyping(ws: WebSocket, senderId: string, msg: WSClientMessage): void {
		// Only broadcast if conversation_id is present (don't relay empty strings)
		if (!msg.conversation_id) return;

		this.sockets.broadcast(
			{
				type: "typing",
				conversation_id: msg.conversation_id,
				sender_id: senderId,
			},
			ws,
		);
	}

	/**
	 * Handle a read receipt from a WebSocket client.
	 *
	 * Read events are the hottest path in chat (every scroll, every focus).
	 * The original implementation did two D1 queries: one to verify the message
	 * exists in this conversation, and a second to upsert the cursor. This
	 * version merges both into a single INSERT...SELECT that only inserts
	 * if the message actually belongs to the conversation. Zero changes in
	 * the result means the message wasn't found, so nothing gets broadcast.
	 */
	private async handleWSRead(senderId: string, msg: WSClientMessage): Promise<void> {
		const db = this.env.DB;
		if (!db || !msg.conversation_id || !msg.last_read_message_id) return;

		// Length-limit message ID to prevent abuse (UUIDs are 36 chars)
		if (msg.last_read_message_id.length > 64) return;
		try {
			const result = await db
				.prepare(
					`INSERT INTO chat_read_cursors (conversation_id, tenant_id, last_read_message_id, last_read_at)
					 SELECT ?, ?, id, datetime('now')
					 FROM chat_messages
					 WHERE id = ? AND conversation_id = ?
					 ON CONFLICT(conversation_id, tenant_id) DO UPDATE SET
					   last_read_message_id = excluded.last_read_message_id,
					   last_read_at = excluded.last_read_at`,
				)
				.bind(msg.conversation_id, senderId, msg.last_read_message_id, msg.conversation_id)
				.run();

			// Zero changes means the message wasn't found in this conversation
			const changes = (result.meta as Record<string, number>)?.changes ?? 0;
			if (changes === 0) return;

			this.sockets.broadcast({
				type: "read",
				conversation_id: msg.conversation_id,
				tenant_id: senderId,
				last_read_message_id: msg.last_read_message_id,
			});
		} catch (err) {
			this.log.errorWithCause("Failed to update read cursor", err);
		}
	}

	// ════════════════════════════════════════════════════════════════════
	// REST Route Handlers (fallback for non-WebSocket clients)
	// ════════════════════════════════════════════════════════════════════

	private async handleWebSocketUpgrade(ctx: LoomRequestContext): Promise<Response> {
		const tenantId = ctx.query.get("tenantId");
		if (!tenantId) {
			return Response.json({ error: "Missing tenantId" }, { status: 400 });
		}
		return this.acceptWebSocket(tenantId);
	}

	/**
	 * REST send handler -- called by the SvelteKit API route via waitUntil().
	 *
	 * Two modes:
	 *   1. alreadyPersisted=true: The API route already wrote to D1.
	 *      The DO only broadcasts to connected WebSocket clients. This is
	 *      the normal path for messages sent via POST /api/chat/.../messages.
	 *   2. alreadyPersisted=false: The DO persists AND broadcasts.
	 *      This path exists for direct DO callers (future internal services).
	 *
	 * The split exists because the API route needs to run Thorn moderation
	 * (which requires platform.context.waitUntil and the AI binding), but
	 * the DO needs to broadcast to WebSocket clients (which requires the DO
	 * instance). Neither layer can do both, so they cooperate.
	 */
	private async handleSendMessage(ctx: LoomRequestContext): Promise<Response> {
		const db = this.env.DB;
		if (!db) {
			return Response.json({ error: "Service unavailable" }, { status: 503 });
		}

		// senderId MUST come from a trusted source (the API route layer that
		// already authenticated the user). The DO itself does not re-authenticate,
		// but it validates that the claimed senderId is one of the two participants
		// in this conversation. Without this, any caller who reaches the DO could
		// impersonate any user.
		//
		// alreadyPersisted: when true the message was already written to D1 by the
		// API route (createMessage()). The DO must only broadcast -- not persist again.
		// Ignoring this flag caused duplicate message rows on every REST-path send.
		const body = safeJsonParse<{
			conversationId: string;
			senderId: string;
			content: string;
			contentType?: ChatContentType;
			metadata?: ChatImageMetadata;
			alreadyPersisted?: boolean;
			messageId?: string;
			createdAt?: string;
		} | null>(await ctx.request.text(), null);

		if (!body || !body.conversationId || !body.senderId) {
			return Response.json({ error: "Invalid request body" }, { status: 400 });
		}

		// Fast path: message already persisted by the API route — broadcast only.
		// The messageId and createdAt passed here are the canonical D1-assigned values.
		if (body.alreadyPersisted) {
			if (!body.messageId) {
				return Response.json(
					{ error: "Missing messageId for alreadyPersisted broadcast" },
					{ status: 400 },
				);
			}

			const content = (body.content ?? "").toString();
			const contentType = body.contentType ?? "text";

			const messageData: ChatMessageData = {
				id: body.messageId,
				conversation_id: body.conversationId,
				sender_id: body.senderId,
				content,
				content_type: contentType,
				metadata: body.metadata ?? null,
				created_at: body.createdAt ?? new Date().toISOString(),
				retracted_at: null,
			};

			this.sockets.broadcast({ type: "message", message: messageData });
			return Response.json({ success: true, message: messageData });
		}

		const content = (body.content ?? "").toString();
		const contentType = body.contentType ?? "text";

		// Validate content_type is a known value
		if (contentType !== "text" && contentType !== "image") {
			return Response.json({ error: "Invalid content type" }, { status: 400 });
		}

		if (!content && contentType !== "image") {
			return Response.json({ error: "Message content required" }, { status: 400 });
		}

		if (content.length > MAX_MESSAGE_LENGTH) {
			return Response.json(
				{ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
				{ status: 400 },
			);
		}

		// Verify senderId is a participant in this conversation (authz check)
		try {
			const conv = await db
				.prepare(
					`SELECT participant_a, participant_b FROM chat_conversations
					 WHERE id = ? AND (participant_a = ? OR participant_b = ?)
					 LIMIT 1`,
				)
				.bind(body.conversationId, body.senderId, body.senderId)
				.first<{ participant_a: string; participant_b: string }>();

			if (!conv) {
				return Response.json({ error: "Forbidden" }, { status: 403 });
			}
		} catch (err) {
			this.log.errorWithCause("Participant check failed", err);
			return Response.json({ error: "Authorization check failed" }, { status: 500 });
		}

		try {
			const messageData = await this.persistMessage(
				db,
				body.conversationId,
				body.senderId,
				content,
				contentType,
				body.metadata ?? null,
			);

			// Broadcast to connected WebSocket clients
			this.sockets.broadcast({ type: "message", message: messageData });

			return Response.json({ success: true, message: messageData });
		} catch (err) {
			this.log.errorWithCause("REST send failed", err);
			return Response.json({ error: "Failed to send message" }, { status: 500 });
		}
	}

	private async handleGetHistory(ctx: LoomRequestContext): Promise<Response> {
		const db = this.env.DB;
		if (!db) {
			return Response.json({ error: "Service unavailable" }, { status: 503 });
		}

		const conversationId = ctx.query.get("conversationId");
		if (!conversationId) {
			return Response.json({ error: "Missing conversationId" }, { status: 400 });
		}

		// Authorization: verify the requesting tenant is a participant
		const tenantId = ctx.query.get("tenantId");
		if (!tenantId) {
			return Response.json({ error: "Missing tenantId" }, { status: 400 });
		}

		try {
			const conv = await db
				.prepare(
					`SELECT 1 FROM chat_conversations
					 WHERE id = ? AND (participant_a = ? OR participant_b = ?)
					 LIMIT 1`,
				)
				.bind(conversationId, tenantId, tenantId)
				.first();

			if (!conv) {
				return Response.json({ error: "Forbidden" }, { status: 403 });
			}
		} catch (err) {
			this.log.errorWithCause("Participant check failed", err);
			return Response.json({ error: "Authorization check failed" }, { status: 500 });
		}

		const before = ctx.query.get("before") ?? undefined;
		const limitParam = ctx.query.get("limit");
		const rawLimit = limitParam ? parseInt(limitParam, 10) : 50;
		const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);

		try {
			let query: string;
			let bindings: unknown[];

			if (before) {
				// Cursor is a created_at ISO timestamp, not a message ID.
				// Message IDs are random hex blobs (not sequential).
				query = `SELECT id, conversation_id, sender_id, content, content_type,
				                metadata, created_at, retracted_at
				         FROM chat_messages
				         WHERE conversation_id = ? AND created_at < ?
				         ORDER BY created_at DESC
				         LIMIT ?`;
				bindings = [conversationId, before, limit];
			} else {
				query = `SELECT id, conversation_id, sender_id, content, content_type,
				                metadata, created_at, retracted_at
				         FROM chat_messages
				         WHERE conversation_id = ?
				         ORDER BY created_at DESC
				         LIMIT ?`;
				bindings = [conversationId, limit];
			}

			const result = await db
				.prepare(query)
				.bind(...bindings)
				.all<{
					id: string;
					conversation_id: string;
					sender_id: string;
					content: string;
					content_type: ChatContentType;
					metadata: string | null;
					created_at: string;
					retracted_at: string | null;
				}>();

			const messages = (result.results ?? []).reverse().map((row) => this.toMessageData(row));

			return Response.json({ messages });
		} catch (err) {
			this.log.errorWithCause("History fetch failed", err);
			return Response.json({ error: "Failed to fetch history" }, { status: 500 });
		}
	}

	// ════════════════════════════════════════════════════════════════════
	// D1 Persistence Helpers
	// ════════════════════════════════════════════════════════════════════

	/**
	 * Persist a message to D1 and update conversation preview.
	 */
	private async persistMessage(
		db: D1Database,
		conversationId: string,
		senderId: string,
		content: string,
		contentType: ChatContentType,
		metadata: ChatImageMetadata | null,
	): Promise<ChatMessageData> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const metadataJson = metadata ? JSON.stringify(metadata) : null;

		const preview =
			contentType === "image"
				? "[image]"
				: content.length > MAX_PREVIEW_LENGTH
					? content.slice(0, MAX_PREVIEW_LENGTH) + "..."
					: content;

		const batch = [
			db
				.prepare(
					`INSERT INTO chat_messages (id, conversation_id, sender_id, content, content_type, metadata, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(id, conversationId, senderId, content, contentType, metadataJson, now),
			db
				.prepare(
					`UPDATE chat_conversations
					 SET last_message_preview = ?, last_message_at = ?, updated_at = ?
					 WHERE id = ?`,
				)
				.bind(preview, now, now, conversationId),
		];

		await db.batch(batch);

		return {
			id,
			conversation_id: conversationId,
			sender_id: senderId,
			content,
			content_type: contentType,
			metadata,
			created_at: now,
			retracted_at: null,
		};
	}

	/**
	 * Convert a raw DB row into display-ready ChatMessageData.
	 */
	private toMessageData(row: {
		id: string;
		conversation_id: string;
		sender_id: string;
		content: string;
		content_type: ChatContentType;
		metadata: string | null;
		created_at: string;
		retracted_at: string | null;
	}): ChatMessageData {
		let parsedMetadata: ChatImageMetadata | null = null;
		if (row.metadata && !row.retracted_at) {
			parsedMetadata = safeJsonParse<ChatImageMetadata | null>(row.metadata, null);
		}

		return {
			id: row.id,
			conversation_id: row.conversation_id,
			sender_id: row.sender_id,
			content: row.retracted_at ? "" : row.content,
			content_type: row.content_type,
			metadata: parsedMetadata,
			created_at: row.created_at,
			retracted_at: row.retracted_at,
		};
	}

	// ════════════════════════════════════════════════════════════════════
	// Private Helpers
	// ════════════════════════════════════════════════════════════════════

	private sendToSocket(ws: WebSocket, data: Record<string, unknown>): void {
		try {
			ws.send(JSON.stringify(data));
		} catch {
			// Connection may have closed
		}
	}
}
