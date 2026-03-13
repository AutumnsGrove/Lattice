import type { RequestHandler } from "./$types";
import { proxyToBillingApi } from "$lib/billing-proxy";

/**
 * Health check endpoint
 *
 * Proxies to billing-api GET /health to verify the service binding
 * and backend are operational. Used by monitoring and status checks.
 */
export const GET: RequestHandler = async ({ platform }) => {
	const response = await proxyToBillingApi(platform, "/health");

	if (!response.ok) {
		return new Response(
			JSON.stringify({
				status: "unhealthy",
				service: "grove-billing",
				upstream: "grove-billing-api",
				error: "Billing API returned non-200",
			}),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Pass through billing-api's health response
	const data = await response.text();
	return new Response(data, {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
