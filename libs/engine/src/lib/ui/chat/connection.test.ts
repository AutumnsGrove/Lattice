/**
 * Tests for createChatConnection WebSocket manager.
 *
 * TODO: Test implementations deferred — requires WebSocket mocking setup.
 * Coverage targets:
 * - Initial connection establishment
 * - Message send/receive
 * - Reconnect with exponential backoff
 * - Intentional close prevents reconnect
 * - Max backoff ceiling (30s)
 */

import { describe, it } from "vitest";

describe("createChatConnection", () => {
	it.todo("connects to the correct WebSocket URL");
	it.todo("sends JSON-stringified messages");
	it.todo("parses incoming messages and calls onMessage");
	it.todo("reconnects with exponential backoff on close");
	it.todo("resets backoff after successful reconnection");
	it.todo("caps backoff at 30 seconds");
	it.todo("does not reconnect after intentional close");
	it.todo("reports connected state reactively");
});
