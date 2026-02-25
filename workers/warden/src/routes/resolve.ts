/**
 * POST /resolve — Credential Resolution Endpoint
 *
 * Returns decrypted credentials to authorized service-binding callers.
 * This allows internal workers (e.g., Lumen) to resolve per-tenant or
 * global API keys without ever storing raw keys themselves.
 *
 * Security constraints:
 * - Only service-binding auth (X-API-Key header) is accepted
 * - Challenge-response auth is rejected (credentials must not travel to
 *   external agents that use the nonce-signature flow)
 * - Caller must have at least one scope on the requested service
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env, WardenService } from "../types";
import { dualAuth, type AuthVariables } from "../auth/dual-auth";
import { resolveCredential } from "../lib/credentials";
import { logAuditEvent, updateAgentUsage } from "../lib/logging";

const resolveBodySchema = z.object({
	service: z.enum(["github", "tavily", "cloudflare", "exa", "resend", "stripe", "openrouter"]),
	tenant_id: z.string().optional(),
});

export const resolveRoute = new Hono<{
	Bindings: Env;
	Variables: AuthVariables;
}>();

// All /resolve routes require authentication
resolveRoute.use("*", dualAuth);

resolveRoute.post("/", async (c) => {
	const agent = c.get("agent");
	const authMethod = c.get("authMethod");
	const ctx = c.get("ctx");
	const startTime = Date.now();

	// Reject challenge-response auth — only service-binding callers can resolve
	if (authMethod === "challenge_response") {
		return c.json(
			{
				success: false,
				error: {
					code: "AUTH_METHOD_DENIED",
					message: "Credential resolution requires service binding auth (X-API-Key)",
				},
			},
			403,
		);
	}

	// Parse and validate body
	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json(
			{ success: false, error: { code: "INVALID_BODY", message: "Request body must be JSON" } },
			400,
		);
	}

	const parsed = resolveBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		const errors = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
		return c.json(
			{
				success: false,
				error: { code: "INVALID_PARAMS", message: `Validation failed: ${errors.join("; ")}` },
			},
			400,
		);
	}

	const { service, tenant_id } = parsed.data;

	// Check that caller has any scope on the requested service
	const agentScopes: string[] = JSON.parse(agent.scopes || "[]");
	const hasServiceScope = agentScopes.some((scope) => {
		const [scopeService, scopePermission] = scope.split(":");
		return (scopeService === service || scopeService === "*") && scopePermission !== undefined;
	});

	if (!hasServiceScope) {
		c.executionCtx.waitUntil(
			logAuditEvent(ctx.db, {
				agent_id: agent.id,
				agent_name: agent.name,
				target_service: service,
				action: "resolve",
				auth_method: authMethod,
				auth_result: "failed",
				event_type: "scope_denial",
				tenant_id: tenant_id || null,
				latency_ms: Date.now() - startTime,
				error_code: "SCOPE_DENIED",
			}),
		);
		return c.json(
			{
				success: false,
				error: {
					code: "SCOPE_DENIED",
					message: `Agent lacks any scope for service: ${service}`,
				},
			},
			403,
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

	const totalLatency = Date.now() - startTime;

	// Audit log + usage update (fire and forget)
	c.executionCtx.waitUntil(
		Promise.all([
			logAuditEvent(ctx.db, {
				agent_id: agent.id,
				agent_name: agent.name,
				target_service: service,
				action: "resolve",
				auth_method: authMethod,
				auth_result: "success",
				event_type: "resolve",
				tenant_id: tenant_id || null,
				latency_ms: totalLatency,
				error_code: null,
			}),
			updateAgentUsage(ctx.db, agent.id),
		]),
	);

	return c.json({
		success: true,
		data: {
			credential: credential.value,
			source: credential.source,
		},
	});
});
