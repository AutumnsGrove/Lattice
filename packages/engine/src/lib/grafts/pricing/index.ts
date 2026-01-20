/**
 * Pricing Graft
 *
 * Reusable pricing table, cards, and checkout components for any Grove product.
 * Transform tier config into display-ready format and render consistent pricing UI.
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * import { transformAllTiers, getAllCheckoutUrls, createCheckoutConfigFromEnv } from '@autumnsgrove/groveengine/grafts/pricing';
 *
 * export const load = async ({ platform }) => {
 *   const checkoutConfig = createCheckoutConfigFromEnv(platform.env);
 *   const checkoutUrls = getAllCheckoutUrls(checkoutConfig);
 *   const tiers = transformAllTiers({ checkoutUrls, highlightTier: 'seedling' });
 *   return { tiers };
 * };
 * ```
 *
 * ```svelte
 * // In +page.svelte
 * <script>
 *   import { PricingGraft } from '@autumnsgrove/groveengine/grafts/pricing';
 *   let { data } = $props();
 * </script>
 *
 * <PricingGraft
 *   productId="grove"
 *   tiers={data.tiers}
 *   showComparison={true}
 *   showFineprint={true}
 * />
 * ```
 */

// Types
export type {
  BillingPeriod,
  PricingTier,
  PricingTierLimits,
  PricingGraftProps,
  PricingTableProps,
  PricingCardProps,
  PricingToggleProps,
  PricingCTAProps,
  PricingFineprintProps,
  FineprintSection,
} from "./types.js";

// Config & transformation
export {
  DEFAULT_TIER_ORDER,
  DEFAULT_ANNUAL_SAVINGS,
  calculateAnnualSavings,
  transformTier,
  transformAllTiers,
  getDisplayPrice,
  getPriceSuffix,
  formatAnnualAsMonthly,
} from "./config.js";

// Checkout URL generation
export type { CheckoutConfig, CheckoutOptions } from "./checkout.js";
export {
  getCheckoutUrl,
  getAllCheckoutUrls,
  createCheckoutConfigFromEnv,
} from "./checkout.js";

// Components
export { default as PricingGraft } from "./PricingGraft.svelte";
export { default as PricingTable } from "./PricingTable.svelte";
export { default as PricingCard } from "./PricingCard.svelte";
export { default as PricingToggle } from "./PricingToggle.svelte";
export { default as PricingCTA } from "./PricingCTA.svelte";
export { default as PricingFineprint } from "./PricingFineprint.svelte";
