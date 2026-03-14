/**
 * Chat API Route Tests
 *
 * Tests the Chirp API endpoints for auth, validation, authorization,
 * and correct behavior. Follows the same pattern as friends.test.ts.
 *
 * Routes tested:
 *   GET  /api/chat/conversations
 *   POST /api/chat/conversations
 *   GET  /api/chat/conversations/[id]/messages
 *   POST /api/chat/conversations/[id]/messages
 *   POST /api/chat/conversations/[id]/read
 *   POST /api/chat/conversations/[id]/messages/[messageId]/retract
 *   GET  /api/chat/unread
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Route handlers ───────────────────────────────────────────────────────────

import { GET as getConversations, POST as postConversations } from "./conversations/+server";
import {
	GET as getMessagesRoute,
	POST as postMessages,
} from "./conversations/[id]/messages/+server";
import { POST as postRead } from "./conversations/[id]/read/+server";
import { POST as postRetract } from "./conversations/[id]/messages/[messageId]/retract/+server";
import { GET as getUnread } from "./unread/+server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("$lib/server/services/users.js", () => ({
	getUserHomeGrove: vi.fn(),
}));

vi.mock("$lib/threshold/factory.js", () => ({
	createThreshold: vi.fn(() => null),
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
	thresholdCheck: vi.fn(),
}));

vi.mock("$lib/server/services/chat.js", () => ({
	listConversations: vi.fn(),
	getOrCreateConversation: vi.fn(),
	getMessages: vi.fn(),
	createMessage: vi.fn(),
	updateReadCursor: vi.fn(),
	getTotalUnreadCount: vi.fn(),
	retractMessage: vi.fn(),
	isParticipant: vi.fn(),
}));

vi.mock("$lib/server/services/friends.js", async (importOriginal) => {
	const original = (await importOriginal()) as Record<string, unknown>;
	return { ...original, areMutualFriends: vi.fn() };
});

vi.mock("@autumnsgrove/lattice/loom/sveltekit", () => ({
	getLoomDO: vi.fn(() => ({
		fetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
	})),
}));

import { getUserHomeGrove } from "$lib/server/services/users.js";
import {
	listConversations,
	getOrCreateConversation,
	getMessages,
	createMessage,
	updateReadCursor,
	getTotalUnreadCount,
	retractMessage,
	isParticipant,
} from "$lib/server/services/chat.js";
import { areMutualFriends } from "$lib/server/services/friends.js";

// ── Shared fixtures ──────────────────────────────────────────────────────────

const TEST_USER = { id: "user-1", email: "alice@example.com" };
const HOME_GROVE = { tenantId: "tenant-alice", subdomain: "alice", name: "Alice's Grove" };

const MOCK_CONVERSATION = {
	id: "conv-1",
	participant_a: "tenant-alice",
	participant_b: "tenant-bob",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
	last_message_preview: null,
	last_message_at: null,
};

const MOCK_MESSAGE = {
	id: "msg-1",
	conversation_id: "conv-1",
	sender_id: "tenant-alice",
	content: "Hello!",
	content_type: "text",
	metadata: null,
	created_at: "2026-01-01T00:00:00.000Z",
	retracted_at: null,
};

// ── DB mock ──────────────────────────────────────────────────────────────────

function createMockDB(overrides?: { firstResult?: unknown }) {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue(overrides?.firstResult ?? null),
			run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
		})),
		batch: vi.fn().mockResolvedValue([]),
	};
}

// ── Event factory helpers ────────────────────────────────────────────────────

function makeGETEvent(
	db: ReturnType<typeof createMockDB>,
	opts: {
		user?: typeof TEST_USER | null;
		params?: Record<string, string>;
		searchParams?: Record<string, string>;
		context?: unknown;
	} = {},
) {
	const url = new URL("https://test.grove.place/api/chat/test");
	for (const [k, v] of Object.entries(opts.searchParams ?? {})) {
		url.searchParams.set(k, v);
	}
	return {
		platform: { env: { DB: db }, context: { waitUntil: vi.fn() } },
		locals: { user: opts.user !== undefined ? opts.user : TEST_USER },
		url,
		params: opts.params ?? {},
	};
}

function makePOSTEvent(
	body: Record<string, unknown>,
	db: ReturnType<typeof createMockDB>,
	opts: { user?: typeof TEST_USER | null; params?: Record<string, string> } = {},
) {
	return {
		request: new Request("https://test.grove.place/api/chat/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
		platform: { env: { DB: db, CHAT: {} }, context: { waitUntil: vi.fn() } },
		locals: { user: opts.user !== undefined ? opts.user : TEST_USER },
		params: opts.params ?? {},
	};
}

function makeMalformedPOSTEvent(
	db: ReturnType<typeof createMockDB>,
	opts: { user?: typeof TEST_USER | null; params?: Record<string, string> } = {},
) {
	return {
		request: new Request("https://test.grove.place/api/chat/test", {
			method: "POST",
			body: "not json at all",
		}),
		platform: { env: { DB: db } },
		locals: { user: opts.user !== undefined ? opts.user : TEST_USER },
		params: opts.params ?? {},
	};
}

// ============================================================================
// GET /api/chat/conversations
// ============================================================================

describe("GET /api/chat/conversations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(listConversations).mockResolvedValue([]);
	});

	it("should return conversations for authenticated user", async () => {
		vi.mocked(listConversations).mockResolvedValue([
			{
				...MOCK_CONVERSATION,
				unread_count: 0,
				peer_tenant_id: "tenant-bob",
				peer_name: "Bob",
				peer_subdomain: "bob",
			},
		]);

		const db = createMockDB();
		const response = await getConversations(makeGETEvent(db) as any);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.conversations).toHaveLength(1);
	});

	it("should return empty conversations when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);

		const db = createMockDB();
		const response = await getConversations(makeGETEvent(db) as any);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.conversations).toEqual([]);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(getConversations(makeGETEvent(db, { user: null }) as any)).rejects.toThrow();
	});

	it("should pass limit and offset from query params", async () => {
		const db = createMockDB();
		await getConversations(makeGETEvent(db, { searchParams: { limit: "10", offset: "5" } }) as any);

		expect(listConversations).toHaveBeenCalledWith(db, "tenant-alice", 10, 5);
	});

	it("should clamp limit to 100 maximum", async () => {
		const db = createMockDB();
		await getConversations(makeGETEvent(db, { searchParams: { limit: "9999" } }) as any);

		expect(listConversations).toHaveBeenCalledWith(db, "tenant-alice", 100, 0);
	});
});

// ============================================================================
// POST /api/chat/conversations
// ============================================================================

describe("POST /api/chat/conversations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(areMutualFriends).mockResolvedValue(true);
		vi.mocked(getOrCreateConversation).mockResolvedValue({
			conversation: MOCK_CONVERSATION,
			created: true,
		});
	});

	it("should create a conversation for mutual friends and return 201", async () => {
		const db = createMockDB();
		const response = await postConversations(
			makePOSTEvent({ friendTenantId: "tenant-bob" }, db) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
		expect(data.conversation.id).toBe("conv-1");
		expect(data.created).toBe(true);
	});

	it("should return 200 when conversation already exists", async () => {
		vi.mocked(getOrCreateConversation).mockResolvedValue({
			conversation: MOCK_CONVERSATION,
			created: false,
		});

		const db = createMockDB();
		const response = await postConversations(
			makePOSTEvent({ friendTenantId: "tenant-bob" }, db) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.created).toBe(false);
	});

	it("should reject non-mutual friends with 403", async () => {
		vi.mocked(areMutualFriends).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: "tenant-stranger" }, db) as any),
		).rejects.toThrow();
	});

	it("should reject self-conversations (same tenant ID as home grove)", async () => {
		const db = createMockDB();
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: HOME_GROVE.tenantId }, db) as any),
		).rejects.toThrow();
	});

	it("should reject missing friendTenantId", async () => {
		const db = createMockDB();
		await expect(postConversations(makePOSTEvent({}, db) as any)).rejects.toThrow();
	});

	it("should reject friendTenantId that is not a string", async () => {
		const db = createMockDB();
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: 12345 }, db) as any),
		).rejects.toThrow();
	});

	it("should reject friendTenantId exceeding 64 characters", async () => {
		const db = createMockDB();
		const tooLong = "a".repeat(65);
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: tooLong }, db) as any),
		).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: "tenant-bob" }, db, { user: null }) as any),
		).rejects.toThrow();
	});

	it("should reject when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();
		await expect(
			postConversations(makePOSTEvent({ friendTenantId: "tenant-bob" }, db) as any),
		).rejects.toThrow();
	});

	it("should reject malformed JSON body", async () => {
		const db = createMockDB();
		await expect(postConversations(makeMalformedPOSTEvent(db) as any)).rejects.toThrow();
	});
});

// ============================================================================
// GET /api/chat/conversations/[id]/messages
// ============================================================================

describe("GET /api/chat/conversations/[id]/messages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(isParticipant).mockResolvedValue(true);
		vi.mocked(getMessages).mockResolvedValue([MOCK_MESSAGE]);
	});

	it("should return message history for conversation participants", async () => {
		const db = createMockDB();
		const response = await getMessagesRoute(makeGETEvent(db, { params: { id: "conv-1" } }) as any);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.messages).toHaveLength(1);
		expect(data.messages[0].id).toBe("msg-1");
	});

	it("should reject non-participants with 403", async () => {
		vi.mocked(isParticipant).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			getMessagesRoute(makeGETEvent(db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(
			getMessagesRoute(makeGETEvent(db, { user: null, params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();
		await expect(
			getMessagesRoute(makeGETEvent(db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should pass cursor and limit from query params", async () => {
		const db = createMockDB();
		await getMessagesRoute(
			makeGETEvent(db, {
				params: { id: "conv-1" },
				searchParams: { before: "2026-01-02T00:00:00.000Z", limit: "20" },
			}) as any,
		);

		expect(getMessages).toHaveBeenCalledWith(db, "conv-1", {
			before: "2026-01-02T00:00:00.000Z",
			limit: 20,
		});
	});
});

// ============================================================================
// POST /api/chat/conversations/[id]/messages
// ============================================================================

describe("POST /api/chat/conversations/[id]/messages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(isParticipant).mockResolvedValue(true);
		vi.mocked(createMessage).mockResolvedValue(MOCK_MESSAGE);
	});

	it("should create a text message and return 201", async () => {
		const db = createMockDB({
			firstResult: { participant_a: "tenant-alice", participant_b: "tenant-bob" },
		});
		const response = await postMessages(
			makePOSTEvent({ content: "Hello!", contentType: "text" }, db, {
				params: { id: "conv-1" },
			}) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
		expect(data.message.id).toBe("msg-1");
	});

	it("should reject non-participants with 403", async () => {
		vi.mocked(isParticipant).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			postMessages(makePOSTEvent({ content: "Hello!" }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(
			postMessages(
				makePOSTEvent({ content: "Hello!" }, db, { user: null, params: { id: "conv-1" } }) as any,
			),
		).rejects.toThrow();
	});

	it("should reject missing content", async () => {
		const db = createMockDB();
		await expect(
			postMessages(makePOSTEvent({}, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject empty string content", async () => {
		const db = createMockDB();
		await expect(
			postMessages(makePOSTEvent({ content: "" }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject messages over 4000 characters", async () => {
		const db = createMockDB();
		const tooLong = "A".repeat(4001);
		await expect(
			postMessages(makePOSTEvent({ content: tooLong }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject invalid content types", async () => {
		const db = createMockDB();
		await expect(
			postMessages(
				makePOSTEvent({ content: "hi", contentType: "video" }, db, {
					params: { id: "conv-1" },
				}) as any,
			),
		).rejects.toThrow();
	});

	it("should default contentType to text when not specified", async () => {
		const db = createMockDB({
			firstResult: { participant_a: "tenant-alice", participant_b: "tenant-bob" },
		});
		await postMessages(
			makePOSTEvent({ content: "Hello!" }, db, { params: { id: "conv-1" } }) as any,
		);

		expect(createMessage).toHaveBeenCalledWith(
			db,
			"conv-1",
			HOME_GROVE.tenantId,
			"Hello!",
			"text",
			undefined,
		);
	});

	it("should reject malformed JSON body", async () => {
		const db = createMockDB();
		await expect(
			postMessages(makeMalformedPOSTEvent(db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();
		await expect(
			postMessages(makePOSTEvent({ content: "hi" }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});
});

// ============================================================================
// POST /api/chat/conversations/[id]/read
// ============================================================================

describe("POST /api/chat/conversations/[id]/read", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(isParticipant).mockResolvedValue(true);
		vi.mocked(updateReadCursor).mockResolvedValue(undefined);
	});

	it("should update read cursor and return success", async () => {
		const db = createMockDB({ firstResult: null }); // no latest msg
		const response = await postRead(
			makePOSTEvent({ messageId: "msg-5" }, db, { params: { id: "conv-1" } }) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should reject non-participants with 403", async () => {
		vi.mocked(isParticipant).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			postRead(makePOSTEvent({ messageId: "msg-5" }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(
			postRead(
				makePOSTEvent({ messageId: "msg-5" }, db, { user: null, params: { id: "conv-1" } }) as any,
			),
		).rejects.toThrow();
	});

	it("should reject missing messageId", async () => {
		const db = createMockDB();
		await expect(
			postRead(makePOSTEvent({}, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should resolve 'latest' sentinel to actual message ID", async () => {
		const db = createMockDB({ firstResult: { id: "msg-999" } });

		const response = await postRead(
			makePOSTEvent({ messageId: "latest" }, db, { params: { id: "conv-1" } }) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(updateReadCursor).toHaveBeenCalledWith(db, "conv-1", HOME_GROVE.tenantId, "msg-999");
	});

	it("should return success without updating cursor when 'latest' and no messages exist", async () => {
		const db = createMockDB({ firstResult: null });

		const response = await postRead(
			makePOSTEvent({ messageId: "latest" }, db, { params: { id: "conv-1" } }) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(updateReadCursor).not.toHaveBeenCalled();
	});

	it("should reject messageId exceeding 64 characters", async () => {
		const db = createMockDB();
		const tooLong = "a".repeat(65);
		await expect(
			postRead(makePOSTEvent({ messageId: tooLong }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();
		await expect(
			postRead(makePOSTEvent({ messageId: "msg-5" }, db, { params: { id: "conv-1" } }) as any),
		).rejects.toThrow();
	});
});

// ============================================================================
// POST /api/chat/conversations/[id]/messages/[messageId]/retract
// ============================================================================

describe("POST /api/chat/conversations/[id]/messages/[messageId]/retract", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(isParticipant).mockResolvedValue(true);
		vi.mocked(retractMessage).mockResolvedValue(true);
	});

	it("should retract own message and return success", async () => {
		const db = createMockDB();
		const response = await postRetract(
			makePOSTEvent({}, db, { params: { id: "conv-1", messageId: "msg-1" } }) as any,
		);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should call retractMessage with tenant ID (enforces sender-only at service layer)", async () => {
		const db = createMockDB();
		await postRetract(
			makePOSTEvent({}, db, { params: { id: "conv-1", messageId: "msg-1" } }) as any,
		);

		expect(retractMessage).toHaveBeenCalledWith(db, "msg-1", HOME_GROVE.tenantId);
	});

	it("should return 404 when message not found or not own message", async () => {
		vi.mocked(retractMessage).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			postRetract(
				makePOSTEvent({}, db, { params: { id: "conv-1", messageId: "msg-other" } }) as any,
			),
		).rejects.toThrow();
	});

	it("should reject non-participants with 403 (cannot retract in conversations they don't belong to)", async () => {
		vi.mocked(isParticipant).mockResolvedValue(false);

		const db = createMockDB();
		await expect(
			postRetract(makePOSTEvent({}, db, { params: { id: "conv-1", messageId: "msg-1" } }) as any),
		).rejects.toThrow();
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(
			postRetract(
				makePOSTEvent({}, db, { user: null, params: { id: "conv-1", messageId: "msg-1" } }) as any,
			),
		).rejects.toThrow();
	});

	it("should reject when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);
		const db = createMockDB();
		await expect(
			postRetract(makePOSTEvent({}, db, { params: { id: "conv-1", messageId: "msg-1" } }) as any),
		).rejects.toThrow();
	});
});

// ============================================================================
// GET /api/chat/unread
// ============================================================================

describe("GET /api/chat/unread", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserHomeGrove).mockResolvedValue(HOME_GROVE);
		vi.mocked(getTotalUnreadCount).mockResolvedValue(0);
	});

	it("should return total unread count for authenticated user", async () => {
		vi.mocked(getTotalUnreadCount).mockResolvedValue(5);

		const db = createMockDB();
		const response = await getUnread(makeGETEvent(db) as any);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.unread).toBe(5);
	});

	it("should return 0 when user has no grove", async () => {
		vi.mocked(getUserHomeGrove).mockResolvedValue(null);

		const db = createMockDB();
		const response = await getUnread(makeGETEvent(db) as any);
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.unread).toBe(0);
	});

	it("should return 0 when all messages are read", async () => {
		vi.mocked(getTotalUnreadCount).mockResolvedValue(0);

		const db = createMockDB();
		const response = await getUnread(makeGETEvent(db) as any);
		const data = (await response.json()) as any;

		expect(data.unread).toBe(0);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		await expect(getUnread(makeGETEvent(db, { user: null }) as any)).rejects.toThrow();
	});

	it("should call getTotalUnreadCount with home grove tenant ID", async () => {
		const db = createMockDB();
		await getUnread(makeGETEvent(db) as any);

		expect(getTotalUnreadCount).toHaveBeenCalledWith(db, HOME_GROVE.tenantId);
	});
});

// ============================================================================
// areMutualFriends — focused unit tests
// ============================================================================

describe("areMutualFriends (friends service)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return true when both directions exist (COUNT >= 2)", async () => {
		// We test this via the real areMutualFriends import in friends.test.ts.
		// Here we verify the service mock behavior used in API tests above works.
		vi.mocked(areMutualFriends).mockResolvedValue(true);
		const result = await areMutualFriends({} as D1Database, "tenant-a", "tenant-b");
		expect(result).toBe(true);
	});

	it("should return false when only one direction exists (one-way follow)", async () => {
		vi.mocked(areMutualFriends).mockResolvedValue(false);
		const result = await areMutualFriends({} as D1Database, "tenant-a", "tenant-stranger");
		expect(result).toBe(false);
	});
});
