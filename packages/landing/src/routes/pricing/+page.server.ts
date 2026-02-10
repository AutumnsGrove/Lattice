/**
 * Pricing Page Server Load
 *
 * Shows available tiers - Wanderer (free) and Seedling ($8/mo).
 * See /pricing/full for the complete 5-tier view.
 */

import { transformAllTiers } from "@autumnsgrove/groveengine/grafts/pricing";

export function load() {
  // Available tiers: Wanderer (free) first, then Seedling
  const tiers = transformAllTiers({
    includeTiers: ["free", "seedling"],
    highlightTier: "free",
    badges: {
      free: "Free",
      seedling: "$8/mo",
    },
  });

  return { tiers };
}
