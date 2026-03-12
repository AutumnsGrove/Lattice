/**
 * ChatDO Tests
 *
 * Tests REST route handlers for the per-conversation DM Durable Object.
 * WebSocket handlers get smoke tests only (hibernation API is hard to mock).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatDO } from "./ChatDO";
import {
	createTestDOState,
	createMockSql,
	createMockD1,
	doRequest,
	doPost,
	type MockD1,
} from "./test-helpers";

// Mock crypto.randomUUID for deterministic IDs
vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-chat" });

function createChatDO() {
	const sql = createMockSql();
	const { state, storage } = createTestDOState("chat:tenantA:tenantB", sql);
	const db = createMockD1();
	const env = { DB: db as unknown as D1Database };

	const doInstance = new ChatDO(state, env);
	return { doInstance, sql, db, storage };
}

describe("ChatDO", () => {
	describe("POST /send (alreadyPersisted = true)", () => {
		it("should broadcast message without persisting again", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "Hello!",
					alreadyPersisted: true,
					messageId: "msg-1",
					createdAt: "2024-01-01T00:00:00Z",
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.message.id).toBe("msg-1");
			expect(body.message.content).toBe("Hello!");
			expect(body.message.sender_id).toBe("tenant-a");
		});

		it("should require messageId when alreadyPersisted", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "Hello!",
					alreadyPersisted: true,
					// missing messageId
				}),
			);

			expect(res.status).toBe(400);
		});
	});

	describe("POST /send (alreadyPersisted = false)", () => {
		it("should verify participant and persist message", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check
			db._pushResult({
				results: [{ participant_a: "tenant-a", participant_b: "tenant-b" }],
			});
			// D1 batch (insert message + update conversation) — push two results
			db._pushResult({ meta: { changes: 1 } });
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "Hello from REST!",
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.message.content).toBe("Hello from REST!");
			expect(body.message.conversation_id).toBe("conv-1");
		});

		it("should reject non-participant sender", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check returns null (not a participant)
			db._pushResult({ results: [] });

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "stranger",
					content: "Trying to sneak in",
				}),
			);

			expect(res.status).toBe(403);
		});

		it("should reject empty content for text messages", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "",
				}),
			);
			const body = await res.json();

			expect(res.status).toBe(400);
			expect(body.error).toContain("content required");
		});

		it("should reject messages over max length", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "x".repeat(4001),
				}),
			);

			expect(res.status).toBe(400);
			expect((await res.json()).error).toContain("too long");
		});

		it("should reject invalid content_type", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "test",
					contentType: "video",
				}),
			);

			expect(res.status).toBe(400);
		});

		it("should allow image messages without text content", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check
			db._pushResult({
				results: [{ participant_a: "tenant-a", participant_b: "tenant-b" }],
			});
			// D1 batch
			db._pushResult({ meta: { changes: 1 } });
			db._pushResult({ meta: { changes: 1 } });

			const res = await doInstance.fetch(
				doPost("/send", {
					conversationId: "conv-1",
					senderId: "tenant-a",
					content: "",
					contentType: "image",
					metadata: { url: "https://img.example.com/pic.jpg", width: 800, height: 600 },
				}),
			);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(body.message.content_type).toBe("image");
		});
	});

	describe("POST /send — invalid body", () => {
		it("should reject missing conversationId", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(doPost("/send", { senderId: "tenant-a", content: "hi" }));
			expect(res.status).toBe(400);
		});

		it("should reject missing senderId", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(
				doPost("/send", { conversationId: "conv-1", content: "hi" }),
			);
			expect(res.status).toBe(400);
		});
	});

	describe("GET /history", () => {
		it("should return message history", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check
			db._pushResult({ results: [{ "1": 1 }] });
			// History query
			db._pushResult({
				results: [
					{
						id: "msg-1",
						conversation_id: "conv-1",
						sender_id: "tenant-a",
						content: "Hello",
						content_type: "text",
						metadata: null,
						created_at: "2024-01-01T00:00:00Z",
						retracted_at: null,
					},
				],
			});

			const res = await doInstance.fetch(
				doRequest("/history?conversationId=conv-1&tenantId=tenant-a"),
			);
			const body = await res.json();

			expect(body.messages).toHaveLength(1);
			expect(body.messages[0].content).toBe("Hello");
		});

		it("should require conversationId", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(doRequest("/history?tenantId=tenant-a"));
			expect(res.status).toBe(400);
		});

		it("should require tenantId", async () => {
			const { doInstance } = createChatDO();

			const res = await doInstance.fetch(doRequest("/history?conversationId=conv-1"));
			expect(res.status).toBe(400);
		});

		it("should reject non-participant", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check returns null
			db._pushResult({ results: [] });

			const res = await doInstance.fetch(
				doRequest("/history?conversationId=conv-1&tenantId=stranger"),
			);
			expect(res.status).toBe(403);
		});

		it("should redact content of retracted messages", async () => {
			const { doInstance, db } = createChatDO();

			// Participant check
			db._pushResult({ results: [{ "1": 1 }] });
			// History with retracted message
			db._pushResult({
				results: [
					{
						id: "msg-1",
						conversation_id: "conv-1",
						sender_id: "tenant-a",
						content: "Original content",
						content_type: "text",
						metadata: null,
						created_at: "2024-01-01T00:00:00Z",
						retracted_at: "2024-01-01T00:05:00Z",
					},
				],
			});

			const res = await doInstance.fetch(
				doRequest("/history?conversationId=conv-1&tenantId=tenant-a"),
			);
			const body = await res.json();

			expect(body.messages[0].content).toBe("");
			expect(body.messages[0].retracted_at).toBe("2024-01-01T00:05:00Z");
		});
	});

	describe("WebSocket upgrade", () => {
		it("should reject WebSocket without tenantId", async () => {
			const { doInstance } = createChatDO();

			const req = new Request("http://do/ws", {
				headers: { Upgrade: "websocket" },
			});
			const res = await doInstance.fetch(req);

			expect(res.status).toBe(400);
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const { doInstance } = createChatDO();
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});
	});
});
