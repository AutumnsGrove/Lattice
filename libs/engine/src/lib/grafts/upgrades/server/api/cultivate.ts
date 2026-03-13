/**
 * Cultivation API: POST /api/grafts/upgrades/cultivate
 *
 * Help your grove grow to the next stage.
 * Redirects to BillingHub for checkout — all Stripe logic lives in billing-api.
 */

import { json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import type { CultivateRequest, CultivateResponse } from "../../types";
import { createUpgradeConfig } from "../../config";
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { createThreshold } from "$lib/threshold/factory.js";
import { thresholdCheck } from "$lib/threshold/adapters/sveltekit.js";
import { buildCheckoutUrl } from "$lib/config/billing";
import { logBillingAudit, isCompedAccount } from "$lib/server/billing";

const CULTIVATE_RATE_LIMIT = { limit: 20, windowSeconds: 3600 }; // 20 per hour

export const POST: RequestHandler = async ({ request, platform, locals }): Promise<Response> => {
	// Authentication required
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	// CSRF validation — use URL.origin for exact domain match (prevents grove.place.evil.com bypass)
	const requestOrigin = request.headers.get("origin") || request.headers.get("referer");
	try {
		if (!requestOrigin) throw new Error("Missing origin");
		const originUrl = new URL(requestOrigin);
		const expectedUrl = new URL(locals.origin ?? "https://grove.place");
		if (originUrl.origin !== expectedUrl.origin) {
			throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
		}
	} catch (e) {
		if ((e as { status?: number }).status === 403) throw e;
		throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
	}

	// Environment check
	if (!platform?.env?.DB) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	// Get and verify tenant
	const tenantId = locals.tenantId;
	if (!tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const verifiedTenantId = await getVerifiedTenantId(platform.env.DB, tenantId, locals.user);

	// Rate limiting
	const threshold = createThreshold(platform?.env);
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: `cultivate:${verifiedTenantId}`,
			limit: CULTIVATE_RATE_LIMIT.limit,
			windowSeconds: CULTIVATE_RATE_LIMIT.windowSeconds,
		});

		if (denied) {
			return denied;
		}
	}

	// Parse request body
	let body: CultivateRequest;
	try {
		body = await request.json();
	} catch {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	const { targetStage, billingCycle = "monthly", returnTo } = body;

	// Validate target stage
	const validStages = ["seedling", "sapling", "oak", "evergreen"];
	if (!targetStage || !validStages.includes(targetStage)) {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	// Validate billing cycle
	if (billingCycle !== "monthly" && billingCycle !== "yearly") {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	// Check if already at or above target stage
	const billing = (await platform.env.DB.prepare(
		`SELECT plan FROM platform_billing WHERE tenant_id = ?`,
	)
		.bind(verifiedTenantId)
		.first()) as { plan: string } | null;

	if (billing) {
		const currentStageOrder = ["wanderer", "seedling", "sapling", "oak", "evergreen"];
		const currentIndex = currentStageOrder.indexOf(billing.plan);
		const targetIndex = currentStageOrder.indexOf(targetStage);

		if (targetIndex <= currentIndex) {
			// Already at or above target stage
			const params = new URLSearchParams();
			params.set("returnTo", returnTo ?? "/garden");
			return redirect(302, `/garden?${params.toString()}`);
		}
	}

	// Check for comped status (defense in depth — billing hub also checks)
	const { isComped: isCompedBool } = await isCompedAccount(platform.env.DB, verifiedTenantId);
	if (isCompedBool) {
		// Comped accounts cannot upgrade through cultivation
		const params = new URLSearchParams();
		params.set("error", "comped");
		params.set("returnTo", returnTo ?? "/garden");
		return redirect(302, `/garden?${params.toString()}`);
	}

	// Build BillingHub checkout URL — all Stripe logic lives in billing-api
	const config = createUpgradeConfig(platform.env as unknown as Record<string, string | undefined>);

	const redirectUrl = returnTo?.startsWith("/")
		? `${config.appUrl}${returnTo}`
		: `${config.appUrl}/arbor/account?cultivated=true`;

	const plantingUrl = buildCheckoutUrl({
		tenantId: verifiedTenantId,
		tier: targetStage,
		billingCycle,
		redirect: redirectUrl,
	});

	// Audit log the cultivation attempt
	await logBillingAudit(platform.env.DB, {
		tenantId: verifiedTenantId,
		action: "cultivation_started",
		details: {
			targetStage,
			billingCycle,
			returnTo,
		},
		userEmail: locals.user.email,
	});

	const response: CultivateResponse = {
		plantingUrl,
	};

	return json(response);
};
