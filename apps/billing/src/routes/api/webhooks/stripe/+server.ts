import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { proxyRawToBillingApi } from "$lib/billing-proxy";

/**
 * Stripe Webhook Endpoint — the public-facing URL configured in Stripe Dashboard.
 *
 * WHY VERIFY HERE AND IN BILLING-API (belt-and-suspenders):
 * This worker is the internet-facing edge. billing-api is internal-only (service
 * binding). Verifying here rejects forged payloads before they cross the service
 * boundary, reducing attack surface on the worker that holds STRIPE_SECRET_KEY
 * and has D1 write access. billing-api re-verifies because defense-in-depth:
 * if this worker's verification has a bug (or someone adds a new route that
 * bypasses it), billing-api still catches it. The cost is two HMAC-SHA256
 * computations (~0.1ms each on Workers) — negligible next to the D1 writes
 * that follow.
 */

/**
 * Constant-time string comparison to prevent timing attacks
 * on webhook signature verification.
 *
 * Pads shorter strings to avoid early-return length leak.
 */
function timingSafeEqual(a: string, b: string): boolean {
	const maxLen = Math.max(a.length, b.length);
	const paddedA = a.padEnd(maxLen, "\0");
	const paddedB = b.padEnd(maxLen, "\0");

	// XOR length difference into result so different lengths still fail
	let result = a.length ^ b.length;
	for (let i = 0; i < maxLen; i++) {
		result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Verify Stripe webhook signature (belt-and-suspenders).
 * Stripe signs with HMAC-SHA256; we verify before proxying.
 */
async function verifyStripeSignature(
	payload: string,
	signatureHeader: string,
	secret: string,
): Promise<boolean> {
	try {
		// Parse the Stripe-Signature header (use indexOf to avoid truncating values with '=')
		const parts = signatureHeader.split(",");
		let timestamp: string | undefined;
		let signature: string | undefined;

		for (const part of parts) {
			const trimmed = part.trim();
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx);
			const value = trimmed.slice(eqIdx + 1);
			if (key === "t") timestamp = value;
			if (key === "v1" && !signature) signature = value;
		}

		if (!timestamp || !signature) return false;

		// Check for replay attacks (reject events older than 5 minutes or from the future)
		const now = Math.floor(Date.now() / 1000);
		const ts = parseInt(timestamp, 10);
		if (isNaN(ts) || now - ts > 300 || ts - now > 60) return false;

		// Compute expected signature
		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			encoder.encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
		const expectedSignature = new Uint8Array(mac).reduce(
			(hex, b) => hex + b.toString(16).padStart(2, "0"),
			"",
		);

		return timingSafeEqual(expectedSignature, signature);
	} catch (err) {
		console.error("[webhook] Signature verification error:", err);
		return false;
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const signatureHeader = request.headers.get("stripe-signature");
	if (!signatureHeader) {
		return json({ error: "Missing stripe-signature header", code: "BILLING-061" }, { status: 401 });
	}

	const secret = platform?.env?.STRIPE_WEBHOOK_SECRET;
	if (!secret) {
		console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
		return json({ error: "Webhook configuration error", code: "BILLING-001" }, { status: 503 });
	}

	// Read raw body once — Request bodies are streams that can only be consumed
	// once. We need the same bytes for signature verification AND for proxying.
	const bodyText = await request.text();

	// Belt-and-suspenders: verify signature at the edge before proxying
	const isValid = await verifyStripeSignature(bodyText, signatureHeader, secret);
	if (!isValid) {
		console.error("[webhook] Invalid Stripe signature");
		return json({ error: "Invalid signature", code: "BILLING-060" }, { status: 401 });
	}

	// Re-encode to bytes for the service binding fetch — we proxy the raw payload
	// so billing-api can re-verify the signature against the exact same bytes.
	const rawBody = new TextEncoder().encode(bodyText);

	// Proxy raw body + signature header to billing-api for processing
	const response = await proxyRawToBillingApi(platform, "/webhook", rawBody.buffer as ArrayBuffer, {
		"Content-Type": "application/json",
		"Stripe-Signature": signatureHeader,
	});

	// Return billing-api's response status
	const responseBody = await response.text();
	return new Response(responseBody, {
		status: response.status,
		headers: { "Content-Type": "application/json" },
	});
};
