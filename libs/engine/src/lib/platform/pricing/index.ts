/**
 * Pricing Graft
 *
 * Reusable pricing table, cards, and checkout components for any Grove product.
 * Transform tier config into display-ready format and render consistent pricing UI.
 *
 * Buy links are not built here. They come from `buildCheckoutUrl()` in
 * `../config/billing.js`, which points at billing-api.
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * import { transformAllTiers } from '@autumnsgrove/lattice/platform/pricing';
 *
 * export function load() {
 *   const tiers = transformAllTiers({ highlightTier: 'seedling' });
 *   return { tiers };
 * }
 * ```
 *
 * ```svelte
 * // In +page.svelte
 * <script>
 *   import { PricingGraft } from '@autumnsgrove/lattice/platform/pricing';
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
	getMonthlyEquivalentPrice,
	getYearlySavingsAmount,
	billingPeriodToDbFormat,
	dbFormatToBillingPeriod,
	type DbBillingCycle,
} from "./config.js";

// Components
export { default as PricingGraft } from "./PricingGraft.svelte";
export { default as PricingTable } from "./PricingTable.svelte";
export { default as PricingCard } from "./PricingCard.svelte";
export { default as PricingToggle } from "./PricingToggle.svelte";
export { default as PricingCTA } from "./PricingCTA.svelte";
export { default as PricingFineprint } from "./PricingFineprint.svelte";
