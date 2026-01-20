<script lang="ts">
	/**
	 * PricingToggle
	 *
	 * Monthly/Annual billing toggle with savings badge.
	 * Grove-styled with glassmorphism and smooth transitions.
	 */

	import type { BillingPeriod, PricingToggleProps } from "./types.js";

	let {
		billingPeriod,
		savingsPercent = 15,
		onPeriodChange,
		class: className = "",
	}: PricingToggleProps = $props();

	function handleToggle() {
		onPeriodChange(billingPeriod === "monthly" ? "annual" : "monthly");
	}

	function selectPeriod(period: BillingPeriod) {
		if (period !== billingPeriod) {
			onPeriodChange(period);
		}
	}
</script>

<div
	class="inline-flex items-center gap-3 p-1 bg-white/40 dark:bg-emerald-950/30 backdrop-blur-sm rounded-full border border-white/40 dark:border-emerald-800/30 {className}"
>
	<!-- Monthly option -->
	<button
		type="button"
		onclick={() => selectPeriod("monthly")}
		class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {billingPeriod ===
		'monthly'
			? 'bg-white dark:bg-emerald-800/60 text-foreground shadow-sm'
			: 'text-foreground-muted hover:text-foreground'}"
	>
		Monthly
	</button>

	<!-- Annual option with savings badge -->
	<button
		type="button"
		onclick={() => selectPeriod("annual")}
		class="relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {billingPeriod ===
		'annual'
			? 'bg-white dark:bg-emerald-800/60 text-foreground shadow-sm'
			: 'text-foreground-muted hover:text-foreground'}"
	>
		Annual
		{#if savingsPercent > 0}
			<span
				class="absolute -top-2 -right-2 px-1.5 py-0.5 bg-accent text-white text-xs font-medium rounded-full"
			>
				-{savingsPercent}%
			</span>
		{/if}
	</button>
</div>
