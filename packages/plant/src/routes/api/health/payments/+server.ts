/**
 * Stripe Health Check Endpoint
 *
 * Verifies Stripe connectivity and configuration for the Clearing Monitor.
 * This endpoint lives in Plant because Plant handles all payment processing.
 *
 * Checks:
 * 1. STRIPE_SECRET_KEY is configured
 * 2. Stripe API is reachable (GET /v1/balance - lightweight, read-only)
 * 3. STRIPE_WEBHOOK_SECRET is configured
 *
 * Status logic (configuration vs connectivity):
 * - healthy: All configured + Stripe API reachable
 * - degraded: Stripe works but webhook secret missing (payments work, webhooks won't)
 * - maintenance: Secrets not configured (our config issue, not Stripe's fault)
 * - unhealthy: Stripe API actually unreachable (real outage)
 *
 * HTTP codes:
 * - 200: healthy, degraded
 * - 203: maintenance (reachable but not fully operational)
 * - 503: unhealthy (actual service failure)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const STRIPE_API_VERSION = "2024-11-20.acacia";

interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  service: string;
  reason?: string;
  checks: {
    name: string;
    status: "pass" | "fail" | "skip";
    error?: string;
  }[];
  timestamp: string;
}

interface Check {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}

export const GET: RequestHandler = async ({ platform }) => {
  const checks: Check[] = [];
  const env = platform?.env;

  // Check 1: STRIPE_SECRET_KEY exists
  const stripeSecretKey = env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    checks.push({
      name: "stripe_secret_key",
      status: "skip",
      error: "Not configured",
    });
  } else {
    checks.push({ name: "stripe_secret_key", status: "pass" });

    // Check 2: Test Stripe API connectivity (only if we have a key)
    // GET /v1/balance is lightweight, read-only, and fast (~100-200ms)
    try {
      const response = await fetch("https://api.stripe.com/v1/balance", {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Stripe-Version": STRIPE_API_VERSION,
        },
      });

      if (response.ok) {
        checks.push({ name: "stripe_api", status: "pass" });
      } else {
        checks.push({
          name: "stripe_api",
          status: "fail",
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (e) {
      checks.push({
        name: "stripe_api",
        status: "fail",
        error: e instanceof Error ? e.message : "Unreachable",
      });
    }
  }

  // Check 3: STRIPE_WEBHOOK_SECRET exists
  const webhookSecret = env?.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    checks.push({ name: "stripe_webhook_secret", status: "pass" });
  } else {
    checks.push({
      name: "stripe_webhook_secret",
      status: "skip",
      error: "Not configured",
    });
  }

  // Determine overall status
  // Key distinction: missing config = maintenance, Stripe down = unhealthy
  const secretKeyCheck = checks.find((c) => c.name === "stripe_secret_key");
  const apiCheck = checks.find((c) => c.name === "stripe_api");
  const webhookCheck = checks.find((c) => c.name === "stripe_webhook_secret");

  const hasSecretKey = secretKeyCheck?.status === "pass";
  const apiReachable = apiCheck?.status === "pass";
  const hasWebhookSecret = webhookCheck?.status === "pass";

  let status: HealthCheckResponse["status"];
  let reason: string | undefined;
  let httpStatus: number;

  if (!hasSecretKey) {
    // No API key configured - this is a maintenance/config issue, not an outage
    status = "maintenance";
    reason = "Stripe integration not yet configured";
    httpStatus = 203; // Non-Authoritative: reachable but not operational
  } else if (!apiReachable) {
    // We have a key but can't reach Stripe - this is an actual outage
    status = "unhealthy";
    reason = apiCheck?.error || "Stripe API unreachable";
    httpStatus = 503;
  } else if (!hasWebhookSecret) {
    // Stripe works but webhooks won't - degraded functionality
    status = "degraded";
    reason = "Webhook secret not configured — webhooks will fail";
    httpStatus = 200;
  } else {
    // Everything is good!
    status = "healthy";
    httpStatus = 200;
  }

  const response: HealthCheckResponse = {
    status,
    service: "grove-payments",
    ...(reason && { reason }),
    checks,
    timestamp: new Date().toISOString(),
  };

  return json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
