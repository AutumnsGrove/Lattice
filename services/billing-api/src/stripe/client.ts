/**
 * Stripe API Client for Cloudflare Workers
 *
 * A lightweight, fetch-based Stripe client for edge environments.
 * Adapted from libs/engine/src/lib/payments/stripe/client.ts —
 * simplified to include only what billing-api needs (no Connect methods).
 */

import type {
	StripeCheckoutSession,
	StripeBillingPortalSession,
	StripeSubscription,
	StripeCustomer,
	StripeError,
	StripeListResponse,
} from "./types.js";

const STRIPE_API_VERSION = "2024-11-20.acacia";
const STRIPE_API_BASE = "https://api.stripe.com/v1";

// =============================================================================
// ERROR CLASS
// =============================================================================

export class StripeAPIError extends Error {
	public readonly type: string;
	public readonly stripeCode?: string;
	public readonly param?: string;
	public readonly statusCode: number;

	constructor(error: StripeError, statusCode: number) {
		super(error.message);
		this.name = "StripeAPIError";
		this.type = error.type;
		this.stripeCode = error.code;
		this.param = error.param;
		this.statusCode = statusCode;
	}
}

// =============================================================================
// CLIENT
// =============================================================================

export class StripeClient {
	private readonly secretKey: string;
	private readonly apiVersion: string;

	constructor(secretKey: string, apiVersion?: string) {
		this.secretKey = secretKey;
		this.apiVersion = apiVersion || STRIPE_API_VERSION;
	}

	// ===========================================================================
	// GENERIC REQUEST
	// ===========================================================================

	/**
	 * Make a request to the Stripe API
	 */
	async request<T>(
		endpoint: string,
		options: {
			method?: "GET" | "POST" | "DELETE";
			params?: Record<string, unknown>;
			idempotencyKey?: string;
		} = {},
	): Promise<T> {
		const { method = "GET", params, idempotencyKey } = options;

		const url = new URL(`${STRIPE_API_BASE}/${endpoint}`);

		// For GET requests, append params as query string
		if (method === "GET" && params) {
			this.appendSearchParams(url.searchParams, params);
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.secretKey}`,
			"Stripe-Version": this.apiVersion,
		};

		// For POST requests, encode params as form data
		let body: string | undefined;
		if (method === "POST" && params) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
			body = this.encodeParams(params);
		}

		if (idempotencyKey) {
			headers["Idempotency-Key"] = idempotencyKey;
		}

		const response = await fetch(url.toString(), {
			method,
			headers,
			body,
		});

		const data = (await response.json()) as { error?: StripeError };

		if (!response.ok) {
			throw new StripeAPIError(
				data.error || { type: "api_error", message: "Unknown error" },
				response.status,
			);
		}

		return data as T;
	}

	// ===========================================================================
	// CHECKOUT
	// ===========================================================================

	/**
	 * Create a Stripe Checkout Session for subscription signup
	 */
	async createCheckoutSession(params: {
		priceId: string;
		customerEmail?: string;
		customerId?: string;
		successUrl: string;
		cancelUrl: string;
		metadata?: Record<string, string>;
		subscriptionMetadata?: Record<string, string>;
	}): Promise<StripeCheckoutSession> {
		const requestParams: Record<string, unknown> = {
			mode: "subscription",
			"line_items[0][price]": params.priceId,
			"line_items[0][quantity]": "1",
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			"automatic_tax[enabled]": "true",
			billing_address_collection: "required",
			allow_promotion_codes: "true",
		};

		if (params.customerId) {
			requestParams.customer = params.customerId;
		} else if (params.customerEmail) {
			requestParams.customer_email = params.customerEmail;
		}

		// Checkout session metadata
		if (params.metadata) {
			for (const [key, value] of Object.entries(params.metadata)) {
				requestParams[`metadata[${key}]`] = value;
			}
		}

		// Subscription metadata (survives beyond checkout)
		if (params.subscriptionMetadata) {
			for (const [key, value] of Object.entries(params.subscriptionMetadata)) {
				requestParams[`subscription_data[metadata][${key}]`] = value;
			}
		}

		return this.request<StripeCheckoutSession>("checkout/sessions", {
			method: "POST",
			params: requestParams,
		});
	}

	// ===========================================================================
	// BILLING PORTAL
	// ===========================================================================

	/**
	 * Create a Stripe Billing Portal session
	 */
	async createBillingPortalSession(
		customerId: string,
		returnUrl: string,
	): Promise<StripeBillingPortalSession> {
		return this.request<StripeBillingPortalSession>("billing_portal/sessions", {
			method: "POST",
			params: {
				customer: customerId,
				return_url: returnUrl,
			},
		});
	}

	// ===========================================================================
	// SUBSCRIPTIONS
	// ===========================================================================

	/**
	 * Get a subscription by ID
	 */
	async getSubscription(subscriptionId: string): Promise<StripeSubscription> {
		return this.request<StripeSubscription>(`subscriptions/${subscriptionId}`);
	}

	/**
	 * Cancel a subscription (at period end or immediately)
	 */
	async cancelSubscription(
		subscriptionId: string,
		immediately = false,
	): Promise<StripeSubscription> {
		if (immediately) {
			return this.request<StripeSubscription>(`subscriptions/${subscriptionId}`, {
				method: "DELETE",
			});
		}

		return this.request<StripeSubscription>(`subscriptions/${subscriptionId}`, {
			method: "POST",
			params: { cancel_at_period_end: true },
		});
	}

	/**
	 * Resume a subscription (remove cancel_at_period_end)
	 */
	async resumeSubscription(subscriptionId: string): Promise<StripeSubscription> {
		return this.request<StripeSubscription>(`subscriptions/${subscriptionId}`, {
			method: "POST",
			params: { cancel_at_period_end: false },
		});
	}

	// ===========================================================================
	// CUSTOMERS
	// ===========================================================================

	/**
	 * Get a customer by ID
	 */
	async getCustomer(customerId: string): Promise<StripeCustomer> {
		return this.request<StripeCustomer>(`customers/${customerId}`);
	}

	/**
	 * List customers (used by health check)
	 */
	async listCustomers(limit = 1): Promise<StripeListResponse<StripeCustomer>> {
		return this.request<StripeListResponse<StripeCustomer>>("customers", {
			params: { limit },
		});
	}

	// ===========================================================================
	// WEBHOOK VERIFICATION
	// ===========================================================================

	/**
	 * Verify a Stripe webhook signature using HMAC-SHA256.
	 *
	 * Supports secret rotation (multiple v1 signatures).
	 */
	async verifyWebhookSignature(
		payload: string,
		signature: string,
		secret: string,
		tolerance = 300,
	): Promise<{ valid: boolean; event?: unknown; error?: string }> {
		try {
			// Parse the signature header: t=timestamp,v1=signature[,v1=signature2]
			let timestamp: string | undefined;
			const v1Signatures: string[] = [];

			for (const part of signature.split(",")) {
				const eqIdx = part.indexOf("=");
				if (eqIdx === -1) continue;
				const key = part.slice(0, eqIdx).trim();
				const value = part.slice(eqIdx + 1).trim();
				if (key === "t") timestamp = value;
				if (key === "v1") v1Signatures.push(value);
			}

			if (!timestamp || v1Signatures.length === 0) {
				return { valid: false, error: "Invalid signature format" };
			}

			// Check timestamp tolerance (prevent replay attacks)
			const timestampSeconds = parseInt(timestamp, 10);
			const now = Math.floor(Date.now() / 1000);

			if (isNaN(timestampSeconds)) {
				return { valid: false, error: "Invalid timestamp" };
			}

			if (now - timestampSeconds > tolerance) {
				return { valid: false, error: "Webhook timestamp too old" };
			}

			// Reject timestamps from the future (clock skew tolerance: 60s)
			if (timestampSeconds - now > 60) {
				return { valid: false, error: "Webhook timestamp in the future" };
			}

			// Compute expected signature: HMAC-SHA256(secret, timestamp.payload)
			const signedPayload = `${timestamp}.${payload}`;
			const encoder = new TextEncoder();

			const key = await crypto.subtle.importKey(
				"raw",
				encoder.encode(secret),
				{ name: "HMAC", hash: "SHA-256" },
				false,
				["sign"],
			);

			const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));

			const expectedSignature = new Uint8Array(signatureBytes).reduce(
				(hex, b) => hex + b.toString(16).padStart(2, "0"),
				"",
			);

			// Stripe includes multiple v1 signatures when rotating webhook secrets.
			// During a rotation window, the old and new secret both produce valid
			// signatures. We check all of them so deploys don't drop events.
			const matched = v1Signatures.some((v1Sig) => this.secureCompare(expectedSignature, v1Sig));

			if (!matched) {
				return { valid: false, error: "Signature mismatch" };
			}

			const event = JSON.parse(payload);
			return { valid: true, event };
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			return { valid: false, error: `Verification failed: ${errorMsg}` };
		}
	}

	// ===========================================================================
	// PRIVATE HELPERS
	// ===========================================================================

	/**
	 * Constant-time string comparison to prevent timing attacks.
	 *
	 * Why not just `===`? A naive equality check short-circuits on the first
	 * differing byte, leaking how many leading characters matched via response
	 * timing. An attacker can brute-force a webhook signature one character at
	 * a time. This implementation:
	 *
	 * 1. Pads both strings to equal length so the loop always runs the same
	 *    number of iterations regardless of input lengths.
	 * 2. XORs the original lengths into `result` so mismatched lengths still
	 *    fail even though the padded content might match.
	 * 3. OR-accumulates every byte difference — no early return, no branch
	 *    that leaks position information.
	 */
	private secureCompare(a: string, b: string): boolean {
		const maxLen = Math.max(a.length, b.length);
		const paddedA = a.padEnd(maxLen, "\0");
		const paddedB = b.padEnd(maxLen, "\0");

		let result = a.length ^ b.length;
		for (let i = 0; i < maxLen; i++) {
			result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
		}

		return result === 0;
	}

	/**
	 * Encode parameters for application/x-www-form-urlencoded.
	 * Handles nested objects and arrays.
	 */
	private encodeParams(params: Record<string, unknown>, prefix = ""): string {
		const parts: string[] = [];

		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null) continue;

			const fullKey = prefix ? `${prefix}[${key}]` : key;

			if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item === "object" && item !== null) {
						parts.push(this.encodeParams(item as Record<string, unknown>, `${fullKey}[${index}]`));
					} else {
						parts.push(
							`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`,
						);
					}
				});
			} else if (typeof value === "object") {
				parts.push(this.encodeParams(value as Record<string, unknown>, fullKey));
			} else {
				parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
			}
		}

		return parts.filter(Boolean).join("&");
	}

	/**
	 * Append params to URLSearchParams for GET requests
	 */
	private appendSearchParams(
		searchParams: URLSearchParams,
		params: Record<string, unknown>,
		prefix = "",
	): void {
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined || value === null) continue;

			const fullKey = prefix ? `${prefix}[${key}]` : key;

			if (typeof value === "object" && !Array.isArray(value)) {
				this.appendSearchParams(searchParams, value as Record<string, unknown>, fullKey);
			} else {
				searchParams.append(fullKey, String(value));
			}
		}
	}
}
