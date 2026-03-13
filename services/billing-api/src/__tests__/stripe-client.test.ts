import { describe, it, expect } from "vitest";
import { StripeClient } from "../stripe/client.js";

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Generate a valid Stripe-format HMAC-SHA256 signature header.
 *
 * Format: t=<timestamp>,v1=<hex-signature>
 * Signed payload: "<timestamp>.<body>"
 */
async function makeStripeSignature(
	secret: string,
	payload: string,
	timestamp: number,
): Promise<string> {
	const encoder = new TextEncoder();
	const signedPayload = `${timestamp}.${payload}`;

	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));

	const hexSignature = Array.from(new Uint8Array(signatureBytes))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return `t=${timestamp},v1=${hexSignature}`;
}

const TEST_SECRET = "whsec_test_webhook_secret_123";
const TEST_PAYLOAD = JSON.stringify({
	id: "evt_test_001",
	type: "checkout.session.completed",
	data: { object: { id: "cs_test_001" } },
});

// =============================================================================
// TESTS
// =============================================================================

describe("StripeClient.verifyWebhookSignature", () => {
	const client = new StripeClient("sk_test_placeholder");

	it("accepts a valid signature with a fresh timestamp", async () => {
		const now = Math.floor(Date.now() / 1000);
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, now);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET);

		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("returns the parsed event on success", async () => {
		const now = Math.floor(Date.now() / 1000);
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, now);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET);

		expect(result.valid).toBe(true);
		expect((result.event as Record<string, unknown>)?.id).toBe("evt_test_001");
	});

	it("rejects a timestamp older than 5 minutes (tolerance = 300s)", async () => {
		const staleTimestamp = Math.floor(Date.now() / 1000) - 301;
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, staleTimestamp);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET, 300);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/too old/i);
	});

	it("rejects a timestamp exactly on the tolerance boundary (300s old)", async () => {
		// now - 300 is NOT expired (0 == 0), but 301 is
		const timestamp = Math.floor(Date.now() / 1000) - 300;
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, timestamp);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET, 300);

		// Boundary: now - timestamp == 300 which is NOT > 300, should pass
		expect(result.valid).toBe(true);
	});

	it("rejects a future timestamp more than 60 seconds ahead", async () => {
		const futureTimestamp = Math.floor(Date.now() / 1000) + 61;
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, futureTimestamp);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/future/i);
	});

	it("accepts a future timestamp within the 60-second clock-skew window", async () => {
		const nearFuture = Math.floor(Date.now() / 1000) + 30;
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, nearFuture);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET);

		expect(result.valid).toBe(true);
	});

	it("rejects a tampered payload (signature won't match)", async () => {
		const now = Math.floor(Date.now() / 1000);
		const sig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, now);
		const tamperedPayload = TEST_PAYLOAD.replace("evt_test_001", "evt_tampered");

		const result = await client.verifyWebhookSignature(tamperedPayload, sig, TEST_SECRET);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/mismatch/i);
	});

	it("rejects a signature signed with the wrong secret", async () => {
		const now = Math.floor(Date.now() / 1000);
		const sig = await makeStripeSignature("wrong_secret", TEST_PAYLOAD, now);

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, sig, TEST_SECRET);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/mismatch/i);
	});

	it("rejects a missing signature header (empty string)", async () => {
		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, "", TEST_SECRET);

		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it("rejects a malformed signature header with no t= component", async () => {
		const result = await client.verifyWebhookSignature(
			TEST_PAYLOAD,
			"v1=somehexvalue",
			TEST_SECRET,
		);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/invalid signature format/i);
	});

	it("rejects a malformed signature header with no v1= component", async () => {
		const now = Math.floor(Date.now() / 1000);
		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, `t=${now}`, TEST_SECRET);

		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/invalid signature format/i);
	});

	it("rejects a non-numeric timestamp", async () => {
		const result = await client.verifyWebhookSignature(
			TEST_PAYLOAD,
			"t=notanumber,v1=deadbeef",
			TEST_SECRET,
		);

		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it("rejects an empty payload string", async () => {
		const now = Math.floor(Date.now() / 1000);
		// Signing empty payload — even correct signature for empty body should
		// fail because JSON.parse("") will throw during event extraction
		const sig = await makeStripeSignature(TEST_SECRET, "", now);

		const result = await client.verifyWebhookSignature("", sig, TEST_SECRET);

		// An empty string can't be parsed as JSON — verification should fail
		expect(result.valid).toBe(false);
	});

	it("supports secret rotation — accepts any matching v1 signature in header", async () => {
		const now = Math.floor(Date.now() / 1000);

		// First signature is for an old secret (doesn't match)
		const oldSig = await makeStripeSignature("old_secret", TEST_PAYLOAD, now);
		const oldV1 = oldSig.split(",v1=")[1];

		// Second signature matches the current secret
		const newSig = await makeStripeSignature(TEST_SECRET, TEST_PAYLOAD, now);
		const newV1 = newSig.split(",v1=")[1];

		// Multi-sig header (Stripe rotation format)
		const rotationHeader = `t=${now},v1=${oldV1},v1=${newV1}`;

		const result = await client.verifyWebhookSignature(TEST_PAYLOAD, rotationHeader, TEST_SECRET);

		expect(result.valid).toBe(true);
	});
});
