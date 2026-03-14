import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * GET /api/health/payments - Payment subsystem health check (REDIRECT)
 *
 * NOTE: The authoritative payments health check is now in Plant, which
 * handles all payment processing and has the Stripe secrets configured.
 *
 * This endpoint exists for backwards compatibility and returns a redirect
 * hint. The Clearing Monitor has been updated to check Plant directly.
 *
 * @see packages/plant/src/routes/api/health/payments/+server.ts
 */
export const GET: RequestHandler = async () => {
  return json(
    {
      status: "healthy",
      service: "grove-payments",
      reason:
        "Payments health check moved to Plant (plant.grove.place/api/health/payments)",
      redirect: "https://plant.grove.place/api/health/payments",
      checks: [
        {
          name: "redirect_notice",
          status: "pass",
          error: "This endpoint is deprecated — check Plant instead",
        },
      ],
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
};
