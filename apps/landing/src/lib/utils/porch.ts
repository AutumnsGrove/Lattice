/**
 * Porch utilities for GlassChat integration.
 *
 * Transforms Porch DB message shape into ChatMessageData[]
 * and provides role configs for visitor and admin views.
 */

import type { ChatMessageData, ChatRoleMap } from "@autumnsgrove/lattice/ui";

/** Shape of messages returned from the Porch DB queries. */
interface PorchMessage {
	id: string;
	sender_type: string;
	sender_name: string | null;
	content: string;
	/** Unix timestamp (seconds) */
	created_at: number;
}

/** Convert Porch DB messages to GlassChat ChatMessageData[]. */
export function toChatMessages(messages: PorchMessage[]): ChatMessageData[] {
	return messages.map((m) => ({
		id: m.id,
		role: m.sender_type,
		content: m.content,
		timestamp: new Date(m.created_at * 1000).toISOString(),
		metadata: m.sender_name ? { senderName: m.sender_name } : undefined,
	}));
}

/** Visitor view: autumn on the left (grove-tinted), visitor on the right. */
export const PORCH_VISITOR_ROLES: ChatRoleMap = {
	autumn: {
		label: "Autumn",
		align: "start",
		bubbleClass:
			"bg-grove-50/80 border border-grove-200 dark:bg-grove-900/20 dark:border-grove-800",
		labelClass: "text-grove-700 dark:text-grove-300",
	},
	visitor: {
		label: "You",
		align: "end",
		bubbleClass: "bg-white/80 border border-grove-100 dark:bg-cream-200/50",
		labelClass: "text-foreground-muted",
	},
};

/** Admin view: autumn on the right ("you"), visitor on the left. */
export const PORCH_ADMIN_ROLES: ChatRoleMap = {
	autumn: {
		label: "Autumn (you)",
		align: "end",
		bubbleClass: "bg-grove-50/80 border border-grove-200",
		labelClass: "text-grove-700",
	},
	visitor: {
		label: "Visitor",
		align: "start",
		bubbleClass: "bg-white/80 border border-grove-100",
		labelClass: "text-foreground-muted",
	},
};
