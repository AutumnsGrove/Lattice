/**
 * GroveAppClient — Service Binding Wrapper
 *
 * Calls the SvelteKit app (grove-lattice) via Cloudflare service binding.
 * Uses internal service auth headers so SvelteKit trusts the request
 * without requiring a real Heartwood session.
 *
 * Service bindings are in-process calls — they never leave the Cloudflare
 * network and have zero cold-start latency.
 */

import type { Env } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface ApiCall {
	path: string;
	method: "PUT" | "POST";
	payload: unknown;
}

export interface ApiResult {
	success: boolean;
	status: number;
	body?: unknown;
	error?: string;
}

// =============================================================================
// Client
// =============================================================================

export class GroveAppClient {
	constructor(
		private fetcher: Env["GROVE_APP"],
		private internalKey: string,
		private tenantId: string,
	) {}

	/**
	 * Send an API call to the SvelteKit app via service binding.
	 *
	 * The hostname in the URL is arbitrary for service bindings — Cloudflare
	 * routes based on the binding, not DNS. We use a descriptive hostname
	 * for logging clarity.
	 */
	async send(call: ApiCall): Promise<ApiResult> {
		try {
			const response = await this.fetcher.fetch(`https://grove-lattice.internal${call.path}`, {
				method: call.method,
				headers: {
					"Content-Type": "application/json",
					"X-Internal-Service-Key": this.internalKey,
					"X-Tenant-Id": this.tenantId,
				},
				body: JSON.stringify(call.payload),
			});

			if (!response.ok) {
				let errorBody: unknown;
				try {
					errorBody = await response.json();
				} catch {
					errorBody = await response.text().catch(() => "No response body");
				}
				return {
					success: false,
					status: response.status,
					body: errorBody,
					error: `API returned ${response.status}`,
				};
			}

			let body: unknown;
			try {
				body = await response.json();
			} catch {
				body = null;
			}

			return {
				success: true,
				status: response.status,
				body,
			};
		} catch (err) {
			return {
				success: false,
				status: 0,
				error: err instanceof Error ? err.message : "Service binding call failed",
			};
		}
	}
}
