/**
 * POST /api/reverie/execute
 *
 * Proxies validated change execution requests to the Reverie worker.
 * The worker re-validates changes against SCHEMA_REGISTRY before applying.
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
	const VALID_TIERS = new Set(["wanderer", "seedling", "sapling", "oak", "evergreen"]);
	const rawTier = locals.context.type === "tenant" ? locals.context.tenant.plan || "wanderer" : "wanderer";
	const tier = VALID_TIERS.has(rawTier) ? rawTier : "wanderer";

	const apiKey = platform?.env?.REVERIE_API_KEY ?? "";

	try {
		const body = await request.text();

		const response = await reverie.fetch("https://reverie/execute", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": apiKey,
				"X-Tenant-Id": locals.tenantId,
				"X-Tier": tier,
			},
			body,
		});

		const data = await response.json();
		return json(data, { status: response.status });
	} catch (err) {
		logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE, {
			path: "/api/reverie/execute",
			cause: err,
		});
		return json(buildErrorJson(API_ERRORS.SERVICE_UNAVAILABLE), { status: 503 });
	}
};
