/**
 * Grove Onboarding — Worker Entry Point
 *
 * Two responsibilities:
 * 1. routeAgentRequest() — handles WebSocket/RPC calls to the agent (SDK convention)
 * 2. HTTP endpoints — for non-WebSocket callers (signup flow, unsubscribe links)
 *
 * Routes:
 * - POST /start           — Start onboarding sequence for an email
 * - POST /unsubscribe     — Unsubscribe a user from their sequence
 * - GET  /status/:email   — Query agent state (admin)
 * - GET  /health          — Health check
 */

import { Hono } from "hono";
import { routeAgentRequest } from "@autumnsgrove/grove-agent";
import { ONBOARDING_ERRORS } from "./errors.js";
import type { Env } from "./types.js";

// Re-export the DO class so wrangler can find it
export { OnboardingAgent } from "./agent.js";

// =============================================================================
// HTTP Router
// =============================================================================

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => {
	return c.json({ status: "healthy", agent: "OnboardingAgent", version: "0.1.0" });
});

/**
 * POST /start — Called by signup flow via service binding.
 * Body: { email: string, audience: "wanderer" | "promo" | "rooted" }
 */
app.post("/start", async (c) => {
	const body = (await c.req.json()) as Record<string, unknown>;
	const { email, audience } = body;

	if (!email || typeof email !== "string") {
		return c.json({ success: false, error: ONBOARDING_ERRORS.INVALID_EMAIL }, 400);
	}

	if (!audience || typeof audience !== "string") {
		return c.json({ success: false, error: ONBOARDING_ERRORS.INVALID_AUDIENCE }, 400);
	}

	const id = c.env.ONBOARDING_AGENT.idFromName(email.toLowerCase().trim());
	const stub = c.env.ONBOARDING_AGENT.get(id);

	// Forward to the agent's startSequence callable via RPC
	const response = await stub.fetch("https://agents/startSequence", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify([email, audience]),
	});

	const result = await response.json();
	return c.json({ success: true, ...(result as Record<string, unknown>) });
});

/**
 * POST /unsubscribe — Called by unsubscribe link handler.
 * Body: { email: string }
 */
app.post("/unsubscribe", async (c) => {
	const body = (await c.req.json()) as Record<string, unknown>;
	const { email } = body;

	if (!email || typeof email !== "string") {
		return c.json({ success: false, error: ONBOARDING_ERRORS.INVALID_EMAIL }, 400);
	}

	const id = c.env.ONBOARDING_AGENT.idFromName(email.toLowerCase().trim());
	const stub = c.env.ONBOARDING_AGENT.get(id);

	const response = await stub.fetch("https://agents/unsubscribe", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify([]),
	});

	const result = await response.json();
	return c.json({ success: true, ...(result as Record<string, unknown>) });
});

/**
 * GET /status/:email — Admin endpoint to check agent state.
 */
app.get("/status/:email", async (c) => {
	const email = c.req.param("email");

	const id = c.env.ONBOARDING_AGENT.idFromName(email.toLowerCase().trim());
	const stub = c.env.ONBOARDING_AGENT.get(id);

	const response = await stub.fetch("https://agents/getStatus", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify([]),
	});

	const result = await response.json();
	return c.json({ success: true, state: result });
});

// 404 fallback
app.notFound((c) => {
	return c.json({ success: false, error: { code: "NOT_FOUND", message: "Unknown route" } }, 404);
});

// Global error handler
app.onError((err, c) => {
	console.error("[Onboarding] Unhandled error:", err);
	return c.json(
		{ success: false, error: { code: "INTERNAL_ERROR", message: "An internal error occurred" } },
		500,
	);
});

// =============================================================================
// Worker Export
// =============================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Try the Agents SDK routing first (handles WebSocket upgrades + RPC)
		const agentResponse = await routeAgentRequest(request, env);
		if (agentResponse) {
			return agentResponse;
		}

		// Fall through to HTTP routes
		return app.fetch(request, env, ctx);
	},
};
