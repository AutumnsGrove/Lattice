/**
 * Tier Icon Mapping
 *
 * Shared mapping of tier icons to Lucide components for Plant.
 * Used by both the home page plan previews and the plans selection page.
 */

import { natureIcons } from "@autumnsgrove/prism/icons";
import type { Component } from "svelte";
import type { TierIcon } from "@autumnsgrove/lattice/config";

/**
 * Map tier icon identifiers to icon components.
 */
export const tierIcons: Record<TierIcon, Component> = {
	user: natureIcons.sprout, // fallback for legacy free tier
	footprints: natureIcons.footprints, // Wanderer (free tier)
	sprout: natureIcons.sprout,
	"tree-deciduous": natureIcons.treeDeciduous,
	trees: natureIcons.trees,
	crown: natureIcons.crown,
};
