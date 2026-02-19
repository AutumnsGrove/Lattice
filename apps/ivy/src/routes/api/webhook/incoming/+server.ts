/**
 * Incoming Email Webhook
 *
 * Receives incoming emails from Forward Email.
 * POST /api/webhook/incoming
 *
 * Flow:
 * 1. Rate limit check (BEFORE signature verification)
 * 2. Verify webhook signature
 * 3. Write to D1 buffer immediately
 * 4. Return 200 OK
 * 5. Async: Process buffer entry
 */

import { ForwardEmailClient } from "$lib/api/forwardEmail";
import type { RequestHandler } from "./$types";

// Rate limit configuration
const RATE_LIMITS = {
	perIpPerMinute: 60,
	perIpPerHour: 500,
	globalPerMinute: 10000,
};

/**
 * Check webhook rate limits using KV
 * CRITICAL: This runs BEFORE signature verification to prevent DoS
 */
async function checkRateLimit(
	kv: KVNamespace,
	ip: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
	// Hash IP for privacy (don't store raw IPs)
	const ipHash = await hashIp(ip);
	const now = Date.now();
	const minuteKey = `webhook:${ipHash}:${Math.floor(now / 60000)}`;
	const hourKey = `webhook:${ipHash}:${Math.floor(now / 3600000)}`;

	// Get current counts
	const [minuteCount, hourCount] = await Promise.all([
		kv.get(minuteKey).then((v) => parseInt(v || "0")),
		kv.get(hourKey).then((v) => parseInt(v || "0")),
	]);

	// Check limits
	if (minuteCount >= RATE_LIMITS.perIpPerMinute) {
		return { allowed: false, retryAfter: 60 };
	}
	if (hourCount >= RATE_LIMITS.perIpPerHour) {
		return { allowed: false, retryAfter: 3600 };
	}

	// Increment counters
	await Promise.all([
		kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
		kv.put(hourKey, String(hourCount + 1), { expirationTtl: 7200 }),
	]);

	return { allowed: true };
}

/**
 * Hash IP address for privacy
 */
async function hashIp(ip: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(ip + "webhook-salt-ivy-v1");
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Extract user ID from recipient email
 * e.g., "autumn@grove.place" -> "autumn"
 */
function extractUserId(email: string): string | null {
	const match = email.match(/^([^@]+)@grove\.place$/);
	return match ? match[1] : null;
}

/**
 * Generate unique buffer entry ID
 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;

	// Ensure we have required bindings
	if (!env?.KV || !env?.DB || !env?.WEBHOOK_SECRET) {
		console.error("Missing required environment bindings");
		return new Response(JSON.stringify({ error: "Server configuration error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// 1. RATE LIMITING (before signature verification!)
		const ip = request.headers.get("cf-connecting-ip") || "unknown";
		const rateLimitCheck = await checkRateLimit(env.KV, ip);

		if (!rateLimitCheck.allowed) {
			return new Response(
				JSON.stringify({
					error: "Rate limit exceeded",
					retryAfter: rateLimitCheck.retryAfter,
				}),
				{
					status: 429,
					headers: {
						"Content-Type": "application/json",
						"Retry-After": String(rateLimitCheck.retryAfter),
					},
				},
			);
		}

		// 2. GET RAW BODY AND SIGNATURE
		const rawBody = await request.text();
		const signature = request.headers.get("x-webhook-signature");

		if (!signature) {
			return new Response(JSON.stringify({ error: "Missing webhook signature" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 3. VERIFY SIGNATURE
		const isValid = await ForwardEmailClient.verifyWebhookSignature(
			rawBody,
			signature,
			env.WEBHOOK_SECRET,
		);

		if (!isValid) {
			console.error("Invalid webhook signature from IP:", ip);
			return new Response(JSON.stringify({ error: "Invalid signature" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 4. PARSE PAYLOAD
		let payload;
		try {
			payload = JSON.parse(rawBody);
		} catch (error) {
			console.error("Invalid JSON payload:", error);
			return new Response(JSON.stringify({ error: "Invalid JSON" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 5. VALIDATE REQUIRED FIELDS
		if (!payload.recipients || !Array.isArray(payload.recipients)) {
			return new Response(JSON.stringify({ error: "Missing recipients" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 6. EXTRACT USER ID FROM RECIPIENT
		// Find the @grove.place recipient
		const groveRecipient = payload.recipients.find((r: string) => r.endsWith("@grove.place"));

		if (!groveRecipient) {
			console.warn("No @grove.place recipient found in:", payload.recipients);
			return new Response(JSON.stringify({ error: "No grove.place recipient" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const userId = extractUserId(groveRecipient);
		if (!userId) {
			console.error("Could not extract user ID from:", groveRecipient);
			return new Response(JSON.stringify({ error: "Invalid recipient format" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 7. WRITE TO BUFFER IMMEDIATELY (reliability first!)
		const bufferId = generateId();
		const now = new Date().toISOString();

		await env.DB.prepare(
			`INSERT INTO ivy_webhook_buffer
       (id, user_id, raw_payload, webhook_signature, status, retry_count, received_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
		)
			.bind(bufferId, userId, rawBody, signature, now)
			.run();

		// 8. RETURN 200 OK IMMEDIATELY
		// Processing happens async - don't block webhook response
		console.log(`Webhook buffered: ${bufferId} for user ${userId}`);

		// 9. HAND OFF TO TRIAGE DO (non-blocking)
		if (env.TRIAGE) {
			const triageDO = env.TRIAGE;
			const doId = triageDO.idFromName("triage:owner");
			const stub = triageDO.get(doId);
			platform?.context?.waitUntil(
				stub
					.fetch(
						new Request("http://localhost/process", {
							method: "POST",
							body: JSON.stringify({ bufferId }),
						}),
					)
					.catch((err: unknown) => {
						console.error("TriageDO handoff failed:", err);
					}),
			);
		}

		return new Response(JSON.stringify({ success: true, id: bufferId }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Webhook processing error:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
