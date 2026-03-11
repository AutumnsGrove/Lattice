import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createChatMessage,
	createChatController,
	createAIChatController,
	createConversationalChatController,
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
});
