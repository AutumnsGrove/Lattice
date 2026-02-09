/**
 * UpgradesGraft: Cultivation & Garden Management
 *
 * Unified module for growth stages, plan upgrades, and billing portal.
 *
 * @example
 * ```typescript
 * import { cultivate, tend, getGrowth } from '@autumnsgrove/groveengine/grafts/upgrades';
 * ```
 */

export * from "./types";
export { createUpgradeConfig, getPlantingUrl, canCultivateTo } from "./config";

// Server API
export {
  cultivate,
  type CultivateRequest,
  type CultivateResponse,
} from "./server/api/cultivate";

export { tend, type TendRequest, type TendResponse } from "./server/api/tend";

export { getGrowth, type GrowthStatus } from "./server/api/growth";

// Client Components
export * from "./components/index.js";
