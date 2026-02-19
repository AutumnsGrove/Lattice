/**
 * Webhook Handler Worker
 *
 * Processes incoming email webhooks from Forward Email.
 * This runs as an async task after the webhook endpoint
 * immediately writes to the buffer and returns 200.
 */

import type { IvyWebhookBuffer, WebhookPayload, DecryptedEnvelope } from "$lib/types";

export interface WebhookHandlerEnv {
	DB: D1Database;
	R2: R2Bucket;
	KV: KVNamespace;
}

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
	maxRetries: 5,
	backoffMs: [60000, 120000, 240000, 480000, 960000], // 1m, 2m, 4m, 8m, 16m
	alertAfterFailures: 3,
};

/**
 * Parse email headers and extract key fields
 */
function parseEmailHeaders(headers: Record<string, string>) {
	const getHeader = (key: string) => headers[key.toLowerCase()] || headers[key] || "";

	return {
		from: getHeader("from"),
		to:
			getHeader("to")
				?.split(",")
				.map((s) => s.trim()) || [],
		cc:
			getHeader("cc")
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean) || [],
		bcc:
			getHeader("bcc")
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean) || [],
		subject: getHeader("subject") || "(No subject)",
		date: getHeader("date") || new Date().toISOString(),
		messageId: getHeader("message-id") || "",
		inReplyTo: getHeader("in-reply-to") || "",
		references: getHeader("references") || "",
	};
}

/**
 * Compute thread ID from email headers (Gmail-style threading)
 */
function computeThreadId(messageId: string, inReplyTo: string, references: string): string {
	// If replying to something, use the original message's ID
	if (inReplyTo) {
		return hashThreadId(inReplyTo);
	}

	// Check references chain for thread root
	if (references) {
		const refs = references.split(/\s+/);
		if (refs.length > 0) {
			return hashThreadId(refs[0]);
		}
	}

	// New conversation - use this message's ID
	return hashThreadId(messageId);
}

/**
 * Hash a message ID to create a consistent thread ID
 */
function hashThreadId(messageId: string): string {
	// Simple hash for now - could use crypto.subtle if needed
	let hash = 0;
	for (let i = 0; i < messageId.length; i++) {
		hash = (hash << 5) - hash + messageId.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Extract text preview from email body
 */
function extractSnippet(text: string, maxLength: number = 150): string {
	// Remove extra whitespace
	const cleaned = text.replace(/\s+/g, " ").trim();

	if (cleaned.length <= maxLength) {
		return cleaned;
	}

	return cleaned.substring(0, maxLength) + "...";
}

/**
 * Parse email body from raw email
 * This is a simplified parser - production would use a proper MIME parser
 */
function parseEmailBody(raw: string): { html: string; text: string } {
	// TODO: Implement proper MIME parsing
	// For now, extract basic text content
	const lines = raw.split("\n");
	let bodyStarted = false;
	const bodyLines: string[] = [];

	for (const line of lines) {
		if (!bodyStarted && line.trim() === "") {
			bodyStarted = true;
			continue;
		}
		if (bodyStarted) {
			bodyLines.push(line);
		}
	}

	const text = bodyLines.join("\n");

	return {
		html: text, // Simplified - would need HTML conversion
		text,
	};
}

/**
 * Generate unique email ID
 */
function generateEmailId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Process a single buffer entry
 */
export async function processWebhookEntry(
	env: WebhookHandlerEnv,
	entry: IvyWebhookBuffer,
): Promise<void> {
	try {
		// 1. PARSE WEBHOOK PAYLOAD
		const payload: WebhookPayload = JSON.parse(entry.raw_payload);

		// 2. PARSE EMAIL HEADERS AND BODY
		const headers = parseEmailHeaders(payload.headers);
		const { html, text } = parseEmailBody(payload.raw);

		// 3. COMPUTE THREAD ID
		const threadId = computeThreadId(headers.messageId, headers.inReplyTo, headers.references);

		// 4. FETCH USER'S ENCRYPTION KEY
		const userSettings = await env.DB.prepare(
			"SELECT encrypted_email_key FROM ivy_settings WHERE user_id = ?",
		)
			.bind(entry.user_id)
			.first<{ encrypted_email_key: string }>();

		if (!userSettings) {
			throw new Error(`User ${entry.user_id} not found or Ivy not activated`);
		}

		// NOTE: In a real implementation, we'd need to decrypt the user's email key
		// using their password-derived wrapper key. For now, we'll need to handle this
		// differently - possibly storing a server-side encryption key or using
		// client-side decryption only.
		//
		// For the MVP, we'll store emails encrypted with a placeholder key
		// and require client-side decryption with the user's actual key.

		// 5. CREATE ENCRYPTED ENVELOPE
		const envelope: DecryptedEnvelope = {
			from: headers.from,
			to: headers.to,
			cc: headers.cc,
			bcc: headers.bcc,
			subject: headers.subject,
			snippet: extractSnippet(text),
			date: headers.date,
			threadId,
			labels: [],
			isRead: false,
			isStarred: false,
		};

		// TODO: Encrypt envelope with user's email key
		// For now, we'll store as JSON (this is NOT zero-knowledge yet!)
		const encryptedEnvelope = JSON.stringify(envelope);

		// 6. PREPARE EMAIL BODY FOR STORAGE
		const emailBody = {
			html,
			text,
			attachments: payload.attachments || [],
		};

		// TODO: Encrypt body with user's email key
		const encryptedBody = JSON.stringify(emailBody);

		// 7. STORE BODY IN R2
		const emailId = generateEmailId();
		const r2Key = `emails/${entry.user_id}/${emailId}.enc`;

		await env.R2.put(r2Key, encryptedBody);

		// 8. STORE ENVELOPE IN D1
		const now = new Date().toISOString();

		await env.DB.prepare(
			`INSERT INTO ivy_emails (id, user_id, encrypted_envelope, r2_content_key, is_draft, created_at)
       VALUES (?, ?, ?, ?, false, ?)`,
		)
			.bind(emailId, entry.user_id, encryptedEnvelope, r2Key, now)
			.run();

		// 9. DELETE FROM BUFFER
		await env.DB.prepare("DELETE FROM ivy_webhook_buffer WHERE id = ?").bind(entry.id).run();

		// 10. PUSH NOTIFICATION TO CLIENT
		// TODO: Implement WebSocket/SSE push notification
		console.log(`✓ Email processed: ${emailId} for user ${entry.user_id}`);
	} catch (error) {
		// Update buffer entry with error
		const errorMessage = error instanceof Error ? error.message : "Unknown error";

		await env.DB.prepare(
			`UPDATE ivy_webhook_buffer
       SET retry_count = retry_count + 1,
           error_message = ?,
           status = 'pending'
       WHERE id = ?`,
		)
			.bind(errorMessage, entry.id)
			.run();

		// If max retries exceeded, move to dead letter
		if (entry.retry_count + 1 >= RETRY_CONFIG.maxRetries) {
			await env.DB.prepare(
				`UPDATE ivy_webhook_buffer
         SET status = 'dead_letter'
         WHERE id = ?`,
			)
				.bind(entry.id)
				.run();

			console.error(
				`✗ Email processing failed after ${RETRY_CONFIG.maxRetries} retries:`,
				errorMessage,
			);
			// TODO: Alert user of failed delivery
		}

		throw error;
	}
}

/**
 * Process all pending buffer entries
 */
export async function processPendingWebhooks(env: WebhookHandlerEnv): Promise<void> {
	// Fetch pending entries
	const { results: entries } = await env.DB.prepare(
		`SELECT * FROM ivy_webhook_buffer
     WHERE status = 'pending'
     ORDER BY received_at ASC
     LIMIT 100`,
	).all<IvyWebhookBuffer>();

	if (!entries || entries.length === 0) {
		console.log("No pending webhooks to process");
		return;
	}

	console.log(`Processing ${entries.length} pending webhooks...`);

	// Process each entry
	const results = await Promise.allSettled(entries.map((entry) => processWebhookEntry(env, entry)));

	// Log results
	const successful = results.filter((r) => r.status === "fulfilled").length;
	const failed = results.filter((r) => r.status === "rejected").length;

	console.log(`✓ Processed: ${successful} successful, ${failed} failed`);
}
