/**
 * Pricing Page Server Load
 *
 * Loads tier data using the grafts system for the pricing page.
 */

import { transformAllTiers } from "@autumnsgrove/groveengine/grafts/pricing";

export function load() {
  // Transform all tiers for display
  // In the future, checkout URLs would be added here from environment
  const tiers = transformAllTiers({
    // Highlight the entry-level paid tier
    highlightTier: "seedling",
    badges: {
      seedling: "Start Here",
    },
    // No checkout URLs yet - they'll be added when LemonSqueezy is configured
    // checkoutUrls: getAllCheckoutUrls(createCheckoutConfigFromEnv(platform.env)),
  });

  return { tiers };
}
