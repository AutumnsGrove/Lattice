/**
 * Health Check — AUTH Service Binding Diagnostic
 *
 * Tests that the login app can reach Heartwood via the AUTH service binding.
 * Useful for diagnosing "sign in failed to start" errors — if the binding
 * is missing or Heartwood is down, this endpoint surfaces the issue clearly.
 *
 * GET /api/health → { status, binding, heartwood, timestamp }
 */

import type { RequestHandler } from "./$types";

const DEFAULT_AUTH_URL = "https://login.grove.place";

export const GET: RequestHandler = async ({ platform }) => {
	const result: Record<string, unknown> = {
		status: "ok",
		service: "grove-login",
		timestamp: new Date().toISOString(),
		binding: {
			exists: false,
			type: null as string | null,
		},
		heartwood: {
			reachable: false,
			status: null as number | null,
			error: null as string | null,
		},
	};

	// Check if AUTH service binding exists
	if (!platform?.env?.AUTH) {
		result.status = "degraded";
		result.binding = {
			exists: false,
			type: null,
			error:
				"AUTH service binding is not configured. Check Cloudflare Dashboard > Pages > Settings > Bindings.",
		};
		return Response.json(result, { status: 503 });
	}

	result.binding = {
		exists: true,
		type: typeof platform.env.AUTH,
	};

	// Test the binding by calling Heartwood's health endpoint
	const authBaseUrl = platform.env.GROVEAUTH_URL ?? DEFAULT_AUTH_URL;
	try {
		const response = await platform.env.AUTH.fetch(`${authBaseUrl}/health`, {
			method: "GET",
			headers: { Accept: "application/json" },
		});

		result.heartwood = {
			reachable: true,
			status: response.status,
			error: null,
		};

		if (response.ok) {
			try {
				const body = (await response.json()) as Record<string, unknown>;
				// Allowlist fields — avoid leaking internal details if Heartwood's payload grows
				const hw = result.heartwood as Record<string, unknown>;
				hw.status = body.status;
				if (body.version != null) hw.version = body.version;
				if (body.uptime != null) hw.uptime = body.uptime;
			} catch {
				// JSON parse failed but endpoint was reachable
			}
		} else {
			result.status = "degraded";
			try {
				const body = await response.text();
				(result.heartwood as Record<string, unknown>).body = body.slice(0, 200);
			} catch {
				// ignore
			}
		}
	} catch (err) {
		result.status = "error";
		result.heartwood = {
			reachable: false,
			status: null,
			error: err instanceof Error ? err.message : String(err),
		};
	}

	const httpStatus = result.status === "ok" ? 200 : 503;
	return Response.json(result, { status: httpStatus });
};
