<script lang="ts">
	import { Check, Clock, Lock, ArrowRight, ArrowLeft, Loader2, Sprout } from '@autumnsgrove/groveengine/ui/icons';
	import { GlassCard, GroveTerm } from '@autumnsgrove/groveengine/ui';
	import { groveModeStore } from '@autumnsgrove/groveengine/ui/stores';

	// Use graft config for tier data and toggle component
	import {
		PricingToggle,
		type PricingTier,
		type BillingPeriod,
		DEFAULT_ANNUAL_SAVINGS,
		billingPeriodToDbFormat,
		getMonthlyEquivalentPrice,
		getYearlySavingsAmount,
	} from '@autumnsgrove/groveengine/grafts/pricing';
	import type { TierStatus, TierKey } from '@autumnsgrove/groveengine/config';

	// UpgradesGraft components for plan selection
	import { GrowthCard } from '@autumnsgrove/groveengine/grafts/upgrades';

	// Shared icon mapping
	import { tierIcons } from '$lib/ui/tier-icons';

	// JSON form submission (grove-router POST proxy fix)
	import { submitFormAndGo } from '$lib/submit-form';

	// Type-safe props
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// Plans from server (transformed via graft config)
	const plans: PricingTier[] = data.tiers;

	// ============================================================================
	// STATE
	// ============================================================================

	let billingPeriod = $state<BillingPeriod>('monthly');
	// Auto-select first available paid tier (skip free so users see it as an explicit choice)
	let selectedPlan = $state<string | null>(
		plans.find((p: PricingTier) => p.status === 'available' && p.key !== 'free')?.key ?? null
	);

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	// Map billing period to database format (annual → yearly)
	let billingCycleForDb = $derived(billingPeriodToDbFormat(billingPeriod));

	// Check if the selected plan is free (Wanderer)
	let isFreePlan = $derived(selectedPlan === 'free');

	// Submit plan selection via JSON API
	async function selectPlanForOnboarding(stage: TierKey) {
		if (isSubmitting) return;
		isSubmitting = true;
		submitError = null;

		// Free plan skips checkout — goes directly to success
		const redirect = stage === 'free' ? '/success' : '/checkout';

		const error = await submitFormAndGo('/api/select-plan', {
			plan: stage,
			billingCycle: stage === 'free' ? 'monthly' : billingCycleForDb,
		});

		if (error) {
			submitError = error;
			isSubmitting = false;
		}
		// On success, the page will navigate via submitFormAndGo
	}

	// ============================================================================
	// STATUS COLOR HELPERS
	// ============================================================================

	/** Color schemes for each tier status */
	const statusColors: Record<TierStatus, {
		text: string;
		bg: string;
		check: string;
		overlay: string;
	}> = {
		available: {
			text: 'text-emerald-600 dark:text-emerald-400',
			bg: 'bg-emerald-100/60 dark:bg-emerald-900/40',
			check: 'text-emerald-500',
			overlay: ''
		},
		coming_soon: {
			text: 'text-amber-600 dark:text-amber-400',
			bg: 'bg-amber-100/60 dark:bg-amber-900/30',
			check: 'text-amber-500',
			overlay: 'bg-amber-500/10 dark:bg-amber-500/5'
		},
		future: {
			text: 'text-foreground-subtle',
			bg: 'bg-bark-100/60 dark:bg-bark-800/40',
			check: 'text-bark-700 dark:text-bark-400',
			overlay: 'bg-bark-500/10 dark:bg-bark-500/10'
		},
		deprecated: {
			text: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-100/60 dark:bg-red-900/40',
			check: 'text-red-400',
			overlay: 'bg-red-500/10 dark:bg-red-500/10'
		}
	};

	function getStatusColor(status: TierStatus, shade: keyof (typeof statusColors)['available']) {
		return statusColors[status][shade];
	}

	// ============================================================================
	// SELECTION HELPERS
	// ============================================================================

	function canSelect(tier: PricingTier): boolean {
		return tier.status === 'available';
	}

	function handleSelectPlan(tier: PricingTier): void {
		if (canSelect(tier)) {
			selectedPlan = tier.key;
		}
	}

	// Get icon name for GrowthCard
	function getIconName(iconKey: string): string {
		const iconMap: Record<string, string> = {
			user: 'sprout',
			footprints: 'footprints',
			sprout: 'sprout',
			'tree-deciduous': 'tree-deciduous',
			trees: 'trees',
			crown: 'crown',
		};
		return iconMap[iconKey] || 'sprout';
	}
</script>

<div class="animate-fade-in space-y-8">
	<!-- Back navigation -->
	<div class="flex items-center gap-2">
		<a
			href="/profile"
			class="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to profile
		</a>
	</div>

	<!-- Header -->
	<header class="text-center space-y-3">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground">
			Choose how you'd like to grow
		</h1>
		<p class="text-foreground-muted max-w-md mx-auto">
			Start writing for free, or pick a plan that grows with you.
		</p>
	</header>

	<!-- Billing toggle (using shared graft component) -->
	<div class="flex justify-center">
		<PricingToggle
			{billingPeriod}
			savingsPercent={DEFAULT_ANNUAL_SAVINGS}
			onPeriodChange={(period) => (billingPeriod = period)}
		/>
	</div>

	<!-- Plans grid - using GrowthCard components -->
	<div class="space-y-4" role="radiogroup" aria-label="Select a plan">
		{#each plans as tier (tier.key)}
			{@const isAvailable = tier.status === 'available'}
			{@const isComingSoon = tier.status === 'coming_soon'}
			{@const isFuture = tier.status === 'future'}
			{@const isSelected = selectedPlan === tier.key}
			{@const displayName = groveModeStore.current ? tier.name : (tier.standardName || tier.name)}
			{@const displayFeatures = groveModeStore.current ? tier.featureStrings : (tier.standardFeatureStrings || tier.featureStrings)}
			{@const monthlyPrice = getMonthlyEquivalentPrice(tier, billingPeriod)}
			{@const yearlyPrice = billingPeriod === 'annual' ? getMonthlyEquivalentPrice(tier, 'annual') : 0}
			{@const savings = billingPeriod === 'annual' ? getYearlySavingsAmount(tier) : 0}

			<div class="relative">
				<!-- Status badge positioned above card for unavailable tiers -->
				{#if isComingSoon}
					<div class="absolute -top-3 left-6 z-20" aria-hidden="true">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-amber-500 text-white shadow-lg shadow-amber-500/25"
						>
							<Clock class="w-3 h-3" />
							Coming Soon
						</span>
					</div>
				{:else if isFuture}
					<div class="absolute -top-3 left-6 z-20" aria-hidden="true">
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
								bg-bark-400 dark:bg-bark-600 text-white shadow-lg"
						>
							<Lock class="w-3 h-3" />
							Future
						</span>
					</div>
				{/if}

				<!-- GrowthCard for plan selection -->
				<GrowthCard
					stage={tier.key as TierKey}
					displayName={displayName}
					tagline={tier.tagline}
					icon={getIconName(tier.icon)}
					isCurrent={false}
					isNext={isSelected}
					available={isAvailable}
					monthlyPrice={tier.key === 'free' ? 0 : Number(monthlyPrice)}
					annualPrice={tier.key === 'free' ? 0 : Number(yearlyPrice)}
					features={displayFeatures}
					variant={isSelected ? 'primary' : 'secondary'}
					onCultivate={() => handleSelectPlan(tier)}
				/>
			</div>
		{/each}
	</div>

	<!-- Fine print -->
	<div class="text-center py-2 space-y-1">
		<p class="text-xs text-foreground-subtle">
			Every plan includes Home, Blog, and About pages. Higher plans add more custom navigation pages.
		</p>
	</div>

	<!-- Selection status and continue -->
	<div class="space-y-4">
		{#if submitError}
			<div class="p-3 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
				{submitError}
			</div>
		{/if}

		{#if selectedPlan}
			{@const selectedTier = plans.find((p) => p.key === selectedPlan)}
			{@const selectedSavings = billingPeriod === 'annual' && selectedTier?.key !== 'free' && selectedTier ? getYearlySavingsAmount(selectedTier) : 0}
			<div class="p-4 rounded-lg bg-grove-100/50 dark:bg-grove-900/30 border border-grove-200 dark:border-grove-800">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-foreground-muted">
							Selected: <span class="font-medium text-foreground">{groveModeStore.current ? selectedTier?.name : (selectedTier?.standardName || selectedTier?.name)}</span>
						</p>
						{#if billingPeriod === 'annual' && selectedTier?.key !== 'free'}
							<p class="text-xs text-accent mt-0.5">
								Save ${selectedSavings}/year with annual billing
							</p>
						{/if}
					</div>
					{#if isSubmitting}
						<Loader2 class="w-5 h-5 animate-spin text-foreground-muted" />
					{:else}
						<Check class="w-5 h-5 text-emerald-500" />
					{/if}
				</div>
			</div>
		{/if}

		<button
			type="button"
			onclick={() => selectedPlan && selectPlanForOnboarding(selectedPlan as TierKey)}
			disabled={!selectedPlan || isSubmitting}
			class="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isSubmitting}
				<Loader2 class="w-5 h-5 animate-spin" />
				Processing...
			{:else if selectedPlan}
				{@const selectedTier = plans.find((p) => p.key === selectedPlan)}
				{#if selectedTier?.key === 'free'}
					Start writing for free
				{:else}
					Continue with {groveModeStore.current ? selectedTier?.name : (selectedTier?.standardName || selectedTier?.name)}
				{/if}
			{:else}
				Select a plan to continue
			{/if}
		</button>
		{#if selectedPlan === 'free'}
			<p class="text-xs text-foreground-subtle text-center">
				No credit card required. Upgrade anytime.
			</p>
		{:else}
			<p class="text-xs text-foreground-subtle text-center">
				Full refund within 14 days. Cancel anytime.
			</p>
		{/if}
	</div>

	<!-- Full comparison link -->
	<div class="text-center pb-4">
		<a
			href="https://grove.place/pricing"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
		>
			View full plan comparison
			<span class="sr-only">(opens in new tab)</span>
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	</div>
</div>
