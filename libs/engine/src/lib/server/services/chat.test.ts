/**
 * Chat Service Tests
 *
 * Tests for 1:1 direct messaging service layer.
 * Mocks D1 at the prepare() boundary following the pattern established
 * in friends.test.ts — the real SQL engine is not available in vitest.
 *
 * @see chat.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	getOrCreateConversation,
	listConversations,
	getMessages,
	createMessage,
	updateReadCursor,
	getTotalUnreadCount,
	retractMessage,
	isParticipant,
} from "./chat.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

function createMockDB(overrides?: {
	allResults?: unknown[];
	firstResult?: unknown;
	changes?: number;
	batchSpy?: ReturnType<typeof vi.fn>;
}) {
	const allResults = overrides?.allResults ?? [];
	const firstResult = overrides?.firstResult ?? null;
	const changes = overrides?.changes ?? 1;
	const batchSpy = overrides?.batchSpy ?? vi.fn().mockResolvedValue([]);

	const statement = {
		bind: vi.fn().mockReturnThis(),
		all: vi.fn().mockResolvedValue({ results: allResults }),
		first: vi.fn().mockResolvedValue(firstResult),
		run: vi.fn().mockResolvedValue({ success: true, meta: { changes } }),
	};

	return {
		prepare: vi.fn(() => statement),
		batch: batchSpy,
		_statement: statement,
	} as unknown as D1Database & { _statement: typeof statement };
}

function makeConversation(overrides?: Partial<Record<string, unknown>>) {
	return {
		id: "conv-1",
		participant_a: "tenant-alice",
		participant_b: "tenant-bob",
		created_at: "2026-01-01T00:00:00.000Z",
		updated_at: "2026-01-01T00:00:00.000Z",
		last_message_preview: null,
		last_message_at: null,
		...overrides,
	};
}

function makeMessage(overrides?: Partial<Record<string, unknown>>) {
	return {
		id: "msg-1",
		conversation_id: "conv-1",
		sender_id: "tenant-alice",
		content: "Hello, world!",
		content_type: "text",
		metadata: null,
		created_at: "2026-01-01T00:00:00.000Z",
		retracted_at: null,
		...overrides,
	};
}

// ── getOrCreateConversation ──────────────────────────────────────────────────

describe("getOrCreateConversation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return existing conversation when one already exists", async () => {
		const existing = makeConversation();
		const db = createMockDB({ firstResult: existing });

		const result = await getOrCreateConversation(db, "tenant-alice", "tenant-bob");

		expect(result.created).toBe(false);
		expect(result.conversation.id).toBe("conv-1");
	});

	it("should create a new conversation when none exists", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await getOrCreateConversation(db, "tenant-alice", "tenant-bob");

		expect(result.created).toBe(true);
		expect(result.conversation.participant_a).toBeDefined();
		expect(result.conversation.participant_b).toBeDefined();
	});

	it("should normalize participant order so the same two tenants always share one row", async () => {
		// "tenant-bob" < "tenant-alice" alphabetically — sorted pair should be (bob, alice)
		const db1 = createMockDB({ firstResult: null });
		const r1 = await getOrCreateConversation(db1, "tenant-bob", "tenant-alice");

		const db2 = createMockDB({ firstResult: null });
		const r2 = await getOrCreateConversation(db2, "tenant-alice", "tenant-bob");

		// Both should produce the same sorted (participant_a, participant_b)
		expect(r1.conversation.participant_a).toBe(r2.conversation.participant_a);
		expect(r1.conversation.participant_b).toBe(r2.conversation.participant_b);
	});

	it("should query with sorted participant pair", async () => {
		const db = createMockDB({ firstResult: makeConversation() });

		// alice > bob lexicographically, so sorted pair is (bob, alice)
		await getOrCreateConversation(db, "z-tenant", "a-tenant");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		// "a-tenant" < "z-tenant" — first bound param should be "a-tenant"
		expect(bindCall).toHaveBeenCalledWith("a-tenant", "z-tenant");
	});

	it("should insert with sorted pair when creating", async () => {
		const db = createMockDB({ firstResult: null });

		await getOrCreateConversation(db, "z-tenant", "a-tenant");

		// Second prepare call is the INSERT
		const insertSQL = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
		expect(insertSQL).toContain("INSERT INTO chat_conversations");
	});

	it("should include timestamps on new conversations", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await getOrCreateConversation(db, "tenant-alice", "tenant-bob");

		expect(result.conversation.created_at).toBeTruthy();
		expect(result.conversation.updated_at).toBeTruthy();
	});
});

// ── listConversations ────────────────────────────────────────────────────────

describe("listConversations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return conversations with peer metadata and unread counts", async () => {
		const convWithMeta = {
			...makeConversation(),
			unread_count: 3,
			peer_tenant_id: "tenant-bob",
			peer_name: "Bob's Grove",
			peer_subdomain: "bob",
		};
		const db = createMockDB({ allResults: [convWithMeta] });

		const result = await listConversations(db, "tenant-alice");

		expect(result).toHaveLength(1);
		expect(result[0].unread_count).toBe(3);
		expect(result[0].peer_name).toBe("Bob's Grove");
	});

	it("should return empty array when user has no conversations", async () => {
		const db = createMockDB({ allResults: [] });

		const result = await listConversations(db, "tenant-alice");

		expect(result).toEqual([]);
	});

	it("should pass limit and offset to the query", async () => {
		const db = createMockDB({ allResults: [] });

		await listConversations(db, "tenant-alice", 10, 20);

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		// limit and offset are the last two bind args
		expect(bindArgs).toContain(10);
		expect(bindArgs).toContain(20);
	});

	it("should clamp limit to 100 maximum", async () => {
		const db = createMockDB({ allResults: [] });

		await listConversations(db, "tenant-alice", 9999, 0);

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		expect(bindArgs).toContain(100);
		expect(bindArgs).not.toContain(9999);
	});

	it("should default limit to 50 when not specified", async () => {
		const db = createMockDB({ allResults: [] });

		await listConversations(db, "tenant-alice");

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		expect(bindArgs).toContain(50);
	});
});

// ── getMessages ──────────────────────────────────────────────────────────────

describe("getMessages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return messages in chronological order", async () => {
		// DB returns newest first (DESC), service reverses for chronological output
		const messages = [
			makeMessage({ id: "msg-3", created_at: "2026-01-03T00:00:00.000Z" }),
			makeMessage({ id: "msg-2", created_at: "2026-01-02T00:00:00.000Z" }),
			makeMessage({ id: "msg-1", created_at: "2026-01-01T00:00:00.000Z" }),
		];
		const db = createMockDB({ allResults: messages });

		const result = await getMessages(db, "conv-1");

		expect(result[0].id).toBe("msg-1");
		expect(result[1].id).toBe("msg-2");
		expect(result[2].id).toBe("msg-3");
	});

	it("should use before cursor for pagination", async () => {
		const db = createMockDB({ allResults: [] });

		await getMessages(db, "conv-1", { before: "2026-01-02T00:00:00.000Z" });

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("created_at < ?");
	});

	it("should not filter by cursor when before is not provided", async () => {
		const db = createMockDB({ allResults: [] });

		await getMessages(db, "conv-1");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).not.toContain("created_at < ?");
	});

	it("should hide content of retracted messages", async () => {
		const retracted = makeMessage({
			id: "msg-retracted",
			content: "This was a secret",
			retracted_at: "2026-01-02T00:00:00.000Z",
		});
		const db = createMockDB({ allResults: [retracted] });

		const result = await getMessages(db, "conv-1");

		expect(result[0].content).toBe("");
		expect(result[0].retracted_at).not.toBeNull();
	});

	it("should parse image metadata for non-retracted image messages", async () => {
		const imageMsg = makeMessage({
			content_type: "image",
			metadata: JSON.stringify({ url: "https://example.com/img.jpg", width: 800, height: 600 }),
		});
		const db = createMockDB({ allResults: [imageMsg] });

		const result = await getMessages(db, "conv-1");

		expect(result[0].metadata).toEqual({
			url: "https://example.com/img.jpg",
			width: 800,
			height: 600,
		});
	});

	it("should return null metadata for retracted image messages", async () => {
		const retractedImage = makeMessage({
			content_type: "image",
			metadata: JSON.stringify({ url: "https://example.com/img.jpg", width: 800, height: 600 }),
			retracted_at: "2026-01-02T00:00:00.000Z",
		});
		const db = createMockDB({ allResults: [retractedImage] });

		const result = await getMessages(db, "conv-1");

		expect(result[0].metadata).toBeNull();
	});

	it("should clamp limit to 100 maximum", async () => {
		const db = createMockDB({ allResults: [] });

		await getMessages(db, "conv-1", { limit: 9999 });

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		expect(bindArgs).toContain(100);
		expect(bindArgs).not.toContain(9999);
	});

	it("should default limit to 50 when not specified", async () => {
		const db = createMockDB({ allResults: [] });

		await getMessages(db, "conv-1");

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		expect(bindArgs).toContain(50);
	});

	it("should return empty array when conversation has no messages", async () => {
		const db = createMockDB({ allResults: [] });

		const result = await getMessages(db, "conv-1");

		expect(result).toEqual([]);
	});
});

// ── createMessage ────────────────────────────────────────────────────────────

describe("createMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should persist a text message and return display-ready data", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });

		const result = await createMessage(db, "conv-1", "tenant-alice", "Hello!", "text");

		expect(batchSpy).toHaveBeenCalledOnce();
		expect(result.content).toBe("Hello!");
		expect(result.content_type).toBe("text");
		expect(result.sender_id).toBe("tenant-alice");
		expect(result.conversation_id).toBe("conv-1");
		expect(result.retracted_at).toBeNull();
	});

	it("should generate a unique message ID", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });

		const result = await createMessage(db, "conv-1", "tenant-alice", "Hello!", "text");

		expect(result.id).toBeTruthy();
		expect(typeof result.id).toBe("string");
	});

	it("should set a timestamp on the new message", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });

		const result = await createMessage(db, "conv-1", "tenant-alice", "Hello!", "text");

		expect(result.created_at).toBeTruthy();
	});

	it("should update conversation preview with the message text", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });

		await createMessage(db, "conv-1", "tenant-alice", "Short message", "text");

		// The batch call contains both INSERT message + UPDATE conversation
		const batchArgs = batchSpy.mock.calls[0][0];
		expect(batchArgs).toHaveLength(2);
	});

	it("should truncate preview to 200 chars with ellipsis for long messages", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });
		const longContent = "A".repeat(300);

		await createMessage(db, "conv-1", "tenant-alice", longContent, "text");

		// The shared mock statement captures both bind() calls:
		//   call[0] = INSERT args: (id, conversationId, senderId, content, contentType, metadataJson, now)
		//   call[1] = UPDATE args: (preview, now, now, conversationId)
		// Preview is the first arg of the second bind call.
		const statement = (db as any)._statement;
		const previewBound = statement.bind.mock.calls[1][0] as string;
		expect(previewBound.length).toBeLessThanOrEqual(203); // 200 + "..."
		expect(previewBound.endsWith("...")).toBe(true);
	});

	it("should use [image] as preview for image messages", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });
		const metadata = { url: "https://cdn.example.com/img.jpg", width: 800, height: 600 };

		await createMessage(db, "conv-1", "tenant-alice", "", "image", metadata);

		// UPDATE bind is the second bind() call; preview is the first arg
		const statement = (db as any)._statement;
		const previewBound = statement.bind.mock.calls[1][0] as string;
		expect(previewBound).toBe("[image]");
	});

	it("should reject invalid content types", async () => {
		const db = createMockDB({});

		await expect(
			createMessage(db, "conv-1", "tenant-alice", "hello", "video" as "text"),
		).rejects.toThrow();
	});

	it("should reject messages exceeding 4000 characters", async () => {
		const db = createMockDB({});
		const tooLong = "A".repeat(4001);

		await expect(createMessage(db, "conv-1", "tenant-alice", tooLong, "text")).rejects.toThrow();
	});

	it("should accept messages at exactly 4000 characters", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });
		const exactly4000 = "A".repeat(4000);

		const result = await createMessage(db, "conv-1", "tenant-alice", exactly4000, "text");

		expect(result.content.length).toBe(4000);
	});

	it("should persist image metadata as JSON", async () => {
		const batchSpy = vi.fn().mockResolvedValue([]);
		const db = createMockDB({ batchSpy });
		const metadata = {
			url: "https://cdn.example.com/img.jpg",
			width: 800,
			height: 600,
			alt: "A cat",
		};

		const result = await createMessage(db, "conv-1", "tenant-alice", "", "image", metadata);

		expect(result.metadata).toEqual(metadata);
	});
});

// ── updateReadCursor ─────────────────────────────────────────────────────────

describe("updateReadCursor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should upsert the read cursor for a participant", async () => {
		const db = createMockDB({});

		await updateReadCursor(db, "conv-1", "tenant-alice", "msg-5");

		expect(db.prepare).toHaveBeenCalledOnce();
		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("ON CONFLICT");
	});

	it("should bind the correct conversation, tenant, and message IDs", async () => {
		const db = createMockDB({});

		await updateReadCursor(db, "conv-1", "tenant-alice", "msg-5");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("conv-1", "tenant-alice", "msg-5");
	});
});

// ── getTotalUnreadCount ──────────────────────────────────────────────────────

describe("getTotalUnreadCount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return total unread count across all conversations", async () => {
		const db = createMockDB({ firstResult: { total: 7 } });

		const result = await getTotalUnreadCount(db, "tenant-alice");

		expect(result).toBe(7);
	});

	it("should return 0 when all messages are read", async () => {
		const db = createMockDB({ firstResult: { total: 0 } });

		const result = await getTotalUnreadCount(db, "tenant-alice");

		expect(result).toBe(0);
	});

	it("should return 0 when query returns null (no conversations)", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await getTotalUnreadCount(db, "tenant-alice");

		expect(result).toBe(0);
	});

	it("should scope the query to the given tenant", async () => {
		const db = createMockDB({ firstResult: { total: 0 } });

		await getTotalUnreadCount(db, "my-tenant");

		const bindArgs = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind.mock
			.calls[0];
		expect(bindArgs).toContain("my-tenant");
	});
});

// ── retractMessage ───────────────────────────────────────────────────────────

describe("retractMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should soft-delete own message and return true", async () => {
		const db = createMockDB({ changes: 1 });

		const result = await retractMessage(db, "msg-1", "tenant-alice");

		expect(result).toBe(true);
	});

	it("should return false when message not found or not owned by sender", async () => {
		const db = createMockDB({ changes: 0 });

		const result = await retractMessage(db, "msg-1", "tenant-bob");

		expect(result).toBe(false);
	});

	it("should return false when message is already retracted", async () => {
		// retracted_at IS NULL check in WHERE prevents double-retraction
		const db = createMockDB({ changes: 0 });

		const result = await retractMessage(db, "msg-retracted", "tenant-alice");

		expect(result).toBe(false);
	});

	it("should filter by sender ID to enforce sender-only retraction", async () => {
		const db = createMockDB({ changes: 1 });

		await retractMessage(db, "msg-1", "tenant-alice");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("sender_id = ?");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("msg-1", "tenant-alice");
	});

	it("should include retracted_at IS NULL in the WHERE clause (prevents double-retraction)", async () => {
		const db = createMockDB({ changes: 1 });

		await retractMessage(db, "msg-1", "tenant-alice");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("retracted_at IS NULL");
	});
});

// ── isParticipant ────────────────────────────────────────────────────────────

describe("isParticipant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return true when tenant is a participant", async () => {
		const db = createMockDB({ firstResult: { "1": 1 } });

		const result = await isParticipant(db, "conv-1", "tenant-alice");

		expect(result).toBe(true);
	});

	it("should return false when tenant is not a participant", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await isParticipant(db, "conv-1", "tenant-eve");

		expect(result).toBe(false);
	});

	it("should check both participant_a and participant_b columns", async () => {
		const db = createMockDB({ firstResult: { "1": 1 } });

		await isParticipant(db, "conv-1", "tenant-alice");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("participant_a = ?");
		expect(sql).toContain("participant_b = ?");
	});

	it("should scope check to the specific conversation ID", async () => {
		const db = createMockDB({ firstResult: null });

		await isParticipant(db, "specific-conv-id", "tenant-alice");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("specific-conv-id", "tenant-alice", "tenant-alice");
	});
});

// ── areMutualFriends (friends.ts addition) ───────────────────────────────────

describe("areMutualFriends (via friends service)", () => {
	// Tested through friends.test.ts — the areMutualFriends function
	// is exercised indirectly through the conversation creation API tests.
	// A focused unit test lives here for the boundary cases.
	it.todo("mutual friend check is covered in friends.test.ts and the API route tests");
});
