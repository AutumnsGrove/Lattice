<script lang="ts">
	/**
	 * PricingGraft
	 *
	 * Main orchestrator component for the pricing graft.
	 * Combines toggle, table/cards, and fineprint into a cohesive pricing page.
	 *
	 * @example
	 * ```svelte
	 * <PricingGraft
	 *   productId="grove"
	 *   tiers={data.tiers}
	 *   showComparison={true}
	 *   showFineprint={true}
	 * >
	 *   {#snippet header()}
	 *     <h1>Find Your Perfect Grove</h1>
	 *   {/snippet}
	 * </PricingGraft>
	 * ```
	 */

	import type { PricingGraftProps, BillingPeriod } from "./types.js";
	import PricingToggle from "./PricingToggle.svelte";
	import PricingTable from "./PricingTable.svelte";
	import PricingCard from "./PricingCard.svelte";
	import PricingFineprint from "./PricingFineprint.svelte";

	let {
		productId,
		tiers,
		defaultPeriod = "monthly",
		showComparison = true,
		showFineprint = true,
		showToggle = true,
		showCards = false,
		header,
		tierBadge,
		tierFooter,
		afterTable,
		footer,
		onCheckout,
		onPeriodChange,
		class: className = "",
	}: PricingGraftProps = $props();

	// Internal state for billing period
	let billingPeriod = $state<BillingPeriod>(defaultPeriod);

	function handlePeriodChange(period: BillingPeriod) {
		billingPeriod = period;
		onPeriodChange?.(period);
	}

	// Calculate max savings for the toggle badge
	let maxSavings = $derived(Math.max(...tiers.map((t) => t.annualSavings)));
</script>

<div class="pricing-graft {className}">
	<!-- Header slot -->
	{#if header}
		<header class="mb-8 text-center">
			{@render header()}
		</header>
	{/if}

	<!-- Billing toggle -->
	{#if showToggle}
		<div class="flex justify-center mb-8">
			<PricingToggle
				{billingPeriod}
				savingsPercent={maxSavings}
				onPeriodChange={handlePeriodChange}
			/>
		</div>
	{/if}

	<!-- Pricing cards (optional, shown when showCards is true) -->
	{#if showCards}
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8"
		>
			{#each tiers as tier}
				<PricingCard
					{tier}
					{billingPeriod}
					highlighted={tier.highlight}
					badge={tierBadge}
					footer={tierFooter}
					{onCheckout}
				/>
			{/each}
		</div>
	{/if}

	<!-- Comparison table -->
	{#if showComparison}
		<PricingTable {tiers} {billingPeriod} {onCheckout} class="mb-8" />
	{/if}

	<!-- After table slot -->
	{#if afterTable}
		<div class="mb-8">
			{@render afterTable()}
		</div>
	{/if}

	<!-- Fine print -->
	{#if showFineprint}
		<PricingFineprint class="mb-8" />
	{/if}

	<!-- Footer slot -->
	{#if footer}
		<footer class="mt-8">
			{@render footer()}
		</footer>
	{/if}
</div>
