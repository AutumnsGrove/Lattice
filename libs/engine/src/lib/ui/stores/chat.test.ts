/**
 * Tests for chatStore.
 *
 * TODO: Test implementations deferred — requires fetch mocking setup.
 * Coverage targets:
 * - load() fetches and populates conversations
 * - refreshUnread() updates totalUnread
 * - moveToTop() reorders correctly
 * - updatePreview() updates last message
 * - decrementUnread() and markConversationRead()
 * - addConversation() prepends and recalculates unread
 */

import { describe, it } from "vitest";

describe("chatStore", () => {
	it.todo("starts with empty conversations and zero unread");
	it.todo("load() fetches conversations from API");
	it.todo("refreshUnread() fetches total unread count");
	it.todo("moveToTop() moves conversation to index 0");
	it.todo("updatePreview() updates lastMessage and lastActivityAt");
	it.todo("setActive() sets activeConversationId");
	it.todo("addConversation() prepends to list");
	it.todo("decrementUnread() reduces count and recalculates total");
	it.todo("markConversationRead() zeros out unread for conversation");
});
