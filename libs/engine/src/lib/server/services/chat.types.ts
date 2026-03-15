/**
 * Chirp Types — 1:1 Direct Messaging
 *
 * Source of truth for the chat domain's database row shapes,
 * domain models, and WebSocket wire protocol.
 *
 * No runtime dependencies — safe to import from both server
 * and Durable Object contexts.
 *
 * WebSocket protocol types and shared UI types are defined in
 * `$lib/types/chat` and re-exported here for backward compatibility.
 */

import type { ChatContentType } from "$lib/types/chat";

// ── Re-export shared types from the UI-safe location ────────────────────────
export type {
	ChatContentType,
	ChatImageMetadata,
	ChatMessageData,
	ChatConversationWithMeta,
	ChatWSClientSendMessage,
	ChatWSClientTyping,
	ChatWSClientRead,
	ChatWSClientMessage,
	ChatWSServerIncomingMessage,
	ChatWSServerMessageAck,
	ChatWSServerTyping,
	ChatWSServerRead,
	ChatWSServerError,
	ChatWSServerMessage,
} from "$lib/types/chat";

// ============================================================================
// Database row types (server-only)
// ============================================================================

/** Raw DB row from chat_conversations. */
export interface ChatConversationRow {
	id: string;
	participant_a: string;
	participant_b: string;
	created_at: string;
	updated_at: string;
	last_message_preview: string | null;
	last_message_at: string | null;
}

/** Raw DB row from chat_messages. */
export interface ChatMessageRow {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string;
	content_type: ChatContentType;
	metadata: string | null; // JSON-encoded ChatImageMetadata
	created_at: string;
	retracted_at: string | null;
}

/** Raw DB row from chat_read_cursors. */
export interface ChatReadCursorRow {
	conversation_id: string;
	tenant_id: string;
	last_read_message_id: string | null;
	last_read_at: string;
}

// ============================================================================
// Domain types (application layer, server-only)
// ============================================================================

/** Single conversation, as returned by the DB. */
export type ChatConversation = ChatConversationRow;

/** Single message, as returned by the DB. */
export type ChatMessage = ChatMessageRow;

/** Read cursor, as returned by the DB. */
export type ChatReadCursor = ChatReadCursorRow;
