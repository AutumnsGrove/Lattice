/**
 * Dual Authentication Middleware
 *
 * Supports two auth paths:
 * 1. X-API-Key header → service binding / direct API key callers
 * 2. agent.id + agent.nonce + agent.signature in body → challenge-response
 *
 * Attaches the authenticated agent to the Hono context for downstream use.
 */

import { createMiddleware } from "hono/factory";
import type { Env, AppVariables, WardenAgent } from "../types";
import { authenticateByApiKey } from "./api-key";
import { validateNonce } from "./nonce";
import { verifySignature } from "./signature";
import { logAuditEvent } from "../lib/logging";

/** Extended Hono variables set by auth middleware */
export type AuthVariables = AppVariables & {
	agent: WardenAgent;
	authMethod: "service_binding" | "challenge_response";
};

/** Dual-auth middleware — rejects unauthenticated requests */
export const dualAuth = createMiddleware<{
	Bindings: Env;
	Variables: AuthVariables;
}>(async (c, next) => {
	const ctx = c.get("ctx");
	const db = ctx.db;

	// Path 1: API key header (service binding or direct callers)
	const apiKey = c.req.header("X-API-Key");
	if (apiKey) {
		const agent = await authenticateByApiKey(db, apiKey);
		if (!agent) {
			return c.json(
				{ success: false, error: { code: "AUTH_FAILED", message: "Invalid API key" } },
				401,
			);
		}
		c.set("agent", agent);
		c.set("authMethod", "service_binding");
		await next();
		return;
	}

	// Path 2: Challenge-response (HMAC signature in body)
	let body: { agent?: { id?: string; nonce?: string; signature?: string } };
	try {
		body = await c.req.json();
	} catch {
		return c.json(
			{ success: false, error: { code: "INVALID_BODY", message: "Request body must be JSON" } },
			400,
		);
	}

	const agentAuth = body?.agent;
	if (!agentAuth?.id || !agentAuth?.nonce || !agentAuth?.signature) {
		return c.json(
			{
				success: false,
				error: {
					code: "AUTH_REQUIRED",
					message: "Provide X-API-Key header or agent credentials in body",
				},
			},
			401,
		);
	}

	// Look up agent
	const agent = await db
		.prepare("SELECT * FROM warden_agents WHERE id = ? AND enabled = 1")
		.bind(agentAuth.id)
		.first<WardenAgent>();

	if (!agent) {
		return c.json(
			{
				success: false,
				error: { code: "AGENT_NOT_FOUND", message: "Agent not found or disabled" },
			},
			401,
		);
	}

	// Validate nonce (single-use, 30s TTL)
	const nonceValid = await validateNonce(c.env.NONCES, agentAuth.id, agentAuth.nonce);
	if (!nonceValid) {
		// Log nonce reuse attempt
		await logAuditEvent(db, {
			agent_id: agentAuth.id,
			agent_name: agent.name,
			target_service: "auth",
			action: "nonce_validate",
			auth_method: "challenge_response",
			auth_result: "failed",
			event_type: "nonce_reuse",
			tenant_id: null,
			latency_ms: 0,
			error_code: "NONCE_INVALID",
		});
		return c.json(
			{
				success: false,
				error: { code: "NONCE_INVALID", message: "Nonce expired or already used" },
			},
			401,
		);
	}

	// Verify HMAC signature
	const signatureValid = await verifySignature(
		agent.secret_hash,
		agentAuth.nonce,
		agentAuth.signature,
	);
	if (!signatureValid) {
		return c.json(
			{
				success: false,
				error: { code: "SIGNATURE_INVALID", message: "HMAC signature verification failed" },
			},
			401,
		);
	}

	c.set("agent", agent);
	c.set("authMethod", "challenge_response");
	await next();
});
