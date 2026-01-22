/**
 * Full Pricing Page Server Load
 *
 * Shows all tiers - the complete pricing picture.
 * Main /pricing page shows simplified phase 1 view.
 */

import { transformAllTiers } from "@autumnsgrove/groveengine/grafts/pricing";

export function load() {
  // All tiers, no filters
  const tiers = transformAllTiers({
    highlightTier: "seedling",
    badges: {
      seedling: "Start Here",
    },
  });

  return { tiers };
}
