/**
 * POST /nonce — Request an auth nonce
 *
 * Agents call this to get a single-use nonce for challenge-response auth.
 * The nonce is stored in KV with a 30-second TTL.
 */

import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { generateNonce } from "../auth/nonce";

export const nonceRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

nonceRoute.post("/", async (c) => {
	let body: { agentId?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json(
			{ success: false, error: { code: "INVALID_BODY", message: "Request body must be JSON" } },
			400,
		);
	}

	if (!body.agentId) {
		return c.json(
			{ success: false, error: { code: "MISSING_FIELD", message: "agentId is required" } },
			400,
		);
	}

	// Verify agent exists and is enabled
	const ctx = c.get("ctx");
	const agent = await ctx.db
		.prepare("SELECT id FROM warden_agents WHERE id = ? AND enabled = 1")
		.bind(body.agentId)
		.first();

	if (!agent) {
		return c.json(
			{
				success: false,
				error: { code: "AGENT_NOT_FOUND", message: "Agent not found or disabled" },
			},
			404,
		);
	}

	const nonce = await generateNonce(c.env.NONCES, body.agentId);

	return c.json({ success: true, data: { nonce } });
});
