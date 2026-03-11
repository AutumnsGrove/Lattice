/**
 * Chirp Types — 1:1 Direct Messaging
 *
 * Source of truth for the chat domain's database row shapes,
 * domain models, and WebSocket wire protocol.
 *
 * No runtime dependencies — safe to import from both server
 * and Durable Object contexts.
 */

// ============================================================================
// Content types
// ============================================================================

/** Supported message content types. */
export type ChatContentType = "text" | "image";

/** Metadata stored in chat_messages.metadata for image messages. */
export interface ChatImageMetadata {
	url: string;
	width: number;
	height: number;
	alt?: string;
}

// ============================================================================
// Database row types
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
// Domain types (application layer)
// ============================================================================

/** Single conversation, as returned by the DB. */
export type ChatConversation = ChatConversationRow;

/** Single message, as returned by the DB. */
export type ChatMessage = ChatMessageRow;

/** Read cursor, as returned by the DB. */
export type ChatReadCursor = ChatReadCursorRow;

/**
 * Conversation enriched with unread count and peer identity,
 * used to render the conversation list / inbox view.
 */
export interface ChatConversationWithMeta {
	id: string;
	participant_a: string;
	participant_b: string;
	created_at: string;
	updated_at: string;
	last_message_preview: string | null;
	last_message_at: string | null;
	/** Number of messages sent after the viewer's last_read_message_id. */
	unread_count: number;
	/** The other participant's tenant ID (not the viewer's own). */
	peer_tenant_id: string;
	/** Display name of the peer tenant. */
	peer_name: string;
	/** Subdomain of the peer tenant, used for linking. */
	peer_subdomain: string;
}

/**
 * Message ready to send over WebSocket or return from the REST API.
 * Metadata is parsed from JSON so consumers don't have to.
 */
export interface ChatMessageData {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string;
	content_type: ChatContentType;
	metadata: ChatImageMetadata | null;
	created_at: string;
	retracted_at: string | null;
}

// ============================================================================
// WebSocket protocol — client → server
// ============================================================================

/** Client sends a new chat message. */
export interface ChatWSClientSendMessage {
	type: "message";
	conversation_id: string;
	content: string;
	content_type: ChatContentType;
	/** Required when content_type is 'image'. */
	metadata?: ChatImageMetadata;
}

/** Client broadcasts a typing indicator. */
export interface ChatWSClientTyping {
	type: "typing";
	conversation_id: string;
}

/** Client marks a conversation as read up to a message. */
export interface ChatWSClientRead {
	type: "read";
	conversation_id: string;
	last_read_message_id: string;
}

/** Union of all messages the client may send to the server. */
export type ChatWSClientMessage = ChatWSClientSendMessage | ChatWSClientTyping | ChatWSClientRead;

// ============================================================================
// WebSocket protocol — server → client
// ============================================================================

/** Server broadcasts a new message to conversation participants. */
export interface ChatWSServerIncomingMessage {
	type: "message";
	message: ChatMessageData;
}

/** Server confirms the sender's message was persisted. */
export interface ChatWSServerMessageAck {
	type: "message:ack";
	/** The client-side ID echoed back (if provided), or the server-assigned ID. */
	message_id: string;
	created_at: string;
}

/** Server relays a typing indicator to the other participant. */
export interface ChatWSServerTyping {
	type: "typing";
	conversation_id: string;
	/** The tenant ID of the participant who is typing. */
	sender_id: string;
}

/** Server confirms a read cursor update was applied. */
export interface ChatWSServerRead {
	type: "read";
	conversation_id: string;
	tenant_id: string;
	last_read_message_id: string;
}

/** Server-sent error frame. */
export interface ChatWSServerError {
	type: "error";
	code: string;
	message: string;
}

/** Union of all messages the server may send to a client. */
export type ChatWSServerMessage =
	| ChatWSServerIncomingMessage
	| ChatWSServerMessageAck
	| ChatWSServerTyping
	| ChatWSServerRead
	| ChatWSServerError;
