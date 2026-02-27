/**
 * Device Authorization Proxy — Heartwood Service Binding
 *
 * Proxies /auth/device/* requests to Heartwood's device authorization endpoints.
 * The Heartwood worker renders the verification UI server-side and handles
 * session checks, code validation, and approve/deny logic.
 *
 * Routes proxied:
 * - GET  /auth/device              → Verification page (enter code / approve)
 * - POST /auth/device/authorize    → Approve or deny the device code
 */

import type { RequestHandler } from "./$types";
import { proxyToHeartwood } from "$lib/proxy";

const handler: RequestHandler = async (event) => {
	const path = event.params.path || "";

	// Only allow expected sub-paths (empty = /auth/device, "authorize" = /auth/device/authorize)
	if (path !== "" && path !== "authorize") {
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const targetPath = path ? `/auth/device/${path}` : "/auth/device";
	return proxyToHeartwood(event, targetPath);
};

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
