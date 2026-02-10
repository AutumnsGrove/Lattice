<script lang="ts">
	/**
	 * PricingCard
	 *
	 * Individual tier card with price, features, and CTA.
	 * Glassmorphism styled with Grove aesthetics.
	 */

	import { Sprout, TreeDeciduous, Trees, Crown, User, Footprints, Check } from "lucide-svelte";
	import type { PricingCardProps } from "./types.js";
	import type { TierIcon } from "../../config/tiers.js";
	import PricingCTA from "./PricingCTA.svelte";
	import { groveModeStore } from "../../ui/stores/grove-mode.svelte";

	let {
		tier,
		billingPeriod,
		highlighted = false,
		badge,
		footer,
		onCheckout,
		class: className = "",
	}: PricingCardProps = $props();

	// Map tier icons to components
	const iconComponents: Record<TierIcon, typeof Sprout> = {
		user: User,
		footprints: Footprints,
		sprout: Sprout,
		"tree-deciduous": TreeDeciduous,
		trees: Trees,
		crown: Crown,
	};

	let IconComponent = $derived(iconComponents[tier.icon] || Sprout);

	// Calculate display price
	let displayPrice = $derived(
		tier.monthlyPrice === 0
			? "Free"
			: billingPeriod === "monthly"
				? `$${tier.monthlyPrice}`
				: `$${Math.round(tier.annualPrice)}`,
	);

	let priceSuffix = $derived(
		tier.monthlyPrice === 0
			? ""
			: billingPeriod === "monthly"
				? "/mo"
				: "/yr",
	);

	// Status badge text
	let statusBadge = $derived(
		tier.status === "coming_soon"
			? "Coming Soon"
			: tier.status === "future"
				? "Future"
				: null,
	);

	// Mode-aware display values
	let displayName = $derived(
		groveModeStore.current ? tier.name : (tier.standardName || tier.name)
	);
	let displayFeatures = $derived(
		groveModeStore.current ? tier.featureStrings : (tier.standardFeatureStrings || tier.featureStrings)
	);
</script>

<div
	class="
    relative flex flex-col h-full p-6 rounded-xl
    bg-white/80 dark:bg-grove-950/25 backdrop-blur-md
    border shadow-sm transition-all duration-200
    {highlighted
		? 'border-accent dark:border-accent shadow-accent/20 scale-[1.02]'
		: 'border-white/40 dark:border-grove-800/25 hover:shadow-md'}
    {className}
  "
>
	<!-- Status badge or custom badge -->
	{#if tier.badge || statusBadge}
		<div
			class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white text-xs font-medium rounded-full"
		>
			{tier.badge || statusBadge}
		</div>
	{/if}

	<!-- Custom badge snippet -->
	{#if badge}
		{@render badge(tier)}
	{/if}

	<!-- Header -->
	<div class="text-center mb-6">
		<!-- Icon -->
		<div
			class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-grove-100/50 dark:bg-grove-900/30 mb-3"
		>
			<IconComponent class="w-6 h-6 text-grove-600 dark:text-grove-400" />
		</div>

		<!-- Name & tagline -->
		<h3 class="text-xl font-serif text-foreground">{displayName}</h3>
		{#if !groveModeStore.current && tier.standardName && tier.standardName !== tier.name}
			<p class="text-xs text-foreground-faint italic">({tier.name} Plan)</p>
		{/if}
		<p class="text-sm text-foreground-muted">{tier.tagline}</p>

		<!-- Price -->
		<div class="mt-4">
			<span class="text-3xl font-bold text-foreground">{displayPrice}</span>
			{#if priceSuffix}
				<span class="text-foreground-faint text-sm">{priceSuffix}</span>
			{/if}
		</div>

		{#if billingPeriod === "annual" && tier.annualSavings > 0}
			<p class="text-xs text-accent mt-1">Save {tier.annualSavings}% yearly</p>
		{/if}
	</div>

	<!-- Features list -->
	<ul class="flex-1 space-y-3 mb-6">
		{#each displayFeatures as feature}
			<li class="flex items-start gap-2 text-sm text-foreground-muted">
				<Check class="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
				<span>{feature}</span>
			</li>
		{/each}
	</ul>

	<!-- Best for -->
	<p class="text-center text-xs text-foreground-faint mb-4 italic">
		Best for: {tier.bestFor}
	</p>

	<!-- CTA -->
	<PricingCTA
		{tier}
		{billingPeriod}
		variant={highlighted ? "primary" : "secondary"}
		{onCheckout}
		class="w-full"
	/>

	<!-- Custom footer snippet -->
	{#if footer}
		<div class="mt-4">
			{@render footer(tier)}
		</div>
	{/if}
</div>
