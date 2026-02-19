/**
 * Forward Email API Client
 *
 * Handles communication with Forward Email for SMTP/IMAP operations.
 * https://forwardemail.net/en/email-api
 */

export interface ForwardEmailConfig {
	apiKey: string;
	baseUrl?: string;
}

export interface SendEmailParams {
	from: string;
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	html?: string;
	text?: string;
	attachments?: Array<{
		filename: string;
		content: ArrayBuffer;
		contentType: string;
	}>;
}

export interface WebhookPayload {
	raw: string;
	headers: Record<string, string>;
	recipients: string[];
	attachments?: Array<{
		filename: string;
		content: string; // Base64 encoded
		contentType: string;
	}>;
	dkim?: boolean;
	spf?: boolean;
	dmarc?: boolean;
}

export class ForwardEmailClient {
	private apiKey: string;
	private baseUrl: string;

	constructor(config: ForwardEmailConfig) {
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl ?? "https://api.forwardemail.net/v1";
	}

	/**
	 * Send an email via Forward Email's REST API
	 */
	async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
		// Build the multipart form data
		const formData = new FormData();

		// Basic fields
		formData.append("from", params.from);
		params.to.forEach((recipient) => formData.append("to", recipient));

		if (params.cc) {
			params.cc.forEach((recipient) => formData.append("cc", recipient));
		}

		if (params.bcc) {
			params.bcc.forEach((recipient) => formData.append("bcc", recipient));
		}

		formData.append("subject", params.subject);

		if (params.html) {
			formData.append("html", params.html);
		}

		if (params.text) {
			formData.append("text", params.text);
		}

		// Attachments
		if (params.attachments) {
			for (const attachment of params.attachments) {
				const blob = new Blob([attachment.content], { type: attachment.contentType });
				formData.append("attachments", blob, attachment.filename);
			}
		}

		// Send request
		const response = await fetch(`${this.baseUrl}/messages`, {
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`${this.apiKey}:`)}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Forward Email API error: ${response.status} - ${error}`);
		}

		const result = await response.json();
		return { messageId: result.id || result.messageId };
	}

	/**
	 * Verify webhook signature from Forward Email
	 * Uses HMAC-SHA256 with constant-time comparison to prevent timing attacks
	 *
	 * @param payload - Raw request body as string
	 * @param signature - X-Webhook-Signature header value
	 * @param secret - Webhook secret configured in Forward Email
	 */
	static async verifyWebhookSignature(
		payload: string,
		signature: string,
		secret: string,
	): Promise<boolean> {
		try {
			const encoder = new TextEncoder();

			// Import the secret as HMAC key
			const key = await crypto.subtle.importKey(
				"raw",
				encoder.encode(secret),
				{ name: "HMAC", hash: "SHA-256" },
				false,
				["sign"],
			);

			// Compute HMAC of the payload
			const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

			// Convert to hex string
			const expectedHex = Array.from(new Uint8Array(expectedSig))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");

			// Constant-time comparison to prevent timing attacks
			return timingSafeEqual(signature, expectedHex);
		} catch (error) {
			console.error("Webhook signature verification failed:", error);
			return false;
		}
	}
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by comparing every character regardless of early mismatches
 */
function timingSafeEqual(a: string, b: string): boolean {
	// Length check is NOT constant-time, but that's acceptable here
	// The important part is that we don't short-circuit on character mismatches
	if (a.length !== b.length) {
		return false;
	}

	const encoder = new TextEncoder();
	const aBytes = encoder.encode(a);
	const bBytes = encoder.encode(b);

	let result = 0;
	for (let i = 0; i < aBytes.length; i++) {
		result |= aBytes[i] ^ bBytes[i];
	}

	return result === 0;
}
