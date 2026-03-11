/**
 * Chirp WebSocket Connection Manager
 *
 * Creates a reactive WebSocket connection for a single conversation.
 * Handles reconnection with exponential backoff and auto-cleanup.
 *
 * Usage:
 * ```ts
 * const ws = createChatConnection({
 *   conversationId: 'abc-123',
 *   onMessage(msg) { ... },
 * });
 * // ws.send({ type: 'message', ... })
 * // ws.connected — reactive boolean
 * // ws.close() — manual teardown
 * ```
 */

import type { ChatWSClientMessage, ChatWSServerMessage } from "$lib/server/services/chat.types.js";

export interface ChatConnectionOptions {
	conversationId: string;
	onMessage: (msg: ChatWSServerMessage) => void;
	onOpen?: () => void;
	onClose?: () => void;
}

interface ChatConnection {
	send: (msg: ChatWSClientMessage) => void;
	close: () => void;
	readonly connected: boolean;
}

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

export function createChatConnection(options: ChatConnectionOptions): ChatConnection {
	let socket = $state<WebSocket | null>(null);
	let connected = $state(false);
	let backoffMs = INITIAL_BACKOFF_MS;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let intentionallyClosed = false;

	function getWsUrl(): string {
		const protocol = globalThis.location?.protocol === "https:" ? "wss:" : "ws:";
		const host = globalThis.location?.host ?? "localhost";
		return `${protocol}//${host}/api/chat/conversations/${options.conversationId}/ws`;
	}

	function connect() {
		if (intentionallyClosed) return;

		try {
			const ws = new WebSocket(getWsUrl());

			ws.onopen = () => {
				connected = true;
				backoffMs = INITIAL_BACKOFF_MS;
				options.onOpen?.();
			};

			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data as string) as ChatWSServerMessage;
					options.onMessage(msg);
				} catch {
					// Silently ignore malformed messages
				}
			};

			ws.onclose = () => {
				connected = false;
				socket = null;
				options.onClose?.();
				scheduleReconnect();
			};

			ws.onerror = () => {
				// onclose will fire after onerror — reconnect handled there
			};

			socket = ws;
		} catch {
			scheduleReconnect();
		}
	}

	function scheduleReconnect() {
		if (intentionallyClosed) return;
		if (reconnectTimer !== null) return;

		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, backoffMs);

		// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
		backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
	}

	function send(msg: ChatWSClientMessage): void {
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(msg));
		}
	}

	function close(): void {
		intentionallyClosed = true;
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (socket) {
			socket.onclose = null; // prevent reconnect on intentional close
			socket.close();
			socket = null;
		}
		connected = false;
	}

	// Start the initial connection
	connect();

	return {
		send,
		close,
		get connected() {
			return connected;
		},
	};
}
