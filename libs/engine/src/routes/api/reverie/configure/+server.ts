/**
 * POST /api/reverie/configure
 *
 * Proxies natural language configuration requests to the Reverie worker.
 * Extracts auth context from SvelteKit locals and forwards via service binding.
 */
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, buildErrorJson, logGroveError } from "$lib/errors";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
	}
	if (!locals.tenantId) {
		return json(buildErrorJson(API_ERRORS.TENANT_CONTEXT_REQUIRED), { status: 403 });
	}

	const reverie = platform?.env?.REVERIE;
	if (!reverie) {
		return json(buildErrorJson(API_ERRORS.SERVICE_UNAVAILABLE), { status: 503 });
	}

	// Extract and validate tier — prevents header injection via forged plan values
	const VALID_TIERS = new Set(["free", "seedling", "sapling", "oak", "evergreen"]);
	const rawTier = locals.context.type === "tenant" ? locals.context.tenant.plan || "free" : "free";
	const tier = VALID_TIERS.has(rawTier) ? rawTier : "free";

	try {
		const body = await request.text();

		const response = await reverie.fetch("https://reverie/configure", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Tenant-Id": locals.tenantId,
				"X-Tier": tier,
			},
			body,
		});

		const data = await response.json();
		return json(data, { status: response.status });
	} catch (err) {
		logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE, {
			path: "/api/reverie/configure",
			cause: err,
		});
		return json(buildErrorJson(API_ERRORS.SERVICE_UNAVAILABLE), { status: 503 });
	}
};
