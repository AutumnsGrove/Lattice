/**
 * UI Grafts System
 *
 * Reusable, configurable components that can be "grafted" onto any Grove property.
 * UI Grafts are components; Feature Grafts (flags) control their availability.
 *
 * @example
 * ```typescript
 * import { isGraftEnabled, setGraftContext } from '@autumnsgrove/groveengine/grafts';
 * import { PricingGraft } from '@autumnsgrove/groveengine/grafts/pricing';
 *
 * // Check if graft is enabled
 * const enabled = await isGraftEnabled('pricing', { productId: 'grove' });
 *
 * // Set context for child grafts
 * setGraftContext({ productId: 'grove', tier: 'seedling' });
 * ```
 *
 * @see docs/specs/grafts-spec.md
 */

// Types
export type {
  GraftId,
  ProductId,
  GraftRegistryEntry,
  GraftContext,
  BaseGraftProps,
} from "./types.js";

// Registry & helpers
export {
  GRAFT_REGISTRY,
  getGraftEntry,
  isGraftEnabled,
  getAllGrafts,
  getGraftsByStatus,
} from "./registry.js";

// Svelte context
export {
  setGraftContext,
  getGraftContext,
  requireGraftContext,
} from "./context.svelte.js";
