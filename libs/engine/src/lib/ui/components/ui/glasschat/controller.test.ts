import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createChatMessage,
	createChatController,
	createAIChatController,
	createConversationalChatController,
	extractErrorCode,
	resolveErrorMessage,
} from "./controller.svelte";

// ============================================================================
// createChatMessage
// ============================================================================

describe("createChatMessage", () => {
	it("should create a message with auto-generated id and timestamp", () => {
		const msg = createChatMessage("user", "hello");

		expect(msg.id).toBeDefined();
		expect(msg.role).toBe("user");
		expect(msg.content).toBe("hello");
		expect(msg.timestamp).toBeDefined();
		expect(new Date(msg.timestamp).getTime()).not.toBeNaN();
	});

	it("should merge optional extras into the message", () => {
		const sender = { id: "u1", name: "Autumn" };
		const msg = createChatMessage("user", "hi", {
			status: "sending",
			sender,
			metadata: { draft: true },
		});

		expect(msg.status).toBe("sending");
		expect(msg.sender).toEqual(sender);
		expect(msg.metadata).toEqual({ draft: true });
	});

	it("should generate unique ids across calls", () => {
		const a = createChatMessage("user", "one");
		const b = createChatMessage("user", "two");

		expect(a.id).not.toBe(b.id);
	});
});

// ============================================================================
// createChatController
// ============================================================================

describe("createChatController", () => {
	it("should start with empty state", () => {
		const chat = createChatController();

		expect(chat.messages).toEqual([]);
		expect(chat.isLoading).toBe(false);
		expect(chat.error).toBeNull();
	});

	it("should initialize with provided messages", () => {
		const initial = [createChatMessage("user", "preloaded")];
		const chat = createChatController(initial);

		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].content).toBe("preloaded");
	});

	it("should add messages and return the id", () => {
		const chat = createChatController();

		const id = chat.addMessage("wisp", "welcome");

		expect(id).toBeDefined();
		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].role).toBe("wisp");
		expect(chat.messages[0].content).toBe("welcome");
	});

	it("should update a message by id", () => {
		const chat = createChatController();
		const id = chat.addMessage("user", "draft");

		chat.updateMessage(id, { content: "final version" });

		expect(chat.messages[0].content).toBe("final version");
		expect(chat.messages[0].role).toBe("user"); // unchanged fields preserved
	});

	it("should not mutate other messages on update", () => {
		const chat = createChatController();
		chat.addMessage("user", "first");
		const secondId = chat.addMessage("user", "second");

		chat.updateMessage(secondId, { content: "updated" });

		expect(chat.messages[0].content).toBe("first");
		expect(chat.messages[1].content).toBe("updated");
	});

	it("should remove a message by id", () => {
		const chat = createChatController();
		const id = chat.addMessage("user", "oops");
		chat.addMessage("user", "keeper");

		chat.removeMessage(id);

		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].content).toBe("keeper");
	});

	it("should clear all messages and error", () => {
		const chat = createChatController();
		chat.addMessage("user", "one");
		chat.addMessage("user", "two");
		chat.setError("something broke");

		chat.clear();

		expect(chat.messages).toEqual([]);
		expect(chat.error).toBeNull();
	});

	it("should toggle loading state", () => {
		const chat = createChatController();

		chat.setLoading(true);
		expect(chat.isLoading).toBe(true);

		chat.setLoading(false);
		expect(chat.isLoading).toBe(false);
	});

	it("should set and clear error", () => {
		const chat = createChatController();

		chat.setError("network failure");
		expect(chat.error).toBe("network failure");

		chat.setError(null);
		expect(chat.error).toBeNull();
	});

	// -- updateMessageMetadata (nested merge) --

	it("should merge metadata without replacing existing keys", () => {
		const chat = createChatController();
		const id = chat.addMessage("reverie", "changes ready", {
			metadata: { type: "change-preview", requestId: "req-1" },
		});

		chat.updateMessageMetadata(id, { applied: true });

		expect(chat.messages[0].metadata).toEqual({
			type: "change-preview",
			requestId: "req-1",
			applied: true,
		});
	});

	it("should create metadata when message had none", () => {
		const chat = createChatController();
		const id = chat.addMessage("user", "plain message");

		chat.updateMessageMetadata(id, { flagged: true });

		expect(chat.messages[0].metadata).toEqual({ flagged: true });
	});

	it("should overwrite specific metadata keys while preserving others", () => {
		const chat = createChatController();
		const id = chat.addMessage("reverie", "preview", {
			metadata: { applied: false, changes: [1, 2, 3] },
		});

		chat.updateMessageMetadata(id, { applied: true });

		expect(chat.messages[0].metadata?.applied).toBe(true);
		expect(chat.messages[0].metadata?.changes).toEqual([1, 2, 3]);
	});

	it("should not mutate other messages when updating metadata", () => {
		const chat = createChatController();
		chat.addMessage("user", "first", { metadata: { safe: true } });
		const secondId = chat.addMessage("user", "second", {
			metadata: { safe: true },
		});

		chat.updateMessageMetadata(secondId, { safe: false });

		expect(chat.messages[0].metadata?.safe).toBe(true);
		expect(chat.messages[1].metadata?.safe).toBe(false);
	});

	// -- Server sync via messages setter --

	it("should replace messages via setter for server sync", () => {
		const chat = createChatController();
		chat.addMessage("user", "optimistic");

		const serverMessages = [
			createChatMessage("user", "confirmed by server"),
			createChatMessage("admin", "reply from server"),
		];
		chat.messages = serverMessages;

		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[0].content).toBe("confirmed by server");
		expect(chat.messages[1].role).toBe("admin");
	});
});

// ============================================================================
// createAIChatController
// ============================================================================

describe("createAIChatController", () => {
	const mockOnSend = vi.fn();

	beforeEach(() => {
		mockOnSend.mockReset();
	});

	it("should send user message and append AI response", async () => {
		mockOnSend.mockResolvedValue({ content: "I can help with that" });

		const chat = createAIChatController({
			aiRole: "wisp",
			onSend: mockOnSend,
		});

		chat.inputValue = "help me write";
		await chat.send();

		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[0].role).toBe("user");
		expect(chat.messages[0].content).toBe("help me write");
		expect(chat.messages[1].role).toBe("wisp");
		expect(chat.messages[1].content).toBe("I can help with that");
	});

	it("should clear input after sending", async () => {
		mockOnSend.mockResolvedValue({ content: "ok" });

		const chat = createAIChatController({ onSend: mockOnSend });
		chat.inputValue = "something";
		await chat.send();

		expect(chat.inputValue).toBe("");
	});

	it("should toggle loading during send", async () => {
		let resolvePromise: (v: { content: string }) => void;
		mockOnSend.mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve;
			}),
		);

		const chat = createAIChatController({ onSend: mockOnSend });
		chat.inputValue = "test";

		const sendPromise = chat.send();
		expect(chat.isLoading).toBe(true);

		resolvePromise!({ content: "done" });
		await sendPromise;
		expect(chat.isLoading).toBe(false);
	});

	it("should not send when input is empty", async () => {
		const chat = createAIChatController({ onSend: mockOnSend });
		chat.inputValue = "   ";
		await chat.send();

		expect(mockOnSend).not.toHaveBeenCalled();
		expect(chat.messages).toHaveLength(0);
	});

	it("should not send while already loading", async () => {
		let resolvePromise: (v: { content: string }) => void;
		mockOnSend.mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve;
			}),
		);

		const chat = createAIChatController({ onSend: mockOnSend });
		chat.inputValue = "first";
		const firstSend = chat.send();

		chat.inputValue = "second";
		await chat.send(); // should be guarded

		expect(mockOnSend).toHaveBeenCalledTimes(1);

		resolvePromise!({ content: "reply" });
		await firstSend;
	});

	it("should set error on send failure", async () => {
		mockOnSend.mockRejectedValue(new Error("network down"));

		const chat = createAIChatController({ onSend: mockOnSend });
		chat.inputValue = "test";
		await chat.send();

		expect(chat.error).toBe("network down");
		expect(chat.isLoading).toBe(false);
	});

	it("should use custom error transformer", async () => {
		mockOnSend.mockRejectedValue({ code: "REV-001" });

		const chat = createAIChatController({
			onSend: mockOnSend,
			onError: (err) => `Custom: ${(err as { code: string }).code}`,
		});
		chat.inputValue = "test";
		await chat.send();

		expect(chat.error).toBe("Custom: REV-001");
	});

	it("should clear previous error on new send", async () => {
		mockOnSend
			.mockRejectedValueOnce(new Error("first failure"))
			.mockResolvedValueOnce({ content: "success" });

		const chat = createAIChatController({ onSend: mockOnSend });

		chat.inputValue = "attempt 1";
		await chat.send();
		expect(chat.error).toBe("first failure");

		chat.inputValue = "attempt 2";
		await chat.send();
		expect(chat.error).toBeNull();
	});

	it("should use default roles when not specified", () => {
		const chat = createAIChatController({ onSend: mockOnSend });

		expect(chat.userRole).toBe("user");
		expect(chat.aiRole).toBe("assistant");
	});

	it("should pass message history to onSend", async () => {
		mockOnSend.mockResolvedValue({ content: "reply" });

		const chat = createAIChatController({ onSend: mockOnSend });
		chat.addMessage("user", "context message");
		chat.inputValue = "follow up";
		await chat.send();

		const [, messagesArg] = mockOnSend.mock.calls[0];
		expect(messagesArg.length).toBeGreaterThanOrEqual(2);
	});

	it("should attach metadata from AI response", async () => {
		mockOnSend.mockResolvedValue({
			content: "here are changes",
			metadata: { changes: [{ field: "color", value: "blue" }] },
		});

		const chat = createAIChatController({
			aiRole: "reverie",
			onSend: mockOnSend,
		});
		chat.inputValue = "make it blue";
		await chat.send();

		const aiMessage = chat.messages[1];
		expect(aiMessage.metadata).toEqual({
			changes: [{ field: "color", value: "blue" }],
		});
	});

	it("should forward updateMessageMetadata from base", async () => {
		mockOnSend.mockResolvedValue({
			content: "preview",
			metadata: { type: "change-preview", applied: false },
		});

		const chat = createAIChatController({
			aiRole: "reverie",
			onSend: mockOnSend,
		});
		chat.inputValue = "test";
		await chat.send();

		const aiMsgId = chat.messages[1].id;
		chat.updateMessageMetadata(aiMsgId, { applied: true });

		expect(chat.messages[1].metadata?.type).toBe("change-preview");
		expect(chat.messages[1].metadata?.applied).toBe(true);
	});
});

// ============================================================================
// createConversationalChatController
// ============================================================================

describe("createConversationalChatController", () => {
	it("should add local messages with sending status", () => {
		const chat = createConversationalChatController({ localRole: "me" });

		const id = chat.addLocalMessage("hey there");

		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].role).toBe("me");
		expect(chat.messages[0].content).toBe("hey there");
		expect(chat.messages[0].status).toBe("sending");
	});

	it("should track delivery status progression", () => {
		const chat = createConversationalChatController({ localRole: "me" });
		const id = chat.addLocalMessage("hello");

		chat.markSent(id);
		expect(chat.messages[0].status).toBe("sent");

		chat.markDelivered(id);
		expect(chat.messages[0].status).toBe("delivered");

		chat.markRead(id);
		expect(chat.messages[0].status).toBe("read");
	});

	it("should receive remote messages", () => {
		const chat = createConversationalChatController({ localRole: "me" });

		chat.receiveMessage("friend", "hey!", {
			sender: { id: "u2", name: "Robin" },
		});

		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].role).toBe("friend");
		expect(chat.messages[0].sender?.name).toBe("Robin");
	});

	it("should clear remote typing when a message is received", () => {
		const chat = createConversationalChatController({ localRole: "me" });
		chat.setRemoteTyping("friend");

		expect(chat.remoteTyping).toBe("friend");

		chat.receiveMessage("friend", "done typing!");

		expect(chat.remoteTyping).toBeNull();
	});

	it("should initialize with server-loaded messages", () => {
		const serverMessages = [
			createChatMessage("me", "old message"),
			createChatMessage("friend", "old reply"),
		];

		const chat = createConversationalChatController({
			localRole: "me",
			initialMessages: serverMessages,
		});

		expect(chat.messages).toHaveLength(2);
	});

	it("should expose localRole for consumer reference", () => {
		const chat = createConversationalChatController({ localRole: "wanderer" });
		expect(chat.localRole).toBe("wanderer");
	});

	it("should attach sender to local messages when provided", () => {
		const chat = createConversationalChatController({ localRole: "me" });
		const sender = { id: "u1", name: "Autumn", avatar: "/img/me.jpg" };

		chat.addLocalMessage("with identity", { sender });

		expect(chat.messages[0].sender).toEqual(sender);
		expect(chat.messages[0].status).toBe("sending");
	});

	// -- send() lifecycle --

	describe("send()", () => {
		const mockOnSend = vi.fn();

		beforeEach(() => {
			mockOnSend.mockReset();
		});

		it("should send local message and mark as sent on success", async () => {
			mockOnSend.mockResolvedValue(undefined);

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.inputValue = "hello autumn!";
			await chat.send();

			expect(chat.messages).toHaveLength(1);
			expect(chat.messages[0].role).toBe("visitor");
			expect(chat.messages[0].content).toBe("hello autumn!");
			expect(chat.messages[0].status).toBe("sent");
		});

		it("should clear input after sending", async () => {
			mockOnSend.mockResolvedValue(undefined);

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.inputValue = "something";
			await chat.send();

			expect(chat.inputValue).toBe("");
		});

		it("should mark message as failed on error", async () => {
			mockOnSend.mockRejectedValue(new Error("network error"));

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.inputValue = "hello";
			await chat.send();

			expect(chat.messages[0].status).toBe("failed");
			expect(chat.error).toBe("network error");
			expect(chat.isLoading).toBe(false);
		});

		it("should use custom error transformer", async () => {
			mockOnSend.mockRejectedValue({ code: 500 });

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
				onError: () => "Server is taking a nap",
			});
			chat.inputValue = "hello";
			await chat.send();

			expect(chat.error).toBe("Server is taking a nap");
		});

		it("should not send when input is empty", async () => {
			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.inputValue = "   ";
			await chat.send();

			expect(mockOnSend).not.toHaveBeenCalled();
			expect(chat.messages).toHaveLength(0);
		});

		it("should not send while already loading", async () => {
			let resolvePromise: (v: undefined) => void;
			mockOnSend.mockReturnValue(
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});

			chat.inputValue = "first";
			const firstSend = chat.send();

			chat.inputValue = "second";
			await chat.send(); // guarded

			expect(mockOnSend).toHaveBeenCalledTimes(1);

			resolvePromise!(undefined);
			await firstSend;
		});

		it("should no-op when onSend is not provided", async () => {
			const chat = createConversationalChatController({
				localRole: "me",
			});
			chat.inputValue = "test";
			await chat.send();

			// No crash, no message added, input untouched
			expect(chat.messages).toHaveLength(0);
			expect(chat.inputValue).toBe("test");
		});

		it("should toggle loading during send", async () => {
			let resolvePromise: (v: undefined) => void;
			mockOnSend.mockReturnValue(
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.inputValue = "hello";

			const sendPromise = chat.send();
			expect(chat.isLoading).toBe(true);

			resolvePromise!(undefined);
			await sendPromise;
			expect(chat.isLoading).toBe(false);
		});

		it("should pass message history to onSend", async () => {
			mockOnSend.mockResolvedValue(undefined);

			const chat = createConversationalChatController({
				localRole: "visitor",
				onSend: mockOnSend,
			});
			chat.receiveMessage("admin", "welcome!");
			chat.inputValue = "thanks!";
			await chat.send();

			const [, messagesArg] = mockOnSend.mock.calls[0];
			expect(messagesArg.length).toBe(2); // welcome + thanks
		});
	});
});

// ============================================================================
// Integration: Full Chat Flows
// ============================================================================

describe("integration: AI chat flow (Fireside pattern)", () => {
	it("should handle a multi-turn conversation", async () => {
		const responses = [
			{ content: "What would you like to write about?" },
			{ content: "That sounds like a great topic!" },
			{ content: "Here's a draft for you", metadata: { canDraft: true } },
		];
		let callCount = 0;
		const onSend = vi.fn(async () => responses[callCount++]);

		const chat = createAIChatController({
			aiRole: "wisp",
			onSend,
		});

		// Turn 1
		chat.inputValue = "I want to write something";
		await chat.send();
		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[1].content).toBe("What would you like to write about?");

		// Turn 2
		chat.inputValue = "About my garden";
		await chat.send();
		expect(chat.messages).toHaveLength(4);
		expect(chat.messages[3].content).toBe("That sounds like a great topic!");

		// Turn 3 — with metadata
		chat.inputValue = "Can you draft it?";
		await chat.send();
		expect(chat.messages).toHaveLength(6);
		expect(chat.messages[5].metadata?.canDraft).toBe(true);

		// Verify all turns passed growing history
		expect(onSend).toHaveBeenCalledTimes(3);
		const [, historyOnThirdCall] = onSend.mock.calls[2];
		expect(historyOnThirdCall.length).toBe(5); // 4 previous + the new user msg
	});

	it("should recover from error and continue conversation", async () => {
		const onSend = vi
			.fn()
			.mockRejectedValueOnce(new Error("AI unavailable"))
			.mockResolvedValueOnce({ content: "Sorry about that! I'm back." });

		const chat = createAIChatController({ aiRole: "wisp", onSend });

		// First attempt fails
		chat.inputValue = "hello";
		await chat.send();
		expect(chat.error).toBe("AI unavailable");
		expect(chat.messages).toHaveLength(1); // user message kept

		// Retry succeeds
		chat.inputValue = "hello again";
		await chat.send();
		expect(chat.error).toBeNull();
		expect(chat.messages).toHaveLength(3); // 2 user + 1 AI
		expect(chat.messages[2].content).toBe("Sorry about that! I'm back.");
	});
});

describe("integration: Reverie change-preview pattern", () => {
	it("should manage change preview → apply lifecycle via metadata", async () => {
		const onSend = vi.fn().mockResolvedValue({
			content: "I'll make your site feel cozy",
			metadata: {
				type: "change-preview",
				requestId: "req-42",
				changes: [
					{ domain: "theme", field: "accent", from: "#333", to: "#8b5cf6" },
					{ domain: "theme", field: "font", from: "Inter", to: "Lora" },
				],
				applied: false,
			},
		});

		const chat = createAIChatController({
			aiRole: "reverie",
			onSend,
		});

		// User sends request
		chat.inputValue = "make my site feel cozy";
		await chat.send();

		const previewMsg = chat.messages[1];
		expect(previewMsg.metadata?.type).toBe("change-preview");
		expect(previewMsg.metadata?.applied).toBe(false);

		// Consumer marks as applied via updateMessageMetadata
		chat.updateMessageMetadata(previewMsg.id, { applied: true });

		expect(chat.messages[1].metadata?.applied).toBe(true);
		expect(chat.messages[1].metadata?.requestId).toBe("req-42"); // preserved
		expect(chat.messages[1].metadata?.changes).toHaveLength(2); // preserved

		// Consumer adds result message
		chat.addMessage("reverie", "Applied 2 changes.", {
			metadata: { type: "execution-result", appliedCount: 2, failedCount: 0 },
		});

		expect(chat.messages).toHaveLength(3);
		expect(chat.messages[2].metadata?.type).toBe("execution-result");
	});
});

describe("integration: conversational chat flow (Porch pattern)", () => {
	it("should handle visitor → admin exchange with delivery tracking", async () => {
		const onSend = vi.fn().mockResolvedValue(undefined);

		const chat = createConversationalChatController({
			localRole: "visitor",
			onSend,
		});

		// Visitor sends a message
		chat.inputValue = "Hi, I have a billing question";
		await chat.send();

		expect(chat.messages).toHaveLength(1);
		expect(chat.messages[0].status).toBe("sent"); // auto-marked by send()

		// Simulate delivery confirmation
		chat.markDelivered(chat.messages[0].id);
		expect(chat.messages[0].status).toBe("delivered");

		// Admin replies (received via polling/websocket)
		chat.receiveMessage("autumn", "Hey! Happy to help with billing.", {
			sender: { id: "admin-1", name: "Autumn" },
		});

		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[1].role).toBe("autumn");
		expect(chat.messages[1].sender?.name).toBe("Autumn");

		// Admin read receipt
		chat.markRead(chat.messages[0].id);
		expect(chat.messages[0].status).toBe("read");
	});

	it("should handle send failure with failed status and error recovery", async () => {
		const onSend = vi
			.fn()
			.mockRejectedValueOnce(new Error("connection lost"))
			.mockResolvedValueOnce(undefined);

		const chat = createConversationalChatController({
			localRole: "visitor",
			onSend,
		});

		// First send fails
		chat.inputValue = "hello";
		await chat.send();

		expect(chat.messages[0].status).toBe("failed");
		expect(chat.error).toBe("connection lost");

		// Retry — new message succeeds
		chat.inputValue = "hello again";
		await chat.send();

		expect(chat.error).toBeNull();
		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[0].status).toBe("failed"); // old one stays failed
		expect(chat.messages[1].status).toBe("sent"); // new one succeeded
	});

	it("should sync server messages over local state", () => {
		const chat = createConversationalChatController({
			localRole: "visitor",
			initialMessages: [createChatMessage("visitor", "optimistic message")],
		});

		expect(chat.messages).toHaveLength(1);

		// Server returns the canonical message list after invalidateAll()
		const serverMessages = [
			createChatMessage("visitor", "optimistic message"),
			createChatMessage("autumn", "I see your message!"),
		];
		chat.messages = serverMessages;

		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[1].role).toBe("autumn");
	});

	it("should handle typing indicators alongside message flow", async () => {
		const onSend = vi.fn().mockResolvedValue(undefined);

		const chat = createConversationalChatController({
			localRole: "visitor",
			onSend,
		});

		// Remote starts typing
		chat.setRemoteTyping("autumn");
		expect(chat.remoteTyping).toBe("autumn");

		// Remote finishes typing and sends
		chat.receiveMessage("autumn", "Hello, welcome to the porch!");
		expect(chat.remoteTyping).toBeNull(); // auto-cleared

		// Visitor replies
		chat.inputValue = "Thank you!";
		await chat.send();

		expect(chat.messages).toHaveLength(2);
		expect(chat.messages[0].content).toBe("Hello, welcome to the porch!");
		expect(chat.messages[1].content).toBe("Thank you!");
		expect(chat.messages[1].status).toBe("sent");
	});
});

describe("integration: read-only chat (Porch Admin pattern)", () => {
	it("should display server-loaded messages without input", () => {
		const serverMessages = [
			createChatMessage("visitor", "I need help with my account"),
			createChatMessage("autumn", "Sure, what's going on?"),
			createChatMessage("visitor", "I can't change my email"),
		];

		const chat = createChatController(serverMessages);

		expect(chat.messages).toHaveLength(3);
		expect(chat.messages[0].role).toBe("visitor");
		expect(chat.messages[2].content).toBe("I can't change my email");

		// Admin can still use metadata for internal notes
		chat.updateMessageMetadata(chat.messages[0].id, {
			adminNote: "check account settings",
		});
		expect(chat.messages[0].metadata?.adminNote).toBe("check account settings");
	});
});

// ============================================================================
// extractErrorCode
// ============================================================================

describe("extractErrorCode", () => {
	it("should extract Signpost error_code", () => {
		expect(extractErrorCode({ error_code: "REV-001" })).toBe("REV-001");
	});

	it("should extract Reverie-style code", () => {
		expect(extractErrorCode({ code: "GROVE-API-010" })).toBe("GROVE-API-010");
	});

	it("should prefer error_code over code when both present", () => {
		expect(extractErrorCode({ error_code: "SIG-001", code: "REV-001" })).toBe("SIG-001");
	});

	it("should return null for plain Error instances", () => {
		expect(extractErrorCode(new Error("boom"))).toBeNull();
	});

	it("should return null for non-object values", () => {
		expect(extractErrorCode("string error")).toBeNull();
		expect(extractErrorCode(null)).toBeNull();
		expect(extractErrorCode(undefined)).toBeNull();
		expect(extractErrorCode(42)).toBeNull();
	});

	it("should return null for numeric codes", () => {
		expect(extractErrorCode({ code: 500 })).toBeNull();
	});
});

// ============================================================================
// resolveErrorMessage
// ============================================================================

describe("resolveErrorMessage", () => {
	it("should use onError callback when provided", () => {
		const result = resolveErrorMessage(new Error("raw"), {
			onError: () => "Custom message",
			errorMessages: { "REV-001": "should not reach" },
		});
		expect(result).toBe("Custom message");
	});

	it("should look up error code in errorMessages map", () => {
		const result = resolveErrorMessage(
			{ error_code: "REV-006" },
			{
				errorMessages: {
					"REV-006": "No settings found. Try being more specific.",
				},
			},
		);
		expect(result).toBe("No settings found. Try being more specific.");
	});

	it("should fall back to Error.message when no code matches", () => {
		const result = resolveErrorMessage(new Error("network timeout"), {
			errorMessages: { "REV-001": "auth required" },
		});
		expect(result).toBe("network timeout");
	});

	it("should fall back to defaultError for unknown thrown values", () => {
		const result = resolveErrorMessage("just a string", {
			defaultError: "Something went wrong",
		});
		expect(result).toBe("Something went wrong");
	});

	it("should use built-in fallback when no options match", () => {
		expect(resolveErrorMessage(42, {})).toBe("Something went wrong");
	});

	it("should skip errorMessages when code is not in the map", () => {
		const result = resolveErrorMessage(
			{ code: "UNKNOWN-999" },
			{
				errorMessages: { "REV-001": "auth required" },
				defaultError: "Fallback",
			},
		);
		expect(result).toBe("Fallback");
	});
});

// ============================================================================
// retractMessage
// ============================================================================

describe("retractMessage", () => {
	it("should mark a message as retracted in base controller", () => {
		const chat = createChatController();
		const id = chat.addMessage("user", "oops I said too much");

		chat.retractMessage(id);

		expect(chat.messages[0].status).toBe("retracted");
		expect(chat.messages[0].content).toBe("oops I said too much"); // content preserved
	});

	it("should be forwarded through AI controller", async () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockResolvedValue({ content: "reply" }),
		});
		chat.inputValue = "test";
		await chat.send();

		const userMsgId = chat.messages[0].id;
		chat.retractMessage(userMsgId);

		expect(chat.messages[0].status).toBe("retracted");
	});

	it("should be forwarded through conversational controller", () => {
		const chat = createConversationalChatController({ localRole: "me" });
		const id = chat.addLocalMessage("regretful message");

		chat.retractMessage(id);

		expect(chat.messages[0].status).toBe("retracted");
	});
});

// ============================================================================
// sessionId
// ============================================================================

describe("sessionId", () => {
	it("should auto-generate a session ID for AI controller", () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockResolvedValue({ content: "ok" }),
		});

		expect(chat.sessionId).toBeDefined();
		expect(chat.sessionId.length).toBeGreaterThan(0);
	});

	it("should accept a custom session ID for AI controller", () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockResolvedValue({ content: "ok" }),
			sessionId: "custom-session-abc",
		});

		expect(chat.sessionId).toBe("custom-session-abc");
	});

	it("should allow updating session ID for AI controller", () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockResolvedValue({ content: "ok" }),
		});

		const original = chat.sessionId;
		chat.sessionId = "new-session-xyz";

		expect(chat.sessionId).toBe("new-session-xyz");
		expect(chat.sessionId).not.toBe(original);
	});

	it("should auto-generate a session ID for conversational controller", () => {
		const chat = createConversationalChatController({ localRole: "me" });

		expect(chat.sessionId).toBeDefined();
		expect(chat.sessionId.length).toBeGreaterThan(0);
	});

	it("should accept a custom session ID for conversational controller", () => {
		const chat = createConversationalChatController({
			localRole: "me",
			sessionId: "porch-session-42",
		});

		expect(chat.sessionId).toBe("porch-session-42");
	});

	it("should allow updating session ID for conversational controller", () => {
		const chat = createConversationalChatController({ localRole: "me" });

		chat.sessionId = "updated-session";
		expect(chat.sessionId).toBe("updated-session");
	});
});

// ============================================================================
// errorMessages option
// ============================================================================

describe("errorMessages option", () => {
	it("should map Signpost error codes to friendly messages in AI controller", async () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockRejectedValue({ error_code: "REV-012" }),
			errorMessages: {
				"REV-012": "AI is temporarily unavailable. Try again soon.",
			},
		});

		chat.inputValue = "make it cozy";
		await chat.send();

		expect(chat.error).toBe("AI is temporarily unavailable. Try again soon.");
	});

	it("should fall back to defaultError in AI controller when code is unknown", async () => {
		const chat = createAIChatController({
			onSend: vi.fn().mockRejectedValue({ error_code: "UNKNOWN-999" }),
			errorMessages: { "REV-001": "auth required" },
			defaultError: "Reverie couldn't process that.",
		});

		chat.inputValue = "test";
		await chat.send();

		expect(chat.error).toBe("Reverie couldn't process that.");
	});

	it("should map error codes to friendly messages in conversational controller", async () => {
		const chat = createConversationalChatController({
			localRole: "visitor",
			onSend: vi.fn().mockRejectedValue({ error_code: "GROVE-API-020" }),
			errorMessages: {
				"GROVE-API-020": "You need to sign in first.",
			},
		});

		chat.inputValue = "hello";
		await chat.send();

		expect(chat.error).toBe("You need to sign in first.");
		expect(chat.messages[0].status).toBe("failed");
	});

	it("should use conversational defaultError when code not in map", async () => {
		const chat = createConversationalChatController({
			localRole: "visitor",
			onSend: vi.fn().mockRejectedValue({ code: "UNKNOWN" }),
			errorMessages: {},
			defaultError: "Couldn't send your message.",
		});

		chat.inputValue = "hello";
		await chat.send();

		expect(chat.error).toBe("Couldn't send your message.");
	});
});

// ============================================================================
// Integration: Reverie error code mapping end-to-end
// ============================================================================

describe("integration: Reverie error code mapping", () => {
	it("should resolve known Reverie error codes through the full pipeline", async () => {
		const REVERIE_ERRORS: Record<string, string> = {
			"REV-001": "You need to be signed in to use Reverie.",
			"REV-004": "Reverie didn't understand that. Try rephrasing?",
			"REV-011": "You're sending too quickly. Take a breath.",
			"REV-012": "Reverie's AI is temporarily unavailable.",
		};

		const chat = createAIChatController({
			aiRole: "reverie",
			onSend: vi.fn().mockRejectedValue({ error_code: "REV-004" }),
			errorMessages: REVERIE_ERRORS,
			defaultError: "Reverie couldn't process that.",
		});

		chat.inputValue = "asdfjkl";
		await chat.send();

		expect(chat.error).toBe("Reverie didn't understand that. Try rephrasing?");
		expect(chat.messages).toHaveLength(1); // user msg kept, no AI msg
		expect(chat.isLoading).toBe(false);
	});

	it("should fall through to defaultError for unknown Reverie codes", async () => {
		const chat = createAIChatController({
			aiRole: "reverie",
			onSend: vi.fn().mockRejectedValue({ error_code: "REV-999" }),
			errorMessages: { "REV-001": "auth required" },
			defaultError: "Reverie couldn't process that.",
		});

		chat.inputValue = "test";
		await chat.send();

		expect(chat.error).toBe("Reverie couldn't process that.");
	});

	it("should handle Reverie change-preview with retract lifecycle", async () => {
		const onSend = vi.fn().mockResolvedValue({
			content: "Here are the changes",
			metadata: { type: "change-preview", requestId: "req-1", applied: false },
		});

		const chat = createAIChatController({
			aiRole: "reverie",
			onSend,
			sessionId: "reverie-session-1",
		});

		chat.inputValue = "make it warm";
		await chat.send();

		// Session tracked
		expect(chat.sessionId).toBe("reverie-session-1");

		// User cancels the preview — retract the suggestion
		const previewId = chat.messages[1].id;
		chat.retractMessage(previewId);

		expect(chat.messages[1].status).toBe("retracted");
		expect(chat.messages[1].metadata?.type).toBe("change-preview"); // metadata preserved
	});
});
