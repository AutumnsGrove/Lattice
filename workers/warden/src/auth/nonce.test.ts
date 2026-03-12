/**
 * Nonce Generation & Validation Tests
 *
 * Tests single-use nonce lifecycle: generation, validation,
 * consumption (single-use enforcement), and expired/unknown nonces.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateNonce, validateNonce } from "./nonce";
import { createMockKV } from "../test-helpers";

describe("generateNonce", () => {
	it("should return a UUID string", async () => {
		const kv = createMockKV();
		const nonce = await generateNonce(kv as unknown as KVNamespace, "agent-1");

		expect(nonce).toBeDefined();
		expect(typeof nonce).toBe("string");
		expect(nonce.length).toBeGreaterThan(0);
	});

	it("should store the nonce in KV with correct key pattern", async () => {
		const kv = createMockKV();
		const nonce = await generateNonce(kv as unknown as KVNamespace, "agent-1");

		expect(kv.put).toHaveBeenCalledWith(`nonce:agent-1:${nonce}`, "1", { expirationTtl: 30 });
	});

	it("should generate unique nonces for same agent", async () => {
		const kv = createMockKV();
		const nonce1 = await generateNonce(kv as unknown as KVNamespace, "agent-1");
		const nonce2 = await generateNonce(kv as unknown as KVNamespace, "agent-1");

		expect(nonce1).not.toBe(nonce2);
	});
});

describe("validateNonce", () => {
	let kv: ReturnType<typeof createMockKV>;

	beforeEach(() => {
		kv = createMockKV();
	});

	it("should return true for a valid nonce", async () => {
		// Pre-populate the nonce in KV
		kv.get.mockResolvedValueOnce("1");

		const result = await validateNonce(kv as unknown as KVNamespace, "agent-1", "valid-nonce");

		expect(result).toBe(true);
	});

	it("should delete the nonce after validation (single-use)", async () => {
		kv.get.mockResolvedValueOnce("1");

		await validateNonce(kv as unknown as KVNamespace, "agent-1", "one-time-nonce");

		expect(kv.delete).toHaveBeenCalledWith("nonce:agent-1:one-time-nonce");
	});

	it("should return false for unknown nonce", async () => {
		// KV returns null (nonce doesn't exist)
		const result = await validateNonce(kv as unknown as KVNamespace, "agent-1", "nonexistent");

		expect(result).toBe(false);
	});

	it("should return false for expired nonce (KV returns null after TTL)", async () => {
		// Simulates an expired nonce — KV returns null
		const result = await validateNonce(kv as unknown as KVNamespace, "agent-1", "expired-nonce");

		expect(result).toBe(false);
		expect(kv.delete).not.toHaveBeenCalled();
	});

	it("should not delete nonce when validation fails", async () => {
		await validateNonce(kv as unknown as KVNamespace, "agent-1", "bad-nonce");

		expect(kv.delete).not.toHaveBeenCalled();
	});

	it("should use correct key format", async () => {
		kv.get.mockResolvedValueOnce("1");

		await validateNonce(kv as unknown as KVNamespace, "my-agent", "my-nonce");

		expect(kv.get).toHaveBeenCalledWith("nonce:my-agent:my-nonce");
		expect(kv.delete).toHaveBeenCalledWith("nonce:my-agent:my-nonce");
	});
});
