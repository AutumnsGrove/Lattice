/**
 * GlassChat Controllers
 *
 * Factory functions that manage chat state and lifecycle, eliminating
 * the boilerplate every consumer repeats. GlassChat stays a pure
 * presentation component — controllers own the state and behavior.
 *
 * Three layers:
 *   createChatMessage()              — pure helper, no state
 *   createChatController()           — base state management ($state)
 *   createAIChatController()         — AI send-and-wait lifecycle
 *   createConversationalChatController() — delivery status, presence, remote messages
 *
 * @example
 * ```svelte
 * <script>
 *   import { createAIChatController } from '$lib/ui/components/ui/glasschat';
 *
 *   const chat = createAIChatController({
 *     aiRole: 'wisp',
 *     onSend: async (message) => {
 *       const data = await api.post('/api/wisp', { message });
 *       return { content: data.reply };
 *     },
 *   });
 * </script>
 *
 * <GlassChat
 *   messages={chat.messages}
 *   isLoading={chat.isLoading}
 *   error={chat.error}
 *   bind:inputValue={chat.inputValue}
 *   onSend={chat.send}
 *   roles={myRoles}
 * />
 * ```
 */

import type { ChatMessageData, ChatMessageStatus } from "./types";

// ============================================================================
// MESSAGE FACTORY
// ============================================================================

/**
 * Create a ChatMessageData object with auto-generated ID and timestamp.
 * Pure function — no state, no runes, testable anywhere.
 */
export function createChatMessage(
	role: string,
	content: string,
	extras?: Partial<Pick<ChatMessageData, "metadata" | "status" | "sender">>,
): ChatMessageData {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		timestamp: new Date().toISOString(),
		...extras,
	};
}

// ============================================================================
// BASE CONTROLLER
// ============================================================================

/**
 * Create a base chat controller that manages messages, loading, and error state.
 * Foundation for both AI and conversational controllers.
 */
export function createChatController(initialMessages: ChatMessageData[] = []) {
	let messages = $state<ChatMessageData[]>(initialMessages);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	function addMessage(
		role: string,
		content: string,
		extras?: Partial<Pick<ChatMessageData, "metadata" | "status" | "sender">>,
	): string {
		const msg = createChatMessage(role, content, extras);
		messages = [...messages, msg];
		return msg.id;
	}

	function updateMessage(id: string, updates: Partial<ChatMessageData>): void {
		messages = messages.map((m) => (m.id === id ? { ...m, ...updates } : m));
	}

	function removeMessage(id: string): void {
		messages = messages.filter((m) => m.id !== id);
	}

	/** Merge updates into a message's metadata without replacing the whole object. */
	function updateMessageMetadata(id: string, metadataUpdates: Record<string, unknown>): void {
		messages = messages.map((m) =>
			m.id === id ? { ...m, metadata: { ...m.metadata, ...metadataUpdates } } : m,
		);
	}

	function clear(): void {
		messages = [];
		error = null;
	}

	return {
		get messages() {
			return messages;
		},
		set messages(v: ChatMessageData[]) {
			messages = v;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		addMessage,
		updateMessage,
		updateMessageMetadata,
		removeMessage,
		clear,
		setLoading(value: boolean) {
			isLoading = value;
		},
		setError(value: string | null) {
			error = value;
		},
	};
}

/** Type of the object returned by createChatController. */
export type ChatController = ReturnType<typeof createChatController>;

// ============================================================================
// AI CONTROLLER
// ============================================================================

/** Response shape that the onSend callback must return. */
export interface AIChatResponse {
	/** The AI's reply text */
	content: string;
	/** Optional metadata to attach to the AI message */
	metadata?: Record<string, unknown>;
}

/** Options for createAIChatController. */
export interface AIChatControllerOptions {
	/** Role string for user messages (default: "user") */
	userRole?: string;
	/** Role string for AI responses (default: "assistant") */
	aiRole?: string;
	/** Send the user's message and return the AI's response */
	onSend: (message: string, messages: ChatMessageData[]) => Promise<AIChatResponse>;
	/** Transform caught errors into display strings */
	onError?: (error: unknown) => string;
}

/**
 * Create an AI chat controller with the send-and-wait lifecycle.
 *
 * Handles: user message → loading → AI response → done (or error).
 * Guards against double-send while loading.
 */
export function createAIChatController(options: AIChatControllerOptions) {
	const base = createChatController();
	const userRole = options.userRole ?? "user";
	const aiRole = options.aiRole ?? "assistant";

	let inputValue = $state("");

	async function send(): Promise<void> {
		const text = inputValue.trim();
		if (!text || base.isLoading) return;

		inputValue = "";
		base.setError(null);
		base.addMessage(userRole, text);
		base.setLoading(true);

		try {
			const response = await options.onSend(text, base.messages);
			base.addMessage(aiRole, response.content, {
				metadata: response.metadata,
			});
		} catch (err) {
			const message = options.onError
				? options.onError(err)
				: err instanceof Error
					? err.message
					: "Something went wrong";
			base.setError(message);
		} finally {
			base.setLoading(false);
		}
	}

	return {
		// Forward base state via getters (not spread) to preserve reactivity
		get messages() {
			return base.messages;
		},
		set messages(v: ChatMessageData[]) {
			base.messages = v;
		},
		get isLoading() {
			return base.isLoading;
		},
		get error() {
			return base.error;
		},
		addMessage: base.addMessage,
		updateMessage: base.updateMessage,
		updateMessageMetadata: base.updateMessageMetadata,
		removeMessage: base.removeMessage,
		clear: base.clear,
		setLoading: base.setLoading,
		setError: base.setError,
		// AI-specific
		get inputValue() {
			return inputValue;
		},
		set inputValue(v: string) {
			inputValue = v;
		},
		send,
		/** The role string used for user messages */
		userRole,
		/** The role string used for AI responses */
		aiRole,
	};
}

/** Type of the object returned by createAIChatController. */
export type AIChatController = ReturnType<typeof createAIChatController>;

// ============================================================================
// CONVERSATIONAL CONTROLLER
// ============================================================================

/** Options for createConversationalChatController. */
export interface ConversationalChatControllerOptions {
	/** The local user's role string (messages they send) */
	localRole: string;
	/** Initial messages (e.g., loaded from server) */
	initialMessages?: ChatMessageData[];
	/**
	 * Send callback — handles transport (fetch, form action, WebSocket, etc.).
	 * When provided, the controller's send() method handles the full lifecycle:
	 * guard → addLocalMessage("sending") → onSend → markSent (or "failed").
	 * When omitted, the consumer manages sending manually via addLocalMessage + markSent.
	 */
	onSend?: (message: string, messages: ChatMessageData[]) => Promise<void>;
	/** Transform caught errors into display strings */
	onError?: (error: unknown) => string;
}

/**
 * Create a conversational chat controller for user-to-user messaging.
 *
 * Adds delivery status tracking, remote message receiving, and
 * typing presence indicators on top of the base controller.
 */
export function createConversationalChatController(options: ConversationalChatControllerOptions) {
	const base = createChatController(options.initialMessages);

	let inputValue = $state("");
	let remoteTyping = $state<string | null>(null);

	/** Add a message from the local user with "sending" status. */
	function addLocalMessage(
		content: string,
		extras?: Partial<Pick<ChatMessageData, "metadata" | "sender">>,
	): string {
		return base.addMessage(options.localRole, content, {
			status: "sending" as ChatMessageStatus,
			...extras,
		});
	}

	/** Mark a message as sent (acknowledged by server). */
	function markSent(id: string): void {
		base.updateMessage(id, { status: "sent" });
	}

	/** Mark a message as delivered (received by recipient). */
	function markDelivered(id: string): void {
		base.updateMessage(id, { status: "delivered" });
	}

	/** Mark a message as read. */
	function markRead(id: string): void {
		base.updateMessage(id, { status: "read" });
	}

	/** Add a message received from a remote user. Clears typing indicator. */
	function receiveMessage(
		role: string,
		content: string,
		extras?: Partial<Pick<ChatMessageData, "metadata" | "sender" | "status">>,
	): string {
		remoteTyping = null;
		return base.addMessage(role, content, extras);
	}

	/** Set which remote role is currently typing (null = nobody). */
	function setRemoteTyping(role: string | null): void {
		remoteTyping = role;
	}

	/**
	 * Send the current input as a local message with full lifecycle management.
	 * Requires onSend callback in options. Guards against empty input and double-send.
	 *
	 * Flow: guard → addLocalMessage("sending") → onSend() → markSent (or "failed" + error).
	 */
	async function send(): Promise<void> {
		const text = inputValue.trim();
		if (!text || base.isLoading || !options.onSend) return;

		inputValue = "";
		base.setError(null);
		const id = addLocalMessage(text);
		base.setLoading(true);

		try {
			await options.onSend(text, base.messages);
			markSent(id);
		} catch (err) {
			base.updateMessage(id, { status: "failed" as ChatMessageStatus });
			const message = options.onError
				? options.onError(err)
				: err instanceof Error
					? err.message
					: "Failed to send";
			base.setError(message);
		} finally {
			base.setLoading(false);
		}
	}

	return {
		// Forward base state via getters to preserve reactivity
		get messages() {
			return base.messages;
		},
		set messages(v: ChatMessageData[]) {
			base.messages = v;
		},
		get isLoading() {
			return base.isLoading;
		},
		get error() {
			return base.error;
		},
		addMessage: base.addMessage,
		updateMessage: base.updateMessage,
		updateMessageMetadata: base.updateMessageMetadata,
		removeMessage: base.removeMessage,
		clear: base.clear,
		setLoading: base.setLoading,
		setError: base.setError,
		// Conversational-specific
		get inputValue() {
			return inputValue;
		},
		set inputValue(v: string) {
			inputValue = v;
		},
		get remoteTyping() {
			return remoteTyping;
		},
		localRole: options.localRole,
		addLocalMessage,
		send,
		markSent,
		markDelivered,
		markRead,
		receiveMessage,
		setRemoteTyping,
	};
}

/** Type of the object returned by createConversationalChatController. */
export type ConversationalChatController = ReturnType<typeof createConversationalChatController>;
