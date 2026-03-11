/**
 * ChatDO Tests
 *
 * Tests for the per-conversation Durable Object.
 * @see ChatDO.ts
 */

import { describe, it } from "vitest";

describe("ChatDO", () => {
	describe("WebSocket handling", () => {
		it.todo("should accept WebSocket with tenant tag");
		it.todo("should reject WebSocket without tenantId");
		it.todo("should handle message type and persist to D1");
		it.todo("should send ack to sender and broadcast to others");
		it.todo("should handle typing indicator");
		it.todo("should handle read cursor update");
		it.todo("should reject messages over max length");
		it.todo("should handle invalid message format gracefully");
	});

	describe("REST routes", () => {
		it.todo("should handle POST /send as fallback");
		it.todo("should handle GET /history with pagination");
		it.todo("should handle GET /ws upgrade");
	});
});
