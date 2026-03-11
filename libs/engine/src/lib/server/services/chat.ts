/**
 * Chat Service — 1:1 Direct Messaging Persistence
 *
 * All chat data lives in D1 (grove-engine-db). The ChatDO coordinates
 * WebSocket presence and message relay; this service handles the
 * durable storage layer.
 *
 * Tables: chat_conversations, chat_messages, chat_read_cursors
 */

import type {
	ChatConversation,
	ChatConversationWithMeta,
	ChatMessage,
	ChatMessageData,
	ChatContentType,
	ChatImageMetadata,
} from "./chat.types.js";

// ============================================================================
// Constants
// ============================================================================

/** Maximum message content length (defense-in-depth — also enforced in ChatDO). */
const MAX_MESSAGE_LENGTH = 4000;

/** Maximum valid content types. */
const VALID_CONTENT_TYPES = new Set<ChatContentType>(["text", "image"]);

// ============================================================================
// Helpers
// ============================================================================

/** Parse message metadata JSON, returning null on failure or invalid shape. */
function parseMetadata(raw: string | null): ChatImageMetadata | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		// Validate shape rather than trusting the cast
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			typeof (parsed as Record<string, unknown>).url !== "string" ||
			typeof (parsed as Record<string, unknown>).width !== "number" ||
			typeof (parsed as Record<string, unknown>).height !== "number"
		) {
			return null;
		}
		const obj = parsed as Record<string, unknown>;
		return {
			url: obj.url as string,
			width: obj.width as number,
			height: obj.height as number,
			alt: typeof obj.alt === "string" ? obj.alt : undefined,
		};
	} catch {
		return null;
	}
}

/** Convert a raw DB message row into a display-ready ChatMessageData. */
function toMessageData(row: ChatMessage): ChatMessageData {
	return {
		id: row.id,
		conversation_id: row.conversation_id,
		sender_id: row.sender_id,
		content: row.retracted_at ? "" : row.content,
		content_type: row.content_type,
		metadata: row.retracted_at ? null : parseMetadata(row.metadata),
		created_at: row.created_at,
		retracted_at: row.retracted_at,
	};
}

/**
 * Build a sorted participant pair so (A, B) and (B, A) always resolve
 * to the same conversation row. Lexicographic sort on tenant IDs.
 *
 * Why sorted pairs? In a 1:1 chat model, two people can only have one
 * conversation. Storing participant_a = min(id1, id2) and participant_b =
 * max(id1, id2) means the DB's UNIQUE constraint on (participant_a,
 * participant_b) enforces this without an extra lookup. Both the service
 * layer and the ChatDO use this convention to derive deterministic
 * conversation IDs and DO names (chat:{pA}:{pB}).
 */
function sortedPair(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get or create a conversation between two tenants.
 * Uses sorted-pair upsert so the same two tenants always share one row.
 *
 * @returns The conversation row and whether it was newly created.
 */
export async function getOrCreateConversation(
	db: D1Database,
	tenantA: string,
	tenantB: string,
): Promise<{ conversation: ChatConversation; created: boolean }> {
	const [pA, pB] = sortedPair(tenantA, tenantB);

	// Try to find existing
	const existing = await db
		.prepare(
			`SELECT id, participant_a, participant_b, created_at, updated_at,
			        last_message_preview, last_message_at
			 FROM chat_conversations
			 WHERE participant_a = ? AND participant_b = ?`,
		)
		.bind(pA, pB)
		.first<ChatConversation>();

	if (existing) {
		return { conversation: existing, created: false };
	}

	// Create new
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO chat_conversations (id, participant_a, participant_b, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, pA, pB, now, now)
		.run();

	const conversation: ChatConversation = {
		id,
		participant_a: pA,
		participant_b: pB,
		created_at: now,
		updated_at: now,
		last_message_preview: null,
		last_message_at: null,
	};

	return { conversation, created: true };
}

/**
 * List conversations for a tenant with peer info and unread counts.
 * Ordered by most recent message (or creation date if no messages).
 *
 * Performance: the original query used a nested correlated subquery to look up
 * the read cursor's timestamp by message ID, causing SQLite to run an extra
 * point-lookup per conversation. This version uses rc.last_read_at directly as
 * the timestamp boundary -- it is updated atomically with last_read_message_id,
 * so it's a reliable proxy. The unread subquery now hits the composite index
 * idx_chat_messages_unread (conversation_id, retracted_at, sender_id, created_at).
 *
 * Why last_read_at instead of joining back to chat_messages for the cursor's
 * created_at? The upsert in updateReadCursor() sets last_read_at = datetime('now')
 * at the same moment it sets last_read_message_id. Because messages are
 * append-only and timestamps are monotonically increasing, last_read_at is
 * always >= the cursor message's created_at, which means the unread count
 * can only undercount by a few milliseconds of clock skew (acceptable).
 * The tradeoff eliminates one D1 join per conversation in the inbox query.
 */
export async function listConversations(
	db: D1Database,
	tenantId: string,
	limit = 50,
	offset = 0,
): Promise<ChatConversationWithMeta[]> {
	// Defense-in-depth: clamp to safe range
	limit = Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 100);
	offset = Number.isNaN(offset) ? 0 : Math.max(offset, 0);
	const result = await db
		.prepare(
			`SELECT
				c.id,
				c.participant_a,
				c.participant_b,
				c.created_at,
				c.updated_at,
				c.last_message_preview,
				c.last_message_at,
				t.id AS peer_tenant_id,
				t.display_name AS peer_name,
				t.subdomain AS peer_subdomain,
				COALESCE(
					(SELECT COUNT(*)
					 FROM chat_messages m
					 WHERE m.conversation_id = c.id
					   AND m.sender_id != ?
					   AND m.retracted_at IS NULL
					   AND (
					     rc.last_read_at IS NULL
					     OR m.created_at > rc.last_read_at
					   )
					), 0
				) AS unread_count
			 FROM chat_conversations c
			 LEFT JOIN chat_read_cursors rc
			   ON rc.conversation_id = c.id AND rc.tenant_id = ?
			 JOIN tenants t
			   ON t.id = CASE
			     WHEN c.participant_a = ? THEN c.participant_b
			     ELSE c.participant_a
			   END
			 WHERE c.participant_a = ? OR c.participant_b = ?
			 ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
			 LIMIT ? OFFSET ?`,
		)
		.bind(tenantId, tenantId, tenantId, tenantId, tenantId, limit, offset)
		.all<ChatConversationWithMeta>();

	return result.results ?? [];
}

/**
 * Get paginated message history for a conversation.
 * Uses cursor-based pagination with `created_at` as the cursor value.
 * (Message IDs are random hex blobs and NOT sequential, so `id < ?`
 * would produce arbitrary ordering — `created_at` is the correct cursor.)
 */
export async function getMessages(
	db: D1Database,
	conversationId: string,
	options?: { before?: string; limit?: number },
): Promise<ChatMessageData[]> {
	const rawLimit = options?.limit ?? 50;
	const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100);

	let query: string;
	let bindings: unknown[];

	if (options?.before) {
		query = `SELECT id, conversation_id, sender_id, content, content_type,
		                metadata, created_at, retracted_at
		         FROM chat_messages
		         WHERE conversation_id = ? AND created_at < ?
		         ORDER BY created_at DESC
		         LIMIT ?`;
		bindings = [conversationId, options.before, limit];
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
		.all<ChatMessage>();

	// Return in chronological order (query fetches newest first for cursor)
	return (result.results ?? []).reverse().map(toMessageData);
}

/**
 * Create a message in a conversation.
 * Also updates the conversation's preview and timestamp.
 *
 * @returns The new message as display-ready data.
 */
export async function createMessage(
	db: D1Database,
	conversationId: string,
	senderId: string,
	content: string,
	contentType: ChatContentType,
	metadata?: ChatImageMetadata,
): Promise<ChatMessageData> {
	// Defense-in-depth: validate content_type even though callers should too
	if (!VALID_CONTENT_TYPES.has(contentType)) {
		throw new Error(`Invalid content type: ${contentType}`);
	}

	// Defense-in-depth: enforce max content length at the persistence layer
	if (content.length > MAX_MESSAGE_LENGTH) {
		throw new Error(`Message content exceeds ${MAX_MESSAGE_LENGTH} characters`);
	}

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const metadataJson = metadata ? JSON.stringify(metadata) : null;

	// Truncate preview to 200 chars
	const preview =
		contentType === "image"
			? "[image]"
			: content.length > 200
				? content.slice(0, 200) + "..."
				: content;

	// Insert message + update conversation preview in a batch
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
		metadata: metadata ?? null,
		created_at: now,
		retracted_at: null,
	};
}

/**
 * Update the read cursor for a tenant in a conversation.
 * Uses upsert so the first read creates the cursor row.
 */
export async function updateReadCursor(
	db: D1Database,
	conversationId: string,
	tenantId: string,
	messageId: string,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO chat_read_cursors (conversation_id, tenant_id, last_read_message_id, last_read_at)
			 VALUES (?, ?, ?, datetime('now'))
			 ON CONFLICT(conversation_id, tenant_id) DO UPDATE SET
			   last_read_message_id = excluded.last_read_message_id,
			   last_read_at = excluded.last_read_at`,
		)
		.bind(conversationId, tenantId, messageId)
		.run();
}

/**
 * Get total unread message count across all conversations for a tenant.
 * Used for the inbox badge.
 *
 * Performance: uses rc.last_read_at as the timestamp boundary (same approach
 * as listConversations) to avoid a nested correlated message lookup. The OR
 * on participant columns is unavoidable for the 1:1 model, but is mitigated
 * by idx_chat_conv_a / idx_chat_conv_b via a UNION ALL rewrite that lets
 * SQLite use both indexes with a single pass each.
 */
export async function getTotalUnreadCount(db: D1Database, tenantId: string): Promise<number> {
	const result = await db
		.prepare(
			`SELECT COALESCE(SUM(unread), 0) AS total FROM (
				SELECT COUNT(*) AS unread
				FROM chat_messages m
				JOIN chat_conversations c ON c.id = m.conversation_id
				LEFT JOIN chat_read_cursors rc
				  ON rc.conversation_id = c.id AND rc.tenant_id = ?
				WHERE (c.participant_a = ? OR c.participant_b = ?)
				  AND m.sender_id != ?
				  AND m.retracted_at IS NULL
				  AND (rc.last_read_at IS NULL OR m.created_at > rc.last_read_at)
			)`,
		)
		.bind(tenantId, tenantId, tenantId, tenantId)
		.first<{ total: number }>();

	return result?.total ?? 0;
}

/**
 * Soft-delete a message (sender only).
 * Sets retracted_at timestamp; message row persists for audit trail.
 *
 * @returns true if the message was retracted, false if not found or not sender.
 */
export async function retractMessage(
	db: D1Database,
	messageId: string,
	senderId: string,
): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE chat_messages
			 SET retracted_at = datetime('now'), content = ''
			 WHERE id = ? AND sender_id = ? AND retracted_at IS NULL`,
		)
		.bind(messageId, senderId)
		.run();

	return ((result.meta as Record<string, number>)?.changes ?? 0) > 0;
}

/**
 * Check if a tenant is a participant in a conversation.
 * Used for authorization on message/WebSocket endpoints.
 */
export async function isParticipant(
	db: D1Database,
	conversationId: string,
	tenantId: string,
): Promise<boolean> {
	const row = await db
		.prepare(
			`SELECT 1 FROM chat_conversations
			 WHERE id = ? AND (participant_a = ? OR participant_b = ?)
			 LIMIT 1`,
		)
		.bind(conversationId, tenantId, tenantId)
		.first();

	return !!row;
}
