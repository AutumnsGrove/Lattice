/**
 * HMAC-SHA256 Signature Tests
 *
 * Tests signature generation and verification, including
 * round-trip consistency and rejection of invalid signatures.
 */

import { describe, it, expect } from "vitest";
import { verifySignature, generateSignature } from "./signature";

describe("generateSignature", () => {
	it("should produce a hex string", async () => {
		const sig = await generateSignature("my-secret", "my-nonce");

		expect(sig).toBeDefined();
		expect(typeof sig).toBe("string");
		// SHA-256 HMAC = 32 bytes = 64 hex chars
		expect(sig).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should be deterministic for same inputs", async () => {
		const sig1 = await generateSignature("secret", "nonce");
		const sig2 = await generateSignature("secret", "nonce");

		expect(sig1).toBe(sig2);
	});

	it("should produce different signatures for different secrets", async () => {
		const sig1 = await generateSignature("secret-a", "same-nonce");
		const sig2 = await generateSignature("secret-b", "same-nonce");

		expect(sig1).not.toBe(sig2);
	});

	it("should produce different signatures for different nonces", async () => {
		const sig1 = await generateSignature("same-secret", "nonce-a");
		const sig2 = await generateSignature("same-secret", "nonce-b");

		expect(sig1).not.toBe(sig2);
	});
});

describe("verifySignature", () => {
	it("should verify a valid signature round-trip", async () => {
		const secret = "agent-secret-hash-abc123";
		const nonce = "test-nonce-uuid";

		// Generate with the same secret (simulating what the agent does)
		const signature = await generateSignature(secret, nonce);

		// Verify with the stored secret hash (simulating what Warden does)
		const valid = await verifySignature(secret, nonce, signature);

		expect(valid).toBe(true);
	});

	it("should reject signature made with different secret", async () => {
		const nonce = "test-nonce";
		const signature = await generateSignature("wrong-secret", nonce);

		const valid = await verifySignature("correct-secret", nonce, signature);

		expect(valid).toBe(false);
	});

	it("should reject signature for different nonce", async () => {
		const secret = "my-secret";
		const signature = await generateSignature(secret, "nonce-a");

		const valid = await verifySignature(secret, "nonce-b", signature);

		expect(valid).toBe(false);
	});

	it("should reject empty signature", async () => {
		const valid = await verifySignature("secret", "nonce", "");

		expect(valid).toBe(false);
	});

	it("should reject garbage signature", async () => {
		const valid = await verifySignature("secret", "nonce", "not-a-real-signature");

		expect(valid).toBe(false);
	});

	it("should reject truncated signature", async () => {
		const secret = "my-secret";
		const nonce = "my-nonce";
		const signature = await generateSignature(secret, nonce);

		// Truncate the signature
		const valid = await verifySignature(secret, nonce, signature.slice(0, 32));

		expect(valid).toBe(false);
	});

	it("should reject signature with appended data", async () => {
		const secret = "my-secret";
		const nonce = "my-nonce";
		const signature = await generateSignature(secret, nonce);

		const valid = await verifySignature(secret, nonce, signature + "extra");

		expect(valid).toBe(false);
	});
});
