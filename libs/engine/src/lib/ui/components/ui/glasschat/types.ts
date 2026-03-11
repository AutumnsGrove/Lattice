/**
 * GlassChat Types
 *
 * Types for the GlassChat reusable chat interface component.
 * Consumers define a ChatRoleMap to control how each role is rendered —
 * the component doesn't know or care about the domain.
 */

/** Message delivery status for conversational (non-AI) chats. */
export type ChatMessageStatus = "sending" | "sent" | "delivered" | "read";

/** Sender identity for multi-participant chats. */
export interface ChatSender {
	/** Unique user identifier */
	id: string;
	/** Display name */
	name: string;
	/** Optional avatar URL */
	avatar?: string;
}

/** A single chat message. */
export interface ChatMessageData {
	/** Unique identifier (e.g., crypto.randomUUID()) */
	id: string;
	/** Consumer-defined role (e.g., "wisp", "user", "reverie", "support") */
	role: string;
	/** Message text content */
	content: string;
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Consumer-specific extras (e.g., Reverie change previews, Porch attachments) */
	metadata?: Record<string, unknown>;
	/** Delivery status — used by conversational controllers for send/deliver/read tracking */
	status?: ChatMessageStatus;
	/** Sender identity — used by conversational controllers for multi-user chats */
	sender?: ChatSender;
}

/** Rendering configuration for a single chat role. */
export interface ChatRoleConfig {
	/** Display name shown above the message bubble ("Wisp", "You", "Reverie") */
	label: string;
	/** Flex alignment: "start" = left, "end" = right */
	align: "start" | "end";
	/** Extra Tailwind classes for the message bubble */
	bubbleClass?: string;
	/** Extra Tailwind classes for the role label */
	labelClass?: string;
}

/** Maps role strings to their rendering configuration. */
export type ChatRoleMap = Record<string, ChatRoleConfig>;

/** Fallback config for unknown roles. */
export const DEFAULT_ROLE_CONFIG: ChatRoleConfig = {
	label: "Unknown",
	align: "start",
};
