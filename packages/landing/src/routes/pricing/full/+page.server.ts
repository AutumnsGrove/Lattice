/**
 * Full Pricing Page Server Load
 *
 * Shows all 5 tiers - the complete pricing picture.
 * Main /pricing page shows simplified view with Wanderer and Seedling.
 */

import { transformAllTiers } from "@autumnsgrove/groveengine/grafts/pricing";

export function load() {
  // All tiers, no filters
  const tiers = transformAllTiers({
    highlightTier: "free",
    badges: {
      free: "Free",
      seedling: "$8/mo",
      sapling: "$12/mo",
      oak: "$25/mo",
      evergreen: "$35/mo",
    },
  });

  return { tiers };
}
