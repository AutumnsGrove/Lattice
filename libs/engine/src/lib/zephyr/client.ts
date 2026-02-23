/**
 * Zephyr Client
 *
 * Client for the Zephyr unified email gateway.
 * Provides a simple API for sending emails through the centralized service.
 *
 * Usage:
 * ```typescript
 * import { zephyr } from '@autumnsgrove/lattice/zephyr';
 *
 * await zephyr.send({
 *   type: 'transactional',
 *   template: 'WelcomeEmail',
 *   to: 'user@example.com',
 *   data: { name: 'Autumn' }
 * });
 * ```
 */

import type {
	ZephyrRequest,
	ZephyrResponse,
	ZephyrConfig,
	BroadcastRequest,
	BroadcastResponse,
} from "./types";

export class ZephyrClient {
	private baseUrl: string;
	private apiKey: string;
	private fetcher?: ZephyrConfig["fetcher"];

	constructor(config: ZephyrConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
		this.apiKey = config.apiKey;
		this.fetcher = config.fetcher;
	}

	/**
	 * Perform a fetch using the service binding if available, falling back to global fetch.
	 * Calls fetch on the binding object directly to preserve `this` context,
	 * avoiding Cloudflare's "Illegal invocation" error.
	 */
	private fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		if (this.fetcher) {
			return this.fetcher.fetch(input, init);
		}
		return fetch(input, init);
	}

	/**
	 * Send an email
	 *
	 * @param request - Email send request
	 * @returns Promise<ZephyrResponse>
	 */
	async send(request: ZephyrRequest): Promise<ZephyrResponse> {
		// Validate request
		const validationError = this.validateRequest(request);
		if (validationError) {
			return {
				success: false,
				errorCode: "INVALID_REQUEST",
				errorMessage: validationError,
			};
		}

		try {
			const response = await this.fetch(`${this.baseUrl}/send`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": this.apiKey,
				},
				body: JSON.stringify(request),
			});

			// Parse response
			const result = (await response.json()) as ZephyrResponse;

			// Handle HTTP errors
			if (!response.ok) {
				return {
					success: false,
					errorCode: result.errorCode || "PROVIDER_ERROR",
					errorMessage: result.errorMessage || `HTTP ${response.status}`,
				};
			}

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				errorCode: "INTERNAL_ERROR",
				errorMessage: `Network error: ${message}`,
			};
		}
	}

	/**
	 * Send a raw email with pre-rendered content
	 */
	async sendRaw(params: {
		to: string;
		subject: string;
		html: string;
		text?: string;
		from?: string;
		fromName?: string;
		replyTo?: string;
		headers?: Record<string, string>;
		tenant?: string;
		type?: EmailType;
		scheduledAt?: string;
		idempotencyKey?: string;
	}): Promise<ZephyrResponse> {
		return this.send({
			type: params.type || "transactional",
			template: "raw",
			to: params.to,
			subject: params.subject,
			html: params.html,
			text: params.text,
			from: params.from,
			fromName: params.fromName,
			replyTo: params.replyTo,
			headers: params.headers,
			tenant: params.tenant,
			scheduledAt: params.scheduledAt,
			idempotencyKey: params.idempotencyKey,
		});
	}

	/**
	 * Broadcast content to social platforms
	 *
	 * @param request - Broadcast request with content and target platforms
	 * @returns Promise<BroadcastResponse>
	 */
	async broadcast(request: BroadcastRequest): Promise<BroadcastResponse> {
		try {
			const response = await this.fetch(`${this.baseUrl}/broadcast`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": this.apiKey,
				},
				body: JSON.stringify(request),
			});

			const result = (await response.json()) as BroadcastResponse;

			if (!response.ok && !result.deliveries) {
				return {
					success: false,
					partial: false,
					deliveries: [],
					summary: { attempted: 0, succeeded: 0, failed: 0 },
					metadata: {
						broadcastId: "",
						latencyMs: 0,
					},
				};
			}

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				partial: false,
				deliveries: [],
				summary: { attempted: 0, succeeded: 0, failed: 0 },
				metadata: {
					broadcastId: "",
					latencyMs: 0,
				},
			};
		}
	}

	/**
	 * Check service health
	 */
	async health(): Promise<{
		status: string;
		templates: string[];
		version: string;
	} | null> {
		try {
			const response = await this.fetch(`${this.baseUrl}/health`);
			if (!response.ok) return null;
			return (await response.json()) as {
				status: string;
				templates: string[];
				version: string;
			};
		} catch {
			return null;
		}
	}

	/**
	 * Validate request before sending
	 */
	private validateRequest(request: ZephyrRequest): string | null {
		if (!request.type) {
			return "Missing required field: type";
		}

		if (!request.template) {
			return "Missing required field: template";
		}

		if (!request.to) {
			return "Missing required field: to";
		}

		if (!this.isValidEmail(request.to)) {
			return `Invalid email address: ${request.to}`;
		}

		if (request.template === "raw" && !request.html && !request.text) {
			return "Raw template requires html or text content";
		}

		if (request.template === "raw" && !request.subject) {
			return "Raw template requires subject";
		}

		return null;
	}

	/**
	 * Basic email validation
	 */
	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}

// Import EmailType for the sendRaw method
type EmailType =
	| "transactional"
	| "notification"
	| "verification"
	| "sequence"
	| "lifecycle"
	| "broadcast";

/**
 * Default Zephyr client instance
 *
 * Uses environment variables:
 * - VITE_ZEPHYR_URL or PUBLIC_ZEPHYR_URL
 * - VITE_ZEPHYR_API_KEY or ZEPHYR_API_KEY
 */
function getEnvVar(name: string): string | undefined {
	if (typeof import.meta !== "undefined" && import.meta.env) {
		return import.meta.env[name];
	}
	if (typeof process !== "undefined" && process.env) {
		return process.env[name];
	}
	return undefined;
}

export const zephyr = new ZephyrClient({
	baseUrl:
		getEnvVar("VITE_ZEPHYR_URL") ||
		getEnvVar("PUBLIC_ZEPHYR_URL") ||
		"https://grove-zephyr.m7jv4v7npb.workers.dev",
	apiKey: getEnvVar("VITE_ZEPHYR_API_KEY") || getEnvVar("ZEPHYR_API_KEY") || "",
});
