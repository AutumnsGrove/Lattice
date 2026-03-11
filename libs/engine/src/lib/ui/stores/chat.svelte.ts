/**
 * Chat store — client-side state for conversation list and unread counts.
 *
 * Follows the friends.svelte.ts pattern: module-level $state variables,
 * exported as a plain object with getters and methods.
 */

import type { ConversationPreview } from "$lib/ui/chat/types";
import type { ChatConversationWithMeta } from "$lib/server/services/chat.types.js";
import { api } from "$lib/utils/api";

let conversations = $state<ConversationPreview[]>([]);
let totalUnread = $state(0);
let activeConversationId = $state<string | null>(null);
let loading = $state(false);
let loaded = $state(false);

function recomputeUnread() {
	totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Map the API's ChatConversationWithMeta (snake_case) to the client's ConversationPreview. */
function toPreview(row: ChatConversationWithMeta): ConversationPreview {
	return {
		id: row.id,
		friendTenantId: row.peer_tenant_id,
		lastMessage: row.last_message_preview,
		lastActivityAt: row.last_message_at ?? row.updated_at,
		unreadCount: row.unread_count,
	};
}

export const chatStore = {
	get conversations() {
		return conversations;
	},

	get totalUnread() {
		return totalUnread;
	},

	get activeConversationId() {
		return activeConversationId;
	},

	get loading() {
		return loading;
	},

	get loaded() {
		return loaded;
	},

	/** Fetch conversations list from the API. */
	async load() {
		loading = true;
		try {
			const result = await api.get<{ conversations: ChatConversationWithMeta[] }>(
				"/api/chat/conversations",
			);
			conversations = (result?.conversations ?? []).map(toPreview);
			recomputeUnread();
			loaded = true;
		} catch {
			// Non-critical — leave existing state
		} finally {
			loading = false;
		}
	},

	/** Refresh only the unread count (lightweight polling). */
	async refreshUnread() {
		try {
			const result = await api.get<{ unread: number }>("/api/chat/unread");
			totalUnread = result?.unread ?? 0;
		} catch {
			// Non-critical
		}
	},

	/** Move a conversation to the top of the list (after new activity). */
	moveToTop(conversationId: string) {
		const idx = conversations.findIndex((c) => c.id === conversationId);
		if (idx <= 0) return; // already at top or not found
		// Splice in-place to avoid creating a new array reference
		const [conv] = conversations.splice(idx, 1);
		conversations.unshift(conv);
	},

	/**
	 * Update the last message preview for a conversation and move it to the top.
	 * Combined into one operation to avoid two separate array traversals when a
	 * new message arrives (the common hot path from handleWSMessage).
	 */
	updatePreview(conversationId: string, preview: string, timestamp: string) {
		const idx = conversations.findIndex((c) => c.id === conversationId);
		if (idx === -1) return;
		// Mutate the item directly — Svelte 5 $state tracks deep mutations
		conversations[idx].lastMessage = preview;
		conversations[idx].lastActivityAt = timestamp;
	},

	/** Set the currently active conversation. */
	setActive(conversationId: string | null) {
		activeConversationId = conversationId;
	},

	/** Add a new conversation to the list (prepends). */
	addConversation(conv: ConversationPreview) {
		conversations = [conv, ...conversations];
		recomputeUnread();
	},

	/** Decrement unread count for a conversation (when messages are read). */
	decrementUnread(conversationId: string) {
		const conv = conversations.find((c) => c.id === conversationId);
		if (!conv) return;
		conv.unreadCount = Math.max(0, conv.unreadCount - 1);
		recomputeUnread();
	},

	/** Mark all messages in a conversation as read (zero out unread). */
	markConversationRead(conversationId: string) {
		const conv = conversations.find((c) => c.id === conversationId);
		if (!conv || conv.unreadCount === 0) return;
		conv.unreadCount = 0;
		recomputeUnread();
	},
};
