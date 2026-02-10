/**
 * UpgradesGraft: Cultivation & Garden Management
 *
 * Unified module for growth stages, plan upgrades, and billing portal.
 *
 * @example
 * ```typescript
 * import { CurrentStageBadge, GardenStatus } from '@autumnsgrove/groveengine/grafts/upgrades';
 * import type { FlourishState, GrowthStatus } from '@autumnsgrove/groveengine/grafts/upgrades';
 * ```
 */

// Types
export type {
  GrowthStage,
  GrowthStageKey,
  CultivateRequest,
  CultivateResponse,
  TendRequest,
  TendResponse,
  FlourishState,
  GrowthStatus,
  PlantingSession,
  GardenStats,
  UpgradesConfig,
} from "./types";
export { GROWTH_STAGES } from "./types";

// Config
export { createUpgradeConfig, getPlantingUrl, canCultivateTo } from "./config";

// Client Components
export { default as GrowthCard } from "./components/GrowthCard.svelte";
export { default as GardenModal } from "./components/GardenModal.svelte";
export { default as CurrentStageBadge } from "./components/CurrentStageBadge.svelte";
export { default as GardenStatus } from "./components/GardenStatus.svelte";
