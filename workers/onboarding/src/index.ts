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
import { routeAgentRequest, getAgentByName } from "@autumnsgrove/grove-agent";
import { ONBOARDING_ERRORS } from "./errors.js";
import type { OnboardingAgent } from "./agent.js";
import type { Env } from "./types.js";

// Re-export the DO class so wrangler can find it
export { OnboardingAgent } from "./agent.js";

// Helper: get a typed stub for RPC calls to @callable() methods.
// The `as any` cast bridges the DurableObjectNamespace<T> generic constraint —
// our Env's ONBOARDING_AGENT is untyped, but the returned stub is properly typed.
async function getAgent(ns: DurableObjectNamespace, email: string) {
	const name = email.toLowerCase().trim();
	return getAgentByName(ns as unknown as DurableObjectNamespace<OnboardingAgent>, name);
}

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

	const stub = await getAgent(c.env.ONBOARDING_AGENT, email);
	const result = await stub.startSequence(email, audience);
	return c.json({ success: true, ...result });
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

	const stub = await getAgent(c.env.ONBOARDING_AGENT, email);
	const result = await stub.unsubscribe();
	return c.json({ success: true, ...result });
});

/**
 * GET /status/:email — Admin endpoint to check agent state.
 */
app.get("/status/:email", async (c) => {
	const email = c.req.param("email");

	const stub = await getAgent(c.env.ONBOARDING_AGENT, email);
	const result = await stub.getStatus();
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
