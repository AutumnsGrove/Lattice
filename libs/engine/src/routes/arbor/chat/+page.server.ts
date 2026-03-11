import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatConversationWithMeta } from "$lib/server/services/chat.types.js";

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	if (!locals.user) {
		redirect(302, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Fetch conversations and friend profiles in parallel.
	// unreadCount is derived from conversations[].unread_count — no separate
	// /api/chat/unread call needed, saving one D1 query per page load.
	const [conversationsRes, friendsRes] = await Promise.all([
		fetch("/api/chat/conversations").catch(() => null),
		fetch("/api/chat/friends").catch(() => null),
	]);

	const conversations: ChatConversationWithMeta[] = conversationsRes?.ok
		? (((await conversationsRes.json()) as { conversations: ChatConversationWithMeta[] })
				.conversations ?? [])
		: [];

	const friends = friendsRes?.ok
		? (((await friendsRes.json()) as { friends: unknown[] }).friends ?? [])
		: [];

	// Derive total unread count from the conversation list — already computed
	// by listConversations() in a single query, no extra round-trip needed.
	const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

	// Active conversation from URL params
	const activeConversationId = url.searchParams.get("conv") ?? null;

	return {
		conversations,
		friends,
		activeConversationId,
		unreadCount,
	};
};
