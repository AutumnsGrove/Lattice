import { timingSafeEqual } from "@autumnsgrove/lattice/utils";

/**
 * HMAC-SHA256 Signature Verification
 *
 * Uses Web Crypto API (native to Workers) for constant-time comparison.
 * The agent signs: HMAC(secret, nonce) and sends the hex signature.
 */

/** Verify an HMAC-SHA256 signature against the agent's secret hash */
export async function verifySignature(
	secretHash: string,
	nonce: string,
	providedSignature: string,
): Promise<boolean> {
	try {
		const encoder = new TextEncoder();

		// Import the agent's secret as an HMAC key
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secretHash),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);

		// Compute expected signature
		const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(nonce));

		// Convert to hex for comparison
		const expectedHex = Array.from(new Uint8Array(signatureBuffer))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		// Constant-time comparison via Web Crypto
		return timingSafeEqual(expectedHex, providedSignature);
	} catch {
		return false;
	}
}

/** Generate an HMAC-SHA256 signature (used by SDK client) */
export async function generateSignature(secret: string, nonce: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(nonce));
	return Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
