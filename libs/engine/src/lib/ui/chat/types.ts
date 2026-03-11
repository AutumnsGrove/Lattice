/**
 * Chirp Client-Side Types
 *
 * Re-exports WS protocol types from the shared chat.types.ts (source of truth),
 * and adds client-only view types for the conversation list and friend profiles.
 *
 * The shared types file at $lib/server/services/chat.types.ts has zero runtime
 * deps, so importing it from client code is safe.
 */

// ── Re-export WS protocol types from the canonical source of truth ──────
export type {
	ChatWSClientMessage,
	ChatWSServerMessage,
	ChatWSClientSendMessage,
	ChatWSClientTyping,
	ChatWSClientRead,
	ChatWSServerIncomingMessage,
	ChatWSServerMessageAck,
	ChatWSServerTyping,
	ChatWSServerRead,
	ChatWSServerError,
	ChatMessageData as ChatMessageWireData,
	ChatContentType,
	ChatImageMetadata,
} from "$lib/server/services/chat.types.js";

// ── Conversation Types ───────────────────────────────────────────────────

export interface ConversationPreview {
	id: string;
	/** The friend's tenant ID (other participant) */
	friendTenantId: string;
	/** Last message preview text (truncated) */
	lastMessage: string | null;
	/** ISO 8601 timestamp of last activity */
	lastActivityAt: string;
	/** Number of unread messages */
	unreadCount: number;
}

export interface ChatFriendProfile {
	tenantId: string;
	displayName: string;
	subdomain: string;
	avatarUrl: string | null;
}
