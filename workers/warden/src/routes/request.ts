/**
 * POST /request — Main API Proxy Route
 *
 * The core of Warden: receives a service+action+params request,
 * authenticates the agent, validates scopes, resolves credentials,
 * executes the upstream request, scrubs the response, and logs everything.
 */

import { Hono } from "hono";
import type { Env, WardenRequestBody, WardenService } from "../types";
import { dualAuth, type AuthVariables } from "../auth/dual-auth";
import { validateScope, getRequiredScope, isValidAction } from "../auth/scopes";
import { checkRateLimit, checkServiceRateLimit } from "../middleware/rate-limit";
import { scrubResponse } from "../middleware/scrub";
import { resolveCredential } from "../lib/credentials";
import { executeUpstream } from "../lib/execute";
import { logAuditEvent, updateAgentUsage } from "../lib/logging";
import { getService } from "../services";

export const requestRoute = new Hono<{
	Bindings: Env;
	Variables: AuthVariables;
}>();

// All /request routes require authentication
requestRoute.use("*", dualAuth);

requestRoute.post("/", async (c) => {
	const agent = c.get("agent");
	const authMethod = c.get("authMethod");
	const ctx = c.get("ctx");
	const startTime = Date.now();

	// Parse request body — for challenge-response auth, body was already parsed by dualAuth
	let body: WardenRequestBody;
	try {
		body = await c.req.json();
	} catch {
		return c.json(
			{ success: false, error: { code: "INVALID_BODY", message: "Request body must be JSON" } },
			400,
		);
	}

	const { service, action, params, tenant_id } = body;

	// Validate service exists
	const serviceDefinition = getService(service);
	if (!serviceDefinition) {
		return c.json(
			{
				success: false,
				error: { code: "UNKNOWN_SERVICE", message: `Unknown service: ${service}` },
			},
			400,
		);
	}

	// Validate action exists
	if (!isValidAction(service, action)) {
		return c.json(
			{
				success: false,
				error: {
					code: "UNKNOWN_ACTION",
					message: `Unknown action '${action}' for service '${service}'`,
				},
			},
			400,
		);
	}

	// Check scope permissions
	const agentScopes: string[] = JSON.parse(agent.scopes || "[]");
	if (!validateScope(agentScopes, service as WardenService, action)) {
		const required = getRequiredScope(service as WardenService, action);
		await logAuditEvent(ctx.db, {
			agent_id: agent.id,
			agent_name: agent.name,
			target_service: service,
			action,
			auth_method: authMethod,
			auth_result: "failed",
			event_type: "scope_denial",
			tenant_id: tenant_id || null,
			latency_ms: Date.now() - startTime,
			error_code: "SCOPE_DENIED",
		});
		return c.json(
			{
				success: false,
				error: {
					code: "SCOPE_DENIED",
					message: `Agent lacks required scope: ${required}`,
				},
			},
			403,
		);
	}

	// Check per-agent rate limits
	const rateResult = await checkRateLimit(c.env.RATE_LIMITS, agent, service as WardenService);
	if (!rateResult.allowed) {
		await logAuditEvent(ctx.db, {
			agent_id: agent.id,
			agent_name: agent.name,
			target_service: service,
			action,
			auth_method: authMethod,
			auth_result: "failed",
			event_type: "rate_limit_hit",
			tenant_id: tenant_id || null,
			latency_ms: Date.now() - startTime,
			error_code: "RATE_LIMITED",
		});
		return c.json(
			{
				success: false,
				error: {
					code: "RATE_LIMITED",
					message: `Rate limit exceeded. Remaining: ${rateResult.remaining}, resets at: ${rateResult.resetAt}`,
				},
			},
			429,
		);
	}

	// Check global per-service rate limits (prevents upstream API throttling)
	const serviceRateResult = await checkServiceRateLimit(
		c.env.RATE_LIMITS,
		service as WardenService,
	);
	if (!serviceRateResult.allowed) {
		await logAuditEvent(ctx.db, {
			agent_id: agent.id,
			agent_name: agent.name,
			target_service: service,
			action,
			auth_method: authMethod,
			auth_result: "failed",
			event_type: "rate_limit_hit",
			tenant_id: tenant_id || null,
			latency_ms: Date.now() - startTime,
			error_code: "RATE_LIMITED",
		});
		return c.json(
			{
				success: false,
				error: {
					code: "RATE_LIMITED",
					message: `Service rate limit exceeded for ${service}. Resets at: ${serviceRateResult.resetAt}`,
				},
			},
			429,
		);
	}

	// Validate params against service action schema
	const actionDef = serviceDefinition.actions[action];
	const parseResult = actionDef.schema.safeParse(params || {});
	if (!parseResult.success) {
		const errors = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
		return c.json(
			{
				success: false,
				error: {
					code: "INVALID_PARAMS",
					message: `Parameter validation failed: ${errors.join("; ")}`,
				},
			},
			400,
		);
	}

	// Resolve credential
	const credential = await resolveCredential(c.env, service as WardenService, tenant_id);
	if (!credential) {
		return c.json(
			{
				success: false,
				error: {
					code: "NO_CREDENTIAL",
					message: `No credential available for service: ${service}`,
				},
			},
			503,
		);
	}

	// Build and execute upstream request
	const httpRequest = actionDef.buildRequest(parseResult.data, credential.value);
	const result = await executeUpstream(httpRequest);

	// Scrub response
	const scrubbedData = result.response.success
		? scrubResponse(result.response.data)
		: result.response.error;

	const totalLatency = Date.now() - startTime;

	// Log audit event (fire and forget)
	const logPromise = logAuditEvent(ctx.db, {
		agent_id: agent.id,
		agent_name: agent.name,
		target_service: service,
		action,
		auth_method: authMethod,
		auth_result: result.response.success ? "success" : "failed",
		event_type: "request",
		tenant_id: tenant_id || null,
		latency_ms: result.latencyMs,
		error_code: result.response.success ? null : result.response.error?.code || null,
	});

	// Update agent usage stats
	const usagePromise = updateAgentUsage(ctx.db, agent.id);

	// Don't await — let these complete in the background
	c.executionCtx.waitUntil(Promise.all([logPromise, usagePromise]));

	// Build response
	const status = result.response.success ? 200 : result.status >= 400 ? result.status : 502;
	const response = result.response.success
		? {
				success: true,
				data: scrubbedData,
				meta: { service, action, latencyMs: totalLatency },
			}
		: {
				success: false,
				error: scrubbedData as { code: string; message: string },
				meta: { service, action, latencyMs: totalLatency },
			};

	return c.json(response, status as 200);
});
