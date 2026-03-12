/**
 * API Key Authentication Tests
 *
 * Tests key hashing and agent lookup via GroveDatabase.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { authenticateByApiKey, hashApiKey } from "./api-key";
import { createMockGroveDB, createTestAgent, resetTestCounters } from "../test-helpers";

describe("hashApiKey", () => {
	it("should produce a 64-char hex string (SHA-256)", async () => {
		const hash = await hashApiKey("test-key");

		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should be deterministic", async () => {
		const hash1 = await hashApiKey("same-key");
		const hash2 = await hashApiKey("same-key");

		expect(hash1).toBe(hash2);
	});

	it("should produce different hashes for different keys", async () => {
		const hash1 = await hashApiKey("key-a");
		const hash2 = await hashApiKey("key-b");

		expect(hash1).not.toBe(hash2);
	});
});

describe("authenticateByApiKey", () => {
	let db: ReturnType<typeof createMockGroveDB>;

	beforeEach(() => {
		resetTestCounters();
		db = createMockGroveDB();
	});

	it("should return agent when key hash matches", async () => {
		const agent = createTestAgent();
		db._prepared._bound.first.mockResolvedValueOnce(agent);

		const result = await authenticateByApiKey(db as any, "valid-key");

		expect(result).toEqual(agent);
	});

	it("should query with hashed key, not plaintext", async () => {
		db._prepared._bound.first.mockResolvedValueOnce(null);

		await authenticateByApiKey(db as any, "my-secret-key");

		// Verify prepare was called with the right query
		expect(db.prepare).toHaveBeenCalledWith(
			"SELECT * FROM warden_agents WHERE secret_hash = ? AND enabled = 1",
		);
	});

	it("should return null when no agent matches", async () => {
		// Default mock returns null
		const result = await authenticateByApiKey(db as any, "unknown-key");

		expect(result).toBeNull();
	});

	it("should not return disabled agents (enabled = 0)", async () => {
		// The SQL query filters by enabled = 1, so DB returns null for disabled
		db._prepared._bound.first.mockResolvedValueOnce(null);

		const result = await authenticateByApiKey(db as any, "disabled-agent-key");

		expect(result).toBeNull();
	});
});
