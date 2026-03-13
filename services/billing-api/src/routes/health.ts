/**
 * GET /health — Service health check
 *
 * Checks D1 connectivity and Stripe API reachability.
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { StripeClient } from "../stripe/client.js";

const health = new Hono<{ Bindings: Env }>();

health.get("/", async (c) => {
	const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

	// Check D1
	const d1Start = Date.now();
	try {
		await c.env.DB.prepare("SELECT 1").first();
		checks.d1 = { ok: true, latencyMs: Date.now() - d1Start };
	} catch (err) {
		// Log full error internally, but only expose generic message
		console.error("[Health] D1 check failed:", err);
		checks.d1 = {
			ok: false,
			latencyMs: Date.now() - d1Start,
			error: "D1 unreachable",
		};
	}

	// Check Stripe API
	const stripeStart = Date.now();
	try {
		const stripe = new StripeClient(c.env.STRIPE_SECRET_KEY);
		await stripe.listCustomers(1);
		checks.stripe = { ok: true, latencyMs: Date.now() - stripeStart };
	} catch (err) {
		// Log full error internally, but only expose generic message
		console.error("[Health] Stripe check failed:", err);
		checks.stripe = {
			ok: false,
			latencyMs: Date.now() - stripeStart,
			error: "Stripe unreachable",
		};
	}

	const allHealthy = Object.values(checks).every((c) => c.ok);

	return c.json(
		{
			status: allHealthy ? "healthy" : "degraded",
			service: "grove-billing-api",
			checks,
			timestamp: new Date().toISOString(),
		},
		allHealthy ? 200 : 503,
	);
});

export default health;
