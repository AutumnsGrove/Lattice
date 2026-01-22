/**
 * Pricing Page Server Load
 *
 * Phase 1: Shows only Seedling tier.
 * See /pricing/full for the complete 4-tier view.
 */

import { transformAllTiers } from "@autumnsgrove/groveengine/grafts/pricing";

export function load() {
  // Phase 1: Only Seedling available at launch
  // See /pricing/full for the complete pricing picture
  const tiers = transformAllTiers({
    includeTiers: ["seedling"],
    highlightTier: "seedling",
    badges: {
      seedling: "Available Now",
    },
    // No checkout URLs yet - they'll be added when LemonSqueezy is configured
    // checkoutUrls: getAllCheckoutUrls(createCheckoutConfigFromEnv(platform.env)),
  });

  return { tiers };
}
