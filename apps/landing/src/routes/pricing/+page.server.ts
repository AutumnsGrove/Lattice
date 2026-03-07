/**
 * Pricing Page Server Load
 *
 * Shows available tiers - Wanderer and Seedling ($8/mo).
 * See /pricing/full for the complete 5-tier view.
 */

import { transformAllTiers } from "@autumnsgrove/lattice/grafts/pricing";

export function load() {
  // Available tiers: Wanderer first, then Seedling
  const tiers = transformAllTiers({
    includeTiers: ["wanderer", "seedling"],
    highlightTier: "wanderer",
    badges: {
      wanderer: "Free",
      seedling: "$8/mo",
    },
  });

  return { tiers };
}
