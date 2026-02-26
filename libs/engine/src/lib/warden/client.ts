/**
 * Warden Client
 *
 * Type-safe client for the Warden API gateway.
 * Supports two auth modes: API key (service binding) and challenge-response (HMAC).
 * Never throws — always returns { success: false, error } on failure.
 *
 * @example
 * ```typescript
 * import { createWardenClient } from '@autumnsgrove/lattice/warden';
 *
 * const warden = createWardenClient(platform.env);
 * const result = await warden.request({
 *   service: 'github',
 *   action: 'list_repos',
 *   params: { owner: 'AutumnsGrove' }
 * });
 * ```
 */

import type {
	WardenConfig,
	WardenRequest,
	WardenResponse,
	WardenHealth,
	WardenService,
} from "./types";
import { signNonce } from "./crypto";
import { WardenGitHub } from "./services/github";
import { WardenTavily } from "./services/tavily";
import { WardenCloudflare } from "./services/cloudflare";
import { WardenExa } from "./services/exa";
import { WardenResend } from "./services/resend";
import { WardenStripe } from "./services/stripe";
import { WardenOpenRouter } from "./services/openrouter";

export class WardenClient {
	private baseUrl: string;
	private apiKey?: string;
	private agent?: { id: string; secret: string };
	private fetcher?: WardenConfig["fetcher"];

	readonly github: WardenGitHub;
	readonly tavily: WardenTavily;
	readonly cloudflare: WardenCloudflare;
	readonly exa: WardenExa;
	readonly resend: WardenResend;
	readonly stripe: WardenStripe;
	readonly openrouter: WardenOpenRouter;

	constructor(config: WardenConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, "");
		this.apiKey = config.apiKey;
		this.agent = config.agent;
		this.fetcher = config.fetcher;

		this.github = new WardenGitHub(this);
		this.tavily = new WardenTavily(this);
		this.cloudflare = new WardenCloudflare(this);
		this.exa = new WardenExa(this);
		this.resend = new WardenResend(this);
		this.stripe = new WardenStripe(this);
		this.openrouter = new WardenOpenRouter(this);
	}

	/**
	 * Send a proxied API request through Warden
	 *
	 * Handles auth automatically: uses API key if available,
	 * falls back to challenge-response (nonce → sign → send).
	 */
	async request<T = unknown>(req: WardenRequest): Promise<WardenResponse<T>> {
		try {
			// API key auth path (simple header)
			if (this.apiKey) {
				return await this.requestWithApiKey<T>(req);
			}

			// Challenge-response auth path
			if (this.agent) {
				return await this.requestWithChallenge<T>(req);
			}

			return {
				success: false,
				error: {
					code: "AUTH_REQUIRED",
					message: "No API key or agent credentials configured",
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: { code: "NETWORK_ERROR", message: `Request failed: ${message}` },
			};
		}
	}

	/** Check Warden service health */
	async health(): Promise<WardenHealth | null> {
		try {
			const doFetch = this.fetcher?.fetch ?? fetch;
			const response = await doFetch(`${this.baseUrl}/health`);
			if (!response.ok) return null;
			return (await response.json()) as WardenHealth;
		} catch {
			return null;
		}
	}

	/**
	 * Resolve a credential for a service via Warden's /resolve endpoint.
	 *
	 * Returns the decrypted credential string and its source, or null on failure.
	 * Never throws — matches the client's existing error contract.
	 */
	async resolve(
		service: WardenService,
		tenantId?: string,
	): Promise<{ credential: string; source: "tenant" | "global" } | null> {
		try {
			if (!this.apiKey) return null;

			const doFetch = this.fetcher?.fetch ?? fetch;
			const response = await doFetch(`${this.baseUrl}/resolve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": this.apiKey,
				},
				body: JSON.stringify({
					service,
					...(tenantId ? { tenant_id: tenantId } : {}),
				}),
			});

			if (!response.ok) return null;

			const result = (await response.json()) as WardenResponse<{
				credential: string;
				source: "tenant" | "global";
			}>;

			if (!result.success || !result.data) return null;
			return result.data;
		} catch {
			return null;
		}
	}

	// ─── Private Methods ────────────────────────────────────────────

	private async requestWithApiKey<T>(req: WardenRequest): Promise<WardenResponse<T>> {
		const doFetch = this.fetcher?.fetch ?? fetch;
		const response = await doFetch(`${this.baseUrl}/request`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.apiKey!,
			},
			body: JSON.stringify({
				service: req.service,
				action: req.action,
				params: req.params,
				tenant_id: req.tenant_id,
			}),
		});

		return (await response.json()) as WardenResponse<T>;
	}

	private async requestWithChallenge<T>(req: WardenRequest): Promise<WardenResponse<T>> {
		const doFetch = this.fetcher?.fetch ?? fetch;

		// Step 1: Request nonce
		const nonceResponse = await doFetch(`${this.baseUrl}/nonce`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentId: this.agent!.id }),
		});

		if (!nonceResponse.ok) {
			const err = (await nonceResponse.json()) as WardenResponse;
			return {
				success: false,
				error: err.error || { code: "NONCE_FAILED", message: "Failed to obtain nonce" },
			};
		}

		const { data } = (await nonceResponse.json()) as { data: { nonce: string } };
		const nonce = data.nonce;

		// Step 2: Sign nonce with agent secret
		const signature = await signNonce(this.agent!.secret, nonce);

		// Step 3: Send authenticated request
		const response = await doFetch(`${this.baseUrl}/request`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				service: req.service,
				action: req.action,
				params: req.params,
				tenant_id: req.tenant_id,
				agent: {
					id: this.agent!.id,
					nonce,
					signature,
				},
			}),
		});

		return (await response.json()) as WardenResponse<T>;
	}
}
