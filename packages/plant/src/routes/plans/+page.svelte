<script lang="ts">
	import { Check, Clock, Lock, ArrowRight, ArrowLeft, Loader2 } from '@autumnsgrove/groveengine/ui/icons';
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
	import type { TierStatus } from '@autumnsgrove/groveengine/config';

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
	// Auto-select first available tier
	let selectedPlan = $state<string | null>(
		plans.find((p: PricingTier) => p.status === 'available')?.key ?? null
	);

	// Submission state
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	// Map billing period to database format (annual → yearly)
	let billingCycleForDb = $derived(billingPeriodToDbFormat(billingPeriod));

	// Submit plan selection via JSON API
	async function savePlan() {
		if (!selectedPlan || isSubmitting) return;
		isSubmitting = true;
		submitError = null;

		const error = await submitFormAndGo('/api/select-plan', {
			plan: selectedPlan,
			billingCycle: billingCycleForDb,
		});

		if (error) submitError = error;
		isSubmitting = false;
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

	function selectPlan(tier: PricingTier): void {
		if (canSelect(tier)) {
			selectedPlan = tier.key;
		}
	}

	function getStatusClasses(tier: PricingTier): string {
		switch (tier.status) {
			case 'available':
				return selectedPlan === tier.key
					? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
					: 'hover:ring-1 hover:ring-primary/30';
			case 'coming_soon':
				return 'opacity-90';
			case 'future':
				return 'opacity-50 grayscale';
			case 'deprecated':
				return 'opacity-40 grayscale line-through';
		}
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
			Every plan includes a 14-day free trial. Your words are always yours.
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

	<!-- Plans grid -->
	<div class="space-y-4" role="radiogroup" aria-label="Select a plan">
		{#each plans as tier (tier.key)}
			{@const TierIcon = tierIcons[tier.icon]}
			{@const isAvailable = tier.status === 'available'}
			{@const isComingSoon = tier.status === 'coming_soon'}
			{@const isFuture = tier.status === 'future'}
			{@const isSelected = selectedPlan === tier.key}
			{@const displayName = groveModeStore.current ? tier.name : (tier.standardName || tier.name)}
			{@const displayFeatures = groveModeStore.current ? tier.featureStrings : (tier.standardFeatureStrings || tier.featureStrings)}

			<div class="relative">
				<!-- Status badge positioned above card -->
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

				<button
					onclick={() => selectPlan(tier)}
					disabled={!isAvailable}
					class="w-full text-left transition-all duration-200 rounded-xl {getStatusClasses(tier)}
						{isAvailable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2' : 'cursor-not-allowed'}"
					type="button"
					role="radio"
					aria-checked={isSelected}
					aria-disabled={!isAvailable}
					aria-label="{displayName} plan, ${getMonthlyEquivalentPrice(tier, billingPeriod)} per month{!isAvailable ? `, ${tier.status === 'coming_soon' ? 'coming soon' : 'not yet available'}` : ''}"
				>
					<GlassCard
						variant={isAvailable ? (isSelected ? 'accent' : 'default') : 'muted'}
						class="relative overflow-hidden {isComingSoon || isFuture ? 'pt-6' : ''}"
					>
						<!-- Subtle overlay for unavailable tiers -->
						{#if !isAvailable}
							<div
								class="absolute inset-0 pointer-events-none {getStatusColor(tier.status, 'overlay')}"
							></div>
						{/if}

						<div class="relative z-10 p-6">
							<!-- Plan header: icon, name, price -->
							<div class="flex items-start justify-between gap-4 mb-4">
								<div class="flex items-start gap-4">
									<!-- Tier icon -->
									<div class="flex-shrink-0 p-3 rounded-xl transition-colors {getStatusColor(tier.status, 'bg')}">
										<TierIcon class="w-6 h-6 {getStatusColor(tier.status, 'text')}" />
									</div>

									<!-- Name and tagline -->
									<div>
										<h3 class="text-lg font-medium text-foreground">{displayName}</h3>
										<p class="text-sm {getStatusColor(tier.status, 'text')}">
											{tier.tagline}
										</p>
									</div>
								</div>

								<!-- Price -->
								<div class="text-right flex-shrink-0">
									<div class="flex items-baseline gap-1">
										<span class="text-2xl font-semibold text-foreground">${getMonthlyEquivalentPrice(tier, billingPeriod)}</span>
										<span class="text-sm text-foreground-muted">/mo</span>
									</div>
									{#if billingPeriod === 'annual'}
										<p class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
											Save ${getYearlySavingsAmount(tier)}/year
										</p>
									{/if}
								</div>
							</div>

							<!-- Best for description -->
							<p class="text-sm text-foreground-muted mb-4">{tier.bestFor}</p>

							<!-- Features grid - responsive: single column on mobile, two on tablet+ -->
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
								{#each displayFeatures as feature}
									<div class="flex items-center gap-2">
										<Check class="w-4 h-4 flex-shrink-0 {getStatusColor(tier.status, 'check')}" />
										<span class="text-sm text-foreground-muted">{feature}</span>
									</div>
								{/each}
							</div>

							<!-- Selection indicator for available plans -->
							{#if isAvailable}
								<div class="mt-4 pt-4 border-t border-white/20 dark:border-bark-700/30">
									<div class="flex items-center justify-between">
										<span class="text-sm text-foreground-muted">
											{isSelected ? 'Selected' : 'Click to select'}
										</span>
										<div
											class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
												{isSelected
												? 'border-emerald-500 bg-emerald-500'
												: 'border-bark-300 dark:border-bark-600'}"
										>
											{#if isSelected}
												<Check class="w-3 h-3 text-white" />
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</GlassCard>
				</button>
			</div>
		{/each}
	</div>

	<!-- Free tier note -->
	<div class="text-center py-2">
		<p class="text-sm text-foreground-subtle">
			A free tier is on its way — we'll share more when it's ready.
		</p>
	</div>

	<!-- Fine print -->
	<div class="text-center py-2 space-y-1">
		<p class="text-xs text-foreground-subtle">
			Every plan includes Home, Blog, and About pages. Higher plans add more custom navigation pages.
		</p>
	</div>

	<!-- Continue button -->
	<div class="space-y-4">
		{#if submitError}
			<div class="p-3 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
				{submitError}
			</div>
		{/if}

		<button
			type="button"
			onclick={savePlan}
			disabled={!selectedPlan || isSubmitting}
			class="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isSubmitting}
				<Loader2 class="w-5 h-5 animate-spin" />
				Processing...
			{:else if selectedPlan}
				{@const selectedTier = plans.find((p) => p.key === selectedPlan)}
				Continue with {groveModeStore.current ? selectedTier?.name : (selectedTier?.standardName || selectedTier?.name)}

			{:else}
				Select a plan to continue
			{/if}
		</button>
		<p class="text-xs text-foreground-subtle text-center">
			You won't be charged until after your 14-day trial. Cancel anytime.
		</p>
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
