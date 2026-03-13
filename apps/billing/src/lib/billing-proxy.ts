/**
 * Billing API Proxy — Service binding proxy to grove-billing-api
 *
 * Mirrors the login hub's proxy.ts pattern. All billing logic lives in the
 * Hono backend worker; this SvelteKit app is a UI + proxy layer only.
 *
 * The billing-api worker is never exposed to the public internet.
 * All requests flow through this proxy via Cloudflare service bindings.
 */

import { buildErrorJson } from "@autumnsgrove/lattice/errors";
import { BILLING_ERRORS } from "$lib/errors";

/**
 * Proxy a request to the billing-api worker via service binding.
 *
 * @param platform - SvelteKit platform (contains service bindings)
 * @param path - API path (e.g., "/checkout", "/status/tenant-123")
 * @param options - Request options (method, body, headers)
 */
export async function proxyToBillingApi(
	platform: App.Platform | undefined,
	path: string,
	options: {
		method?: string;
		body?: unknown;
		headers?: Record<string, string>;
	} = {},
): Promise<Response> {
	if (!platform?.env?.BILLING_API) {
		return new Response(JSON.stringify(buildErrorJson(BILLING_ERRORS.SERVICE_UNAVAILABLE)), {
			status: 503,
			headers: { "Content-Type": "application/json" },
		});
	}

	const url = `https://billing-api.internal${path}`;
	const method = options.method || "GET";

	const requestHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		...options.headers,
	};

	const fetchOptions: RequestInit = {
		method,
		headers: requestHeaders,
	};

	// Only attach body for non-GET/HEAD requests
	if (!["GET", "HEAD"].includes(method) && options.body !== undefined) {
		fetchOptions.body = JSON.stringify(options.body);
	}

	try {
		return await platform.env.BILLING_API.fetch(url, fetchOptions);
	} catch (err) {
		console.error("[billing-proxy] Service binding fetch failed:", err);
		return new Response(JSON.stringify(buildErrorJson(BILLING_ERRORS.SERVICE_UNAVAILABLE)), {
			status: 503,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * Proxy a raw request body to billing-api (for webhooks).
 * Preserves the original body and headers without JSON serialization.
 */
export async function proxyRawToBillingApi(
	platform: App.Platform | undefined,
	path: string,
	body: ArrayBuffer,
	headers: Record<string, string>,
): Promise<Response> {
	if (!platform?.env?.BILLING_API) {
		return new Response(JSON.stringify(buildErrorJson(BILLING_ERRORS.SERVICE_UNAVAILABLE)), {
			status: 503,
			headers: { "Content-Type": "application/json" },
		});
	}

	const url = `https://billing-api.internal${path}`;

	try {
		return await platform.env.BILLING_API.fetch(url, {
			method: "POST",
			headers,
			body,
		});
	} catch (err) {
		console.error("[billing-proxy] Raw proxy failed:", err);
		return new Response(JSON.stringify(buildErrorJson(BILLING_ERRORS.SERVICE_UNAVAILABLE)), {
			status: 503,
			headers: { "Content-Type": "application/json" },
		});
	}
}
