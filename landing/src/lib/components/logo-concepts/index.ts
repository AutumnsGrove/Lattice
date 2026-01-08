/**
 * Grove Logo Concept Components
 *
 * Experimental logo designs for Grove - view them in /vineyard
 *
 * ## Common Props (all components)
 * - `class` - CSS classes for sizing/positioning (default: 'w-8 h-8')
 * - `color` - Fill/stroke color (default: 'currentColor')
 * - `title` - Accessible name for screen readers (renders SVG <title>)
 *
 * ## Additional Props
 * Some logos with visible tree trunks support a separate trunk color:
 * - `LogoConnectedCanopy` - has `trunkColor` for the small trunk at bottom
 * - `LogoGathering` - has `trunkColor` for the three tree trunks
 *
 * When `trunkColor` is not provided, it defaults to `color`.
 *
 * ## Sprout-Based Logos (v2)
 * Enhanced variations based on Lucide's Sprout icon:
 * - `SproutCore` - The base sprout, refined for logo use
 * - `SproutRing` - Sprout inside a protective circle
 * - `SproutDouble` - Two sprouts growing together
 * - `SproutG` - Letter G formed from organic curves with leaf accent
 * - `SproutRooted` - Sprout with visible root network
 * - `SproutHeart` - Sprout with heart-shaped leaves
 *
 * ## Space-Based Logos (v3)
 * A philosophical shift: logos about what happens IN the grove, not the trees:
 * - `LogoLantern` - A light left for you—warmth and welcome
 * - `LogoLanternMinimal` - Simplified lantern for small sizes
 * - `LogoThreshold` - An archway/doorway inviting entry
 * - `LogoClearing` - A broken circle with room for you
 *
 * ## Forest Logos (v4)
 * The grove itself—trees creating community:
 * - `LogoForestLantern` - Trees with a lantern at center
 * - `LogoGrove` - Three different tree types together
 * - `LogoThreePines` - Minimal pine trio for small sizes
 */

// Original concepts (v1)
export { default as LogoClearingRing } from "./LogoClearingRing.svelte";
export { default as LogoConnectedCanopy } from "./LogoConnectedCanopy.svelte";
export { default as LogoOrganicG } from "./LogoOrganicG.svelte";
export { default as LogoGathering } from "./LogoGathering.svelte";
export { default as LogoMycelium } from "./LogoMycelium.svelte";
export { default as LogoClearingPath } from "./LogoClearingPath.svelte";
export { default as LogoThreeLeaves } from "./LogoThreeLeaves.svelte";
export { default as LogoGroveSeal } from "./LogoGroveSeal.svelte";

// Sprout-based concepts (v2)
export { default as SproutCore } from "./SproutCore.svelte";
export { default as SproutRing } from "./SproutRing.svelte";
export { default as SproutDouble } from "./SproutDouble.svelte";
export { default as SproutG } from "./SproutG.svelte";
export { default as SproutRooted } from "./SproutRooted.svelte";
export { default as SproutHeart } from "./SproutHeart.svelte";

// Space-based concepts (v3) - "what happens IN the grove"
export { default as LogoLantern } from "./LogoLantern.svelte";
export { default as LogoLanternMinimal } from "./LogoLanternMinimal.svelte";
export { default as LogoThreshold } from "./LogoThreshold.svelte";
export { default as LogoClearing } from "./LogoClearing.svelte";

// Forest concepts (v4) - "the grove itself"
export { default as LogoForestLantern } from "./LogoForestLantern.svelte";
export { default as LogoGrove } from "./LogoGrove.svelte";
export { default as LogoThreePines } from "./LogoThreePines.svelte";
export { default as LogoForestFireflies } from "./LogoForestFireflies.svelte";
export { default as LogoForestNight } from "./LogoForestNight.svelte";
export { default as LogoForestHearth } from "./LogoForestHearth.svelte";
export { default as LogoForestPath } from "./LogoForestPath.svelte";
export { default as LogoForestOwl } from "./LogoForestOwl.svelte";
export { default as LogoForestNest } from "./LogoForestNest.svelte";
export { default as LogoForestSwing } from "./LogoForestSwing.svelte";
export { default as LogoForestFairyRing } from "./LogoForestFairyRing.svelte";
export { default as LogoForestBirdhouse } from "./LogoForestBirdhouse.svelte";
export { default as LogoForestSnow } from "./LogoForestSnow.svelte";

// The Garden (v5) - the full experience
export { default as LogoGarden } from "./LogoGarden.svelte";
export { default as LogoGardenMinimal } from "./LogoGardenMinimal.svelte";

// Lucide Compositions (v6) - actual Lucide icon paths as building blocks
// "The grove doesn't need to be drawn. It just needs to be arranged."
export { default as LogoFireflyForest } from "./LogoFireflyForest.svelte";
export { default as LogoGatheringHearth } from "./LogoGatheringHearth.svelte";
export { default as LogoStarlightPines } from "./LogoStarlightPines.svelte";
export { default as LogoShelter } from "./LogoShelter.svelte";
export { default as LogoWinterGrove } from "./LogoWinterGrove.svelte";

// The Mega Forest - panoramic showcase of everything
export { default as LogoMegaForest } from "./LogoMegaForest.svelte";

// The Badge Collection (v7) - compact, glassy wordmarks
// "Tight, warm, home."
export { default as LogoGroveBadge } from "./LogoGroveBadge.svelte";
export { default as LogoGroveCircle } from "./LogoGroveCircle.svelte";

// Seasonal Scenes (v8) - the grove through times and moods
export { default as LogoDawnForest } from "./LogoDawnForest.svelte";
export { default as LogoTwilightGrove } from "./LogoTwilightGrove.svelte";
export { default as LogoStormForest } from "./LogoStormForest.svelte";
export { default as LogoSpringBloom } from "./LogoSpringBloom.svelte";
export { default as LogoHarvestGrove } from "./LogoHarvestGrove.svelte";
export { default as LogoEnchantedForest } from "./LogoEnchantedForest.svelte";

// Autumn Sparkle Collection (v9) - autumn trees with floating sparkles
// "Grounded trees, floating magic"
export { default as LogoAutumnSparkle } from "./LogoAutumnSparkle.svelte";
export { default as LogoFirstFrost } from "./LogoFirstFrost.svelte";
export { default as LogoAutumnMagic } from "./LogoAutumnMagic.svelte";

// The Grove Mark (v10) - the official circular mark
export { default as LogoGroveMark } from "./LogoGroveMark.svelte";

// Re-export Tabler's Linktree icon as a historical artifact 😂
// "The logo that started the journey"
export { IconBrandLinktree as LogoArtifact } from "@tabler/icons-svelte";
